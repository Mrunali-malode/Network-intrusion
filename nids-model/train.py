"""
Reproducible training pipeline for the network-intrusion detection model.

What it does
------------
1. Downloads the canonical NSL-KDD train/test splits (cached under data/).
2. Maps the 40+ raw attack labels to the 5 canonical classes
   (Normal / DoS / Probe / R2L / U2R).
3. Builds a scikit-learn Pipeline: one-hot encode categoricals + RandomForest.
4. Trains on KDDTrain+, evaluates on the official KDDTest+ split.
5. Saves the fitted pipeline and a metrics report under artifacts/.

Run:  python train.py         (uv run python train.py)

The saved artifacts/model.joblib is a self-contained Pipeline: pass it a
DataFrame with the 41 NSL-KDD feature columns and it handles preprocessing
internally. handle_unknown="ignore" means categories the live sensor emits that
were unseen in training degrade gracefully instead of crashing.
"""

import json
import sys
import time
import urllib.request
from pathlib import Path

import joblib
import numpy as np
import pandas as pd
from sklearn.compose import ColumnTransformer
from sklearn.ensemble import RandomForestClassifier
from sklearn.metrics import (
    accuracy_score,
    classification_report,
    confusion_matrix,
    f1_score,
)
from sklearn.pipeline import Pipeline
from sklearn.preprocessing import OneHotEncoder

from nsl_kdd import (
    ALL_COLUMNS,
    CATEGORICAL_COLUMNS,
    CLASS_ORDER,
    FEATURE_COLUMNS,
    NUMERIC_COLUMNS,
    label_to_category,
)

HERE = Path(__file__).parent
DATA_DIR = HERE / "data"
ARTIFACTS_DIR = HERE / "artifacts"

# Stable raw mirrors of the NSL-KDD files (HoaNP is a long-lived backup mirror
# of the original UNB CIC dataset). Multiple sources are tried in order.
# Minimum plausible file sizes (bytes). A stalled/partial download that lands
# below this is rejected rather than cached, so a flaky connection can't poison
# later runs. Full files are ~18.6 MB (train) and ~3.4 MB (test).
MIN_SIZE = {"KDDTrain+.txt": 5_000_000, "KDDTest+.txt": 1_000_000}

DATA_SOURCES = {
    "KDDTrain+.txt": [
        "https://raw.githubusercontent.com/HoaNP/NSL-KDD-DataSet/master/KDDTrain+.txt",
        "https://raw.githubusercontent.com/jmnwong/NSL-KDD-Dataset/master/KDDTrain+.txt",
        "https://raw.githubusercontent.com/mlaraibb/NSL-KDD-DATASET/main/KDDTrain+.txt",
    ],
    "KDDTest+.txt": [
        "https://raw.githubusercontent.com/HoaNP/NSL-KDD-DataSet/master/KDDTest+.txt",
        "https://raw.githubusercontent.com/jmnwong/NSL-KDD-Dataset/master/KDDTest+.txt",
        "https://raw.githubusercontent.com/mlaraibb/NSL-KDD-DATASET/main/KDDTest+.txt",
    ],
}


def download(filename: str) -> Path:
    """Download a dataset file if not already cached (validated, atomic)."""
    DATA_DIR.mkdir(parents=True, exist_ok=True)
    dest = DATA_DIR / filename
    min_size = MIN_SIZE.get(filename, 1)

    if dest.exists() and dest.stat().st_size >= min_size:
        print(f"[data] cached: {dest.name} ({dest.stat().st_size:,} bytes)")
        return dest
    if dest.exists():
        print(f"[data] discarding truncated cache: {dest.name} "
              f"({dest.stat().st_size:,} < {min_size:,} bytes)")
        dest.unlink()

    last_err = None
    for url in DATA_SOURCES[filename]:
        tmp = dest.with_suffix(dest.suffix + ".part")
        try:
            print(f"[data] downloading {filename} from {url}")
            req = urllib.request.Request(url, headers={"User-Agent": "nids-train"})
            with urllib.request.urlopen(req, timeout=300) as resp:
                data = resp.read()
            if len(data) < min_size:
                raise ValueError(f"file too small ({len(data):,} < {min_size:,} bytes)")
            tmp.write_bytes(data)
            tmp.replace(dest)  # atomic: only a complete file appears at dest
            print(f"[data] saved {dest.name} ({dest.stat().st_size:,} bytes)")
            return dest
        except Exception as e:  # noqa: BLE001 - try next mirror
            print(f"[data] failed ({e}); trying next mirror...")
            tmp.unlink(missing_ok=True)
            last_err = e
    raise RuntimeError(
        f"Could not download {filename}: {last_err}. "
        f"You can manually place it in {DATA_DIR}/ and re-run."
    )


def load_split(filename: str) -> pd.DataFrame:
    path = download(filename)
    df = pd.read_csv(path, header=None, names=ALL_COLUMNS)
    df["category"] = df["label"].map(label_to_category)
    return df


def build_pipeline() -> Pipeline:
    preprocessor = ColumnTransformer(
        transformers=[
            (
                "cat",
                OneHotEncoder(handle_unknown="ignore", sparse_output=True),
                CATEGORICAL_COLUMNS,
            ),
            ("num", "passthrough", NUMERIC_COLUMNS),
        ]
    )
    clf = RandomForestClassifier(
        n_estimators=200,
        max_depth=None,
        n_jobs=-1,
        class_weight="balanced_subsample",  # helps the rare R2L/U2R classes
        random_state=42,
    )
    return Pipeline([("prep", preprocessor), ("clf", clf)])


