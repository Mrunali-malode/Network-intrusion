# Network Intrusion Detection — Live Demo

A single-machine demonstration of real-time **network intrusion detection**. An
attack script hits a Netflix-clone demo site through a **capture proxy** that
turns every request into an NSL-KDD feature vector; a pretrained **RandomForest
model** classifies each connection into `Normal / DoS / Probe / R2L / U2R`; and a
live **dashboard** streams the verdicts over WebSockets.

## Architecture

```
 attack-script ──HTTP──▶  capture-proxy (:8080) ──forwards──▶  netflix-clone (:3000)
 (normal + 4 attacks)          │  extracts NSL-KDD 41-feature record per request
                               ▼
                        backend FastAPI (:8000)  POST /ingest
                               |  Two-tier detector:
                               |   1. RandomForest (NSL-KDD)  -> Normal / DoS / Probe
                               |   2. signature layer         -> R2L / U2R / volumetric DoS
                               |  -> {attack class, confidence, source, probs} + drift
                               v  WebSocket /ws
                        dashboard (:3001)  — NIDS Attack Classification + drift
```

**What changed from the old design:** detection is no longer a hardcoded
`ATTACK_IPS` list + drift heuristic inside a Next.js `middleware.ts`. Capture
now happens in a standalone reverse proxy (real NIDS sensor placement), and the
verdict comes from a two-tier detector: a supervised RandomForest (NSL-KDD) as
the primary engine, plus a clearly-attributed signature layer for the classes
the model cannot cover. Every verdict carries a `source` of `model` or
`signature`. Concept-drift remains as a secondary signal.

### Why two tiers (measured, not assumed)

The NSL-KDD model scores **73.8% test accuracy** with **DoS F1 0.85 / Probe F1
0.70**, but **R2L/U2R recall ~1%** — NSL-KDD ships only 995 R2L and 52 U2R
training rows, so the model genuinely cannot learn them (see
`nids-model/artifacts/metrics.json`). The signature layer covers R2L (failed
auth), U2R (RCE/traversal tokens) and volumetric DoS the origin absorbs cleanly.
The dashboard labels each verdict `ML MODEL` or `SIGNATURE` so the two are never
conflated.

## Components

| Dir              | What it is                                              | Port |
|------------------|--------------------------------------------------------|------|
| `nids-model/`    | Reproducible NSL-KDD training + inference (the model)   | —    |
| `capture-proxy/` | Reverse-proxy traffic sensor (replaces the middleware)  | 8080 |
| `backend/`       | FastAPI: `/ingest`, model inference, drift, WebSocket   | 8000 |
| `dashboard/`     | Next.js live SOC dashboard                              | 3001 |
| `demo-site/`     | Netflix-clone target site                              | 3000 |
| `attack-script/` | Multi-class attack simulator                            | —    |

## Quick start (single machine)

Run each in its own terminal.

**1. Train the model (once)**
```bash
cd nids-model && uv sync && uv run python train.py
```

**2. Backend**
```bash
cd backend && uv sync && uv run uvicorn src.main:app --port 8000
```

**3. Demo site** (production build so the proxy forwards clean HTTP)
```bash
cd demo-site/netflix-clone && npm install && npm run build && npm start   # :3000
```

**4. Capture proxy**
```bash
cd capture-proxy && uv sync && uv run python proxy.py                      # :8080
```

**5. Dashboard**
```bash
cd dashboard && npm install && npm run dev -- -p 3001                      # :3001
```

**6. Generate traffic** — browse http://localhost:8080, then:
```bash
cd attack-script && uv sync && uv run python main.py demo
```

Open **http://localhost:3001/monitoring** and watch the *NIDS Attack
Classification* panel switch class as each attack phase runs.

## Verifying it works

- `GET http://localhost:8000/detection/status` — model load state + rolling
  threat summary.
- `nids-model/artifacts/metrics.json` — real test accuracy / confusion matrix.
- The dashboard **Traffic Explorer** shows the per-request model verdict.

## Honesty note

The model is trained and evaluated on genuine NSL-KDD data. Because NSL-KDD is
flow-based and the live sensor is application-layer HTTP, some features are
derived from HTTP attack indicators — see
[`nids-model/README.md`](nids-model/README.md) and
[`capture-proxy/feature_extractor.py`](capture-proxy/feature_extractor.py).
DoS and Probe are handled by the ML model; R2L/U2R (and floods the origin
absorbs) are handled by the transparent signature tier in
[`backend/src/services/nids_engine.py`](backend/src/services/nids_engine.py),
always attributed as `source: "signature"` so nothing masquerades as an ML
prediction.
