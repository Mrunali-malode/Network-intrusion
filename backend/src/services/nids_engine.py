"""
NIDS inference engine (backend side).

Loads the pretrained NSL-KDD RandomForest pipeline (trained by ../nids-model)
and classifies incoming connection feature records into one of:
    Normal / DoS / Probe / R2L / U2R

The model artifact is a self-contained sklearn Pipeline (one-hot + RF). We keep
a local copy of the feature-column order and class metadata so the backend does
not need to import the sibling nids-model project (source of truth for these
lists is nids-model/nsl_kdd.py).
"""

from __future__ import annotations

import os
import time
from collections import Counter, deque
from pathlib import Path
from typing import Any, Deque, Dict, List, Optional

import pandas as pd

# --- NSL-KDD schema (mirror of nids-model/nsl_kdd.py) ---
FEATURE_COLUMNS = [
    "duration", "protocol_type", "service", "flag", "src_bytes", "dst_bytes",
    "land", "wrong_fragment", "urgent", "hot", "num_failed_logins", "logged_in",
    "num_compromised", "root_shell", "su_attempted", "num_root",
    "num_file_creations", "num_shells", "num_access_files", "num_outbound_cmds",
    "is_host_login", "is_guest_login", "count", "srv_count", "serror_rate",
    "srv_serror_rate", "rerror_rate", "srv_rerror_rate", "same_srv_rate",
    "diff_srv_rate", "srv_diff_host_rate", "dst_host_count", "dst_host_srv_count",
    "dst_host_same_srv_rate", "dst_host_diff_srv_rate",
    "dst_host_same_src_port_rate", "dst_host_srv_diff_host_rate",
    "dst_host_serror_rate", "dst_host_srv_serror_rate", "dst_host_rerror_rate",
    "dst_host_srv_rerror_rate",
]
CATEGORICAL_COLUMNS = ["protocol_type", "service", "flag"]
CLASS_ORDER = ["Normal", "DoS", "Probe", "R2L", "U2R"]
CLASS_DESCRIPTIONS = {
    "Normal": "Legitimate traffic - no intrusion signature.",
    "DoS": "Denial of Service - flooding / resource exhaustion.",
    "Probe": "Reconnaissance - scanning, enumeration, fingerprinting.",
    "R2L": "Remote-to-Local - unauthorized remote access (credential / auth abuse).",
    "U2R": "User-to-Root - privilege escalation / remote code execution.",
}

_DEFAULTS: Dict[str, Any] = {c: 0 for c in FEATURE_COLUMNS}
_DEFAULTS.update({"protocol_type": "tcp", "service": "http", "flag": "SF"})

_model = None
_model_load_error: Optional[str] = None


def _model_path() -> Path:
    env = os.environ.get("NIDS_MODEL_PATH")
    if env:
        return Path(env)
    # backend/src/services/ -> repo root -> nids-model/artifacts/model.joblib
    root = Path(__file__).resolve().parents[3]
    return root / "nids-model" / "artifacts" / "model.joblib"


def load_model():
    global _model, _model_load_error
    if _model is not None:
        return _model
    try:
        import joblib  # imported lazily so backend still boots without it
        path = _model_path()
        if not path.exists():
            _model_load_error = f"model artifact not found at {path} (run nids-model/train.py)"
            return None
        _model = joblib.load(path)
        _model_load_error = None
        print(f"[NIDS] loaded model from {path}")
    except Exception as e:  # noqa: BLE001
        _model_load_error = f"failed to load model: {e}"
        print(f"[NIDS] {_model_load_error}")
    return _model


def reload_model():
    """Force the next classify() to reload the model artifact from disk
    (used after a retrain)."""
    global _model, _model_load_error
    _model = None
    _model_load_error = None
    return load_model()


def model_status() -> Dict[str, Any]:
    m = load_model()
    return {
        "loaded": m is not None,
        "path": str(_model_path()),
        "error": _model_load_error,
        "classes": CLASS_ORDER,
    }


# Volumetric-DoS signature: sustained request rate to the same service within
# the sensor's 2s window. The ML model keys on DoS *shape* (errors/zero-bytes);
# this complements it by catching high-rate floods the origin absorbs cleanly.
DOS_COUNT_THRESHOLD = 20

# Novelty thresholds: the model is "unsure" if its top class probability is below
# CONF_THRESHOLD, or the margin between the top two classes is below MARGIN.
CONF_THRESHOLD = 0.70
MARGIN_THRESHOLD = 0.20


def _ml_classify(features: Dict[str, Any]) -> Dict[str, Any]:
    """Pure model prediction (the primary engine)."""
    m = load_model()
    if m is None:
        return {
            "label": "Unknown",
            "confidence": 0.0,
            "probabilities": {},
            "description": "Model not loaded - train nids-model first.",
            "model_loaded": False,
        }

    row = dict(_DEFAULTS)
    for k, v in features.items():
        if k in row and v is not None:
            row[k] = v

    X = pd.DataFrame([[row[c] for c in FEATURE_COLUMNS]], columns=FEATURE_COLUMNS)
    for c in CATEGORICAL_COLUMNS:
        X[c] = X[c].astype(str)

    classes = list(m.classes_)
    if hasattr(m, "predict_proba"):
        proba = m.predict_proba(X)[0]
        probs = {cls: round(float(p), 4) for cls, p in zip(classes, proba)}
        top = int(proba.argmax())
        label = str(classes[top])
        confidence = round(float(proba[top]), 4)
    else:
        label = str(m.predict(X)[0])
        probs = {label: 1.0}
        confidence = 1.0

    return {
        "label": label,
        "confidence": confidence,
        "probabilities": probs,
        "description": CLASS_DESCRIPTIONS.get(label, ""),
        "model_loaded": True,
    }


def _signature_scan(features: Dict[str, Any]) -> Optional[Dict[str, Any]]:
    """
    Transparent signature tier for classes the NSL-KDD model cannot reliably
    detect (R2L/U2R have ~1% recall due to tiny/novel training samples) plus a
    rate-based DoS backstop. Keyed on the same sensor features. Every match is
    attributed to source="signature" in the final verdict so it is never
    confused with an ML prediction.
    """
    root_shell = int(features.get("root_shell", 0) or 0)
    num_shells = int(features.get("num_shells", 0) or 0)
    num_root = int(features.get("num_root", 0) or 0)
    hot = int(features.get("hot", 0) or 0)
    failed = int(features.get("num_failed_logins", 0) or 0)
    count = int(features.get("count", 0) or 0)
    same_srv = float(features.get("same_srv_rate", 0.0) or 0.0)

    # U2R: RCE / traversal / sensitive-file execution indicators.
    if root_shell or num_shells or num_root:
        strength = min(0.98, 0.70 + 0.08 * (root_shell + num_shells + num_root))
        return {
            "label": "U2R",
            "confidence": round(strength, 2),
            "reason": f"RCE/traversal indicators (root_shell={root_shell}, num_root={num_root}, hot={hot})",
        }
    # R2L: failed authentication against a protected endpoint.
    if failed >= 1:
        return {
            "label": "R2L",
            "confidence": 0.85,
            "reason": f"failed auth on protected endpoint (num_failed_logins={failed})",
        }
    # Volumetric DoS backstop: sustained high rate to one service.
    if count >= DOS_COUNT_THRESHOLD and same_srv >= 0.5:
        return {
            "label": "DoS",
            "confidence": round(min(0.95, 0.60 + count / 1000.0), 2),
            "reason": f"volumetric flood (count={count}/2s, same_srv_rate={same_srv})",
        }
    return None


def classify(features: Dict[str, Any]) -> Dict[str, Any]:
    """
    Two-tier verdict: ML model (primary) + signature tier (fallback for the
    classes the model cannot cover). The model owns positive DoS/Probe calls;
    signatures only promote when the model returns Normal/Unknown. The result is
    fully attributed via `source` and `signature`.
    """
    ml = _ml_classify(features)
    sig = _signature_scan(features)

    result = dict(ml)
    result["source"] = "model"
    result["model_label"] = ml["label"]
    result["model_confidence"] = ml["confidence"]
    result["signature"] = {"matched": bool(sig)}

    if sig:
        result["signature"] = {"matched": True, **sig}
        # Only promote when the model did not already flag a positive attack.
        if ml["label"] in ("Normal", "Unknown"):
            result["label"] = sig["label"]
            result["confidence"] = sig["confidence"]
            result["source"] = "signature"
            result["description"] = CLASS_DESCRIPTIONS.get(sig["label"], "")

    # Novelty: the model is unsure (low top-prob or classes competing) and no
    # signature rescued it -> candidate for a possibly-new attack type.
    probs = ml.get("probabilities") or {}
    ordered = sorted(probs.values(), reverse=True) if probs else [1.0]
    p1 = ordered[0]
    p2 = ordered[1] if len(ordered) > 1 else 0.0
    model_unsure = ml.get("model_loaded") and (p1 < CONF_THRESHOLD or (p1 - p2) < MARGIN_THRESHOLD)
    result["uncertain"] = bool(model_unsure)
    # `novel` is decided drift-aware in the ingest route (needs drift context);
    # default False here.
    result["novel"] = False

    return result


# --- rolling threat summary for the dashboard ---
_recent: Deque[Dict[str, Any]] = deque(maxlen=500)


def record_detection(detection: Dict[str, Any], meta: Dict[str, Any]) -> None:
    _recent.append({
        "ts": time.time(),
        "label": detection.get("label", "Unknown"),
        "confidence": detection.get("confidence", 0.0),
        "src_ip": meta.get("src_ip", ""),
        "path": meta.get("path", ""),
    })


def threat_summary() -> Dict[str, Any]:
    items = list(_recent)
    total = len(items)
    class_counts = Counter(i["label"] for i in items)
    attack_items = [i for i in items if i["label"] not in ("Normal", "Unknown")]
    attack_count = len(attack_items)

    # Dominant active attack class (excluding Normal) in the recent window.
    dominant = None
    if attack_items:
        dominant = Counter(i["label"] for i in attack_items).most_common(1)[0][0]

    top_ips = Counter(i["src_ip"] for i in attack_items).most_common(5)

    return {
        "window_size": total,
        "attack_count": attack_count,
        "attack_ratio": round(attack_count / total, 3) if total else 0.0,
        "dominant_attack": dominant,
        "class_counts": {c: class_counts.get(c, 0) for c in CLASS_ORDER},
        "top_attacker_ips": [{"ip": ip, "count": n} for ip, n in top_ips],
    }


def features_from_event(event) -> Dict[str, Any]:
    """
    Best-effort feature record from a simulator TrafficEvent (used so the
    dashboard 'simulate' buttons also exercise the model). The proxy sensor is
    the authoritative feature source for real traffic.
    """
    path = (event.path or "").lower()
    is_attack_path = any(k in path for k in ["admin", "env", "debug", "bypass", "exec", "cmd", "phpmyadmin", "config", "cgi-bin", "passwd"])
    is_auth = any(k in path for k in ["login", "auth", "bypass", "session"])
    rce = 1 if any(k in path for k in ["exec", "cmd", "cgi-bin", "passwd", "shell", "../"]) else 0

    return {
        "protocol_type": "tcp",
        "service": "http",
        "flag": "REJ" if is_attack_path else "SF",
        "src_bytes": int(getattr(event, "content_length", 0) or 0),
        "dst_bytes": 0,
        "duration": 0.0,
        "hot": 2 if is_attack_path else 0,
        "num_failed_logins": 1 if is_auth else 0,
        "root_shell": rce,
        "num_shells": rce,
        "num_root": rce,
        "num_access_files": 1 if is_attack_path else 0,
        "count": 1,
        "srv_count": 1,
        "rerror_rate": 1.0 if is_attack_path else 0.0,
        "diff_srv_rate": 0.8 if is_attack_path else 0.0,
        "same_srv_rate": 0.2 if is_attack_path else 1.0,
        "dst_host_count": 1,
        "dst_host_srv_count": 1,
        "dst_host_rerror_rate": 1.0 if is_attack_path else 0.0,
        "dst_host_diff_srv_rate": 0.8 if is_attack_path else 0.0,
    }
