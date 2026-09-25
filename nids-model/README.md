# NIDS Model — NSL-KDD Network Intrusion Detection

A reproducible, supervised network-intrusion detection model that classifies
each connection into one of five canonical classes:

| Class    | Meaning                                                        |
|----------|---------------------------------------------------------------|
| `Normal` | Legitimate traffic                                            |
| `DoS`    | Denial of Service — flooding / resource exhaustion           |
| `Probe`  | Reconnaissance — scanning, enumeration, fingerprinting       |
| `R2L`    | Remote-to-Local — unauthorized remote access (auth abuse)    |
| `U2R`    | User-to-Root — privilege escalation / remote code execution  |

## Model lineage (why this is "valid")

- **Dataset:** [NSL-KDD](https://www.unb.ca/cic/datasets/nsl.html) — the
  de-duplicated successor to KDD Cup 99 from the Canadian Institute for
  Cybersecurity (UNB). It is the canonical academic benchmark for NIDS.
- **Schema:** the standard 41 connection features + the DoS/Probe/R2L/U2R
  taxonomy used across the literature and reference repos such as
  [100divyadg/netdefender](https://github.com/100divyadg/netdefender) and
  [thinline72/nsl-kdd](https://github.com/thinline72/nsl-kdd).
- **Model:** `RandomForestClassifier` (200 trees, `class_weight=balanced_subsample`)
  inside a scikit-learn `Pipeline` that one-hot-encodes the categorical columns.
- **Evaluation:** trained on `KDDTrain+`, scored on the official `KDDTest+`
  split. Real accuracy / macro-F1 / confusion matrix are written to
  `artifacts/metrics.json`. (NSL-KDD's held-out test set contains novel attack
  types, so a realistic RF lands around ~0.75–0.78 accuracy — this is expected
  and honest, not a bug.)

## Why train instead of downloading a `.pkl`

Pretrained scikit-learn pickles are version-locked and carry a specific
preprocessing chain; loading a stranger's `.pkl` across sklearn versions is the
#1 replicability failure. Here you build the **same canonical model** locally
against your own pinned environment, so it is guaranteed reproducible.

## Run

```bash
cd nids-model
uv sync            # or: pip install -e .
uv run python train.py
```

Outputs in `artifacts/`:
- `model.joblib` — the fitted Pipeline (this is what the backend loads)
- `metrics.json` — accuracy, macro-F1, per-class report, confusion matrix
- `classes.json`, `feature_importances.json`

Quick inference check:
```bash
uv run python predict.py
```

## Honest note on the live feature mapping

NSL-KDD was built from packet/flow captures. When this model runs **live**, the
[capture-proxy](../capture-proxy) is an application-layer HTTP sensor, so it can
observe some NSL-KDD features exactly (byte counts, duration, and the
time/host-window statistics that encode DoS and Probe) but must **derive** the
content-based ones (`root_shell`, `num_failed_logins`, `hot`, …) from HTTP
attack indicators (sensitive-path access, failed auth, RCE tokens in the URL).

The model itself is trained and evaluated on genuine NSL-KDD data — the
approximation lives only in the live sensor, and it is documented in
[`capture-proxy/feature_extractor.py`](../capture-proxy/feature_extractor.py).
DoS and Probe map cleanly through the window features. R2L (995 rows) and U2R
(52 rows) are too rare in NSL-KDD for the model to learn (~1% test recall), so
in the live system they are handled by a transparent **signature tier** in
[`backend/src/services/nids_engine.py`](../backend/src/services/nids_engine.py),
which keys on the same sensor features and is always attributed as
`source: "signature"`.
