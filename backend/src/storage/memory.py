from collections import deque
from typing import List, Dict, Any, Optional

# In-memory storage for real-time telemetry events
traffic_events: deque = deque(maxlen=10000)

# Baseline window (first N normal requests or reference benchmark window)
baseline_events: deque = deque(maxlen=500)

# System status & active simulation state
simulation_state: Dict[str, Any] = {
    "active": False,
    "mode": "idle",
    "requests_sent": 0,
    "target_ip": None,
}