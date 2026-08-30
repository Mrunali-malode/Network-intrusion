from fastapi import APIRouter
from src.models.traffic import TrafficEvent
from src.storage.memory import traffic_events, baseline_events
from src.websocket.manager import manager
from src.services.drift_engine import calculate_drift_metrics

router = APIRouter()


@router.post("/traffic")
async def receive_traffic(event: TrafficEvent):
    # If baseline is empty or filling initial window (< 100 items), add clean requests to baseline
    if len(baseline_events) < 100:
        # Avoid putting high-depth attack paths into clean baseline
        if event.path_depth <= 3 and "admin" not in event.path and "env" not in event.path:
            baseline_events.append(event)

    traffic_events.append(event)

    print(
        f"[TRAFFIC] {event.method:<6} {event.path:<25} IP={event.ip:<15} UA={event.user_agent[:30]}"
    )

    # Compute updated drift stats
    drift_data = calculate_drift_metrics()

    # Broadcast event payload and drift status over WebSocket
    await manager.broadcast({
        "type": "traffic",
        "timestamp": event.timestamp,
        "path": event.path,
        "method": event.method,
        "ip": event.ip,
        "content_length": event.content_length,
        "path_depth": event.path_depth,
        "user_agent": event.user_agent,
        "drift": drift_data,
    })

    return {"status": "received"}


@router.get("/events")
async def recent_events(limit: int = 50):
    """Returns latest N traffic events."""
    events_list = list(traffic_events)
    return events_list[-limit:]