import asyncio
from typing import Any, Dict, Optional
from urllib.parse import urlparse, parse_qs

from fastapi import APIRouter
from pydantic import BaseModel

from src.models.traffic import TrafficEvent
from src.storage.memory import traffic_events, baseline_events
from src.websocket.manager import manager
from src.services.drift_engine import get_cached_drift
from src.services import nids_engine
from src.services import learning_engine

router = APIRouter()


class IngestPayload(BaseModel):
    features: Dict[str, Any]
    meta: Dict[str, Any] = {}


def _build_event(features: Dict[str, Any], meta: Dict[str, Any]) -> TrafficEvent:
    """Construct a TrafficEvent (for the drift engine) from the sensor record."""
    import time

    raw_path = str(meta.get("path", "/"))
    parsed = urlparse(raw_path)
    path = parsed.path or "/"
    query_string = parsed.query
    query_param_count = len(parse_qs(query_string)) if query_string else 0
    path_depth = len([p for p in path.split("/") if p])

    return TrafficEvent(
        timestamp=float(meta.get("timestamp", time.time() * 1000.0)),
        path=path,
        full_url=f"http://localhost:8080{raw_path}",
        method=str(meta.get("method", "GET")),
        ip=str(meta.get("src_ip", "127.0.0.1")),
        user_agent=str(meta.get("user_agent", "")),
        referer="",
        host="localhost:8080",
        origin="",
        content_length=int(features.get("src_bytes", 0) or 0),
        content_type="",
        accept="",
        accept_language="",
        accept_encoding="",
        cache_control="",
        connection="",
        query_string=query_string,
        query_param_count=query_param_count,
        path_depth=path_depth,
        protocol="http",
        sec_fetch_site="",
        sec_fetch_mode="",
        sec_fetch_dest="",
    )


def _process(features: Dict[str, Any], meta: Dict[str, Any]) -> Dict[str, Any]:
    """CPU-bound work (model inference + drift). Runs in a threadpool so it does
    not block the event loop under high ingest rates."""
    detection = nids_engine.classify(features)
    drift_data = get_cached_drift()

    # Novelty = drift is happening AND the model didn't confidently land a known
    # attack (it's unsure, or defaulted to Normal) AND no signature caught it.
    novel = (
        detection.get("source") == "model"
        and not detection.get("signature", {}).get("matched")
        and drift_data.get("status") != "NORMAL"
        and (detection.get("uncertain") or detection.get("label") == "Normal")
    )
    detection["novel"] = bool(novel)

    nids_engine.record_detection(detection, meta)
    if novel:
        learning_engine.add_candidate(features, meta, detection)

    event = _build_event(features, meta)
    traffic_events.append(event)

    return {
        "type": "traffic",
        "timestamp": event.timestamp,
        "path": event.path,
        "method": event.method,
        "ip": event.ip,
        "content_length": event.content_length,
        "path_depth": event.path_depth,
        "user_agent": event.user_agent,
        "status": meta.get("status"),
        "detection": detection,
        "threat_summary": nids_engine.threat_summary(),
        "drift": drift_data,
    }


@router.post("/ingest")
async def ingest(payload: IngestPayload):
    """
    Receives an NSL-KDD feature record from the capture proxy, classifies the
    attack class with the pretrained model, and broadcasts detection + drift.
    """
    loop = asyncio.get_event_loop()
    message = await loop.run_in_executor(None, _process, payload.features, payload.meta)
    await manager.broadcast(message)
    return {"status": "received", "detection": message["detection"]}


@router.get("/detection/status")
async def detection_status():
    """Model load state + rolling threat summary."""
    return {
        "model": nids_engine.model_status(),
        "threat_summary": nids_engine.threat_summary(),
    }
