"""
Active-learning engine: capture novel/uncertain events, let a human name them,
synthesize similar samples, and retrain the model to learn the new class.

Flow:
  1. add_candidate()  - ingest route feeds uncertain events here (bucket "Attack-N")
  2. label_bucket()   - user names the bucket -> synthesize samples -> append to
                        nids-model/data/custom_labeled.csv, clear bucket
  3. start_retrain()  - retrains the model (NSL-KDD + custom_labeled.csv) in the
                        background; hot-reloads the model on success
  4. status()         - everything the dashboard needs (pending, classes, metrics,
                        retrain state)
"""

from __future__ import annotations

import csv
import json
import subprocess
import sys
import threading
import time
from collections import Counter
from pathlib import Path
from typing import Any, Dict, List, Optional

import numpy as np

from src.services import nids_engine
from src.services.nids_engine import FEATURE_COLUMNS, CATEGORICAL_COLUMNS

_ROOT = Path(__file__).resolve().parents[3]
_NIDS_DIR = _ROOT / "nids-model"
_DATA_DIR = _NIDS_DIR / "data"
_ARTIFACTS = _NIDS_DIR / "artifacts"
_CUSTOM_CSV = _DATA_DIR / "custom_labeled.csv"

# Rate features are bounded to [0, 1]; the rest are non-negative counts.
_RATE_COLS = {c for c in FEATURE_COLUMNS if c.endswith("_rate")}
_NUMERIC_COLS = [c for c in FEATURE_COLUMNS if c not in CATEGORICAL_COLUMNS]

# How many synthetic rows to synthesize per labeling action (spread across the
# captured candidates).
SYNTH_TARGET = 250

_lock = threading.Lock()
_pending: List[Dict[str, Any]] = []
_bucket_id = 1
_retrain: Dict[str, Any] = {"state": "idle", "message": "", "started": None, "finished": None}


# --------------------------------------------------------------------------- #
# candidate capture
# --------------------------------------------------------------------------- #
def current_bucket_name() -> str:
    return f"Attack-{_bucket_id}"


def add_candidate(features: Dict[str, Any], meta: Dict[str, Any], detection: Dict[str, Any]) -> None:
    """Store an uncertain/novel event in the pending bucket."""
    with _lock:
        _pending.append({
            "ts": time.time(),
            "features": {k: features.get(k) for k in FEATURE_COLUMNS},
            "src_ip": meta.get("src_ip", ""),
            "path": meta.get("path", ""),
            "model_label": detection.get("model_label", detection.get("label")),
            "confidence": detection.get("confidence", 0.0),
        })
        # Keep the pending bucket bounded.
        if len(_pending) > 2000:
            del _pending[:-2000]


def pending_summary(limit: int = 8) -> Dict[str, Any]:
    with _lock:
        recent = _pending[-limit:][::-1]
        return {
            "bucket_name": current_bucket_name(),
            "pending_count": len(_pending),
            "samples": [
                {
                    "src_ip": c["src_ip"],
                    "path": c["path"],
                    "model_guess": c["model_label"],
                    "confidence": c["confidence"],
                }
                for c in recent
            ],
        }


# --------------------------------------------------------------------------- #
# synthetic generation + labeling
# --------------------------------------------------------------------------- #
def _synthesize(candidates: List[Dict[str, Any]], target: int) -> List[Dict[str, Any]]:
    """Gaussian-jitter synthetic rows around the captured candidate vectors."""
    if not candidates:
        return []
    rng = np.random.default_rng(42)
    feats = [c["features"] for c in candidates]

    # Per-numeric-column std across candidates (fallback to a small fraction of
    # the value so a single candidate still produces variation).
    arr = {col: np.array([float(f.get(col) or 0.0) for f in feats]) for col in _NUMERIC_COLS}
    stds = {col: (float(arr[col].std()) if len(arr[col]) > 1 else 0.0) for col in _NUMERIC_COLS}

    rows: List[Dict[str, Any]] = []
    per = max(1, target // len(feats))
    for f in feats:
        for _ in range(per):
            row: Dict[str, Any] = {}
            for col in CATEGORICAL_COLUMNS:
                row[col] = f.get(col) or ("tcp" if col == "protocol_type" else "http" if col == "service" else "SF")
            for col in _NUMERIC_COLS:
                base = float(f.get(col) or 0.0)
                sigma = stds[col] if stds[col] > 0 else abs(base) * 0.1
                val = base + rng.normal(0.0, sigma)
                if col in _RATE_COLS:
                    val = min(1.0, max(0.0, val))
                else:
                    val = max(0.0, val)
                    if abs(val - round(val)) < 0.5 and base == round(base):
                        val = float(round(val))
                row[col] = round(val, 4)
            rows.append(row)
    return rows


def label_bucket(name: str) -> Dict[str, Any]:
    """Name the pending bucket, synthesize samples, append to the custom dataset."""
    global _bucket_id
    name = (name or "").strip() or current_bucket_name()
    with _lock:
        candidates = list(_pending)
        if not candidates:
            return {"status": "empty", "message": "No pending novel events to label."}

        synth = _synthesize(candidates, SYNTH_TARGET)

        _DATA_DIR.mkdir(parents=True, exist_ok=True)
        write_header = not _CUSTOM_CSV.exists()
        with _CUSTOM_CSV.open("a", newline="") as fh:
            writer = csv.writer(fh)
            if write_header:
                writer.writerow(FEATURE_COLUMNS + ["label"])
            for row in synth:
                writer.writerow([row.get(c, 0) for c in FEATURE_COLUMNS] + [name])

        _pending.clear()
        _bucket_id += 1

    return {
        "status": "labeled",
        "label": name,
        "synthetic_rows": len(synth),
        "custom_classes": custom_class_counts(),
    }


def custom_class_counts() -> Dict[str, int]:
    """Class -> row count in the custom labeled dataset."""
    if not _CUSTOM_CSV.exists():
        return {}
    counts: Counter = Counter()
    try:
        with _CUSTOM_CSV.open(newline="") as fh:
            reader = csv.DictReader(fh)
            for r in reader:
                counts[r["label"]] += 1
    except Exception:  # noqa: BLE001
        return {}
    return dict(counts)


# --------------------------------------------------------------------------- #
# metrics / model card
# --------------------------------------------------------------------------- #
def _read_json(path: Path) -> Optional[Dict[str, Any]]:
    try:
        return json.loads(path.read_text())
    except Exception:  # noqa: BLE001
        return None


def metrics() -> Dict[str, Any]:
    return {
        "current": _read_json(_ARTIFACTS / "metrics.json"),
        "previous": _read_json(_ARTIFACTS / "metrics_prev.json"),
    }


# --------------------------------------------------------------------------- #
# retrain
# --------------------------------------------------------------------------- #
def _retrain_worker() -> None:
    global _retrain
    try:
        proc = subprocess.run(
            [sys.executable, "train.py", "--with-custom"],
            cwd=str(_NIDS_DIR),
            capture_output=True,
            text=True,
            timeout=1800,
        )
        if proc.returncode == 0:
            nids_engine.reload_model()
            _retrain.update({
                "state": "done",
                "message": "Retrain complete; model reloaded.",
                "finished": time.time(),
                "tail": (proc.stdout or "").strip().splitlines()[-8:],
            })
        else:
            _retrain.update({
                "state": "error",
                "message": f"train.py exited {proc.returncode}",
                "finished": time.time(),
                "tail": (proc.stderr or proc.stdout or "").strip().splitlines()[-8:],
            })
    except Exception as e:  # noqa: BLE001
        _retrain.update({"state": "error", "message": str(e), "finished": time.time()})


def start_retrain() -> Dict[str, Any]:
    with _lock:
        if _retrain["state"] == "running":
            return {"status": "already_running", "retrain": dict(_retrain)}
        _retrain.update({"state": "running", "message": "Retraining…", "started": time.time(), "finished": None})
    threading.Thread(target=_retrain_worker, daemon=True).start()
    return {"status": "started", "retrain": dict(_retrain)}


def status() -> Dict[str, Any]:
    return {
        "pending": pending_summary(),
        "custom_classes": custom_class_counts(),
        "retrain": dict(_retrain),
        "metrics": metrics(),
        "model": nids_engine.model_status(),
    }