def load_custom() -> pd.DataFrame:
    """Load the human-labeled custom attack dataset (active-learning), if any."""
    path = DATA_DIR / "custom_labeled.csv"
    if not path.exists():
        return pd.DataFrame(columns=FEATURE_COLUMNS + ["category"])
    df = pd.read_csv(path)
    df = df.rename(columns={"label": "category"})
    for c in FEATURE_COLUMNS:
        if c not in df.columns:
            df[c] = 0
    return df[FEATURE_COLUMNS + ["category"]]


def main() -> int:
    t0 = time.time()
    with_custom = "--with-custom" in sys.argv
    print("=== NSL-KDD NIDS training ===")

    # Snapshot the previous metrics so the dashboard can show before/after.
    prev = ARTIFACTS_DIR / "metrics.json"
    if prev.exists():
        (ARTIFACTS_DIR / "metrics_prev.json").write_text(prev.read_text())

    train_df = load_split("KDDTrain+.txt")
    test_df = load_split("KDDTest+.txt")

    if with_custom:
        custom = load_custom()
        if len(custom):
            from sklearn.model_selection import train_test_split
            strat = custom["category"] if custom["category"].value_counts().min() >= 2 else None
            c_train, c_test = train_test_split(custom, test_size=0.3, random_state=42, stratify=strat)
            train_df = pd.concat([train_df, c_train], ignore_index=True)
            test_df = pd.concat([test_df, c_test], ignore_index=True)
            print(f"[data] merged custom dataset: {len(custom)} rows, "
                  f"classes={sorted(custom['category'].unique())}")

    print(f"[data] train rows: {len(train_df):,}  test rows: {len(test_df):,}")
    print("[data] train class balance:")
    print(train_df["category"].value_counts().to_string())

    X_train = train_df[FEATURE_COLUMNS]
    y_train = train_df["category"]
    X_test = test_df[FEATURE_COLUMNS]
    y_test = test_df["category"]

    pipeline = build_pipeline()
    print("[train] fitting RandomForest pipeline...")
    pipeline.fit(X_train, y_train)

    print("[eval] scoring on test split...")
    y_pred = pipeline.predict(X_test)
    acc = accuracy_score(y_test, y_pred)
    macro_f1 = f1_score(y_test, y_pred, average="macro")
    present = set(y_test) | set(y_pred)
    # Canonical classes first, then any custom classes, in a stable order.
    labels = [c for c in CLASS_ORDER if c in present] + sorted(present - set(CLASS_ORDER))
    report = classification_report(
        y_test, y_pred, labels=labels, zero_division=0, output_dict=True
    )
    cm = confusion_matrix(y_test, y_pred, labels=labels)

    print(f"[eval] test accuracy : {acc:.4f}")
    print(f"[eval] test macro-F1 : {macro_f1:.4f}")
    print(classification_report(y_test, y_pred, labels=labels, zero_division=0))

    ARTIFACTS_DIR.mkdir(parents=True, exist_ok=True)
    model_path = ARTIFACTS_DIR / "model.joblib"
    joblib.dump(pipeline, model_path)

    metrics = {
        "dataset": "NSL-KDD (KDDTrain+ / KDDTest+)",
        "model": "RandomForestClassifier(n_estimators=200, class_weight=balanced_subsample)",
        "classes": labels,
        "test_accuracy": round(float(acc), 4),
        "test_macro_f1": round(float(macro_f1), 4),
        "per_class": {
            k: v for k, v in report.items()
            if k in labels or k in ("macro avg", "weighted avg")
        },
        "confusion_matrix": {"labels": labels, "matrix": cm.tolist()},
        "train_rows": int(len(train_df)),
        "test_rows": int(len(test_df)),
        "sklearn_version": __import__("sklearn").__version__,
        "trained_at": time.strftime("%Y-%m-%dT%H:%M:%S"),
    }
    (ARTIFACTS_DIR / "metrics.json").write_text(json.dumps(metrics, indent=2))
    (ARTIFACTS_DIR / "classes.json").write_text(json.dumps(labels, indent=2))

    # Feature importances (top 15) for the model card.
    try:
        ohe = pipeline.named_steps["prep"].named_transformers_["cat"]
        cat_names = list(ohe.get_feature_names_out(CATEGORICAL_COLUMNS))
        feat_names = cat_names + NUMERIC_COLUMNS
        importances = pipeline.named_steps["clf"].feature_importances_
        top = sorted(zip(feat_names, importances), key=lambda x: -x[1])[:15]
        (ARTIFACTS_DIR / "feature_importances.json").write_text(
            json.dumps([{"feature": f, "importance": round(float(i), 5)} for f, i in top], indent=2)
        )
    except Exception as e:  # noqa: BLE001
        print(f"[warn] could not export feature importances: {e}")

    print(f"[done] saved model -> {model_path}")
    print(f"[done] saved metrics -> {ARTIFACTS_DIR / 'metrics.json'}")
    print(f"[done] elapsed {time.time() - t0:.1f}s")
    return 0


if __name__ == "__main__":
    sys.exit(main())
