import random
import time
import requests

from config import (
    TARGET_URL,
    REQUEST_TIMEOUT,
    NORMAL_MIN_DELAY,
    NORMAL_MAX_DELAY,
)

FAKE_IPS = [
    "198.51.100.14", "198.51.100.22", "203.0.113.88",
    "192.168.1.105", "172.16.0.42", "72.14.192.1"
]

PATHS = ["/", "/browse", "/movies", "/latest", "/my-list"]

print(f"Starting normal traffic simulation with fake IPs against {TARGET_URL}")

while True:
    try:
        ip = random.choice(FAKE_IPS)
        path = random.choice(PATHS)
        headers = {"X-Forwarded-For": ip}
        url = f"{TARGET_URL.rstrip('/')}{path}"
        requests.get(url, headers=headers, timeout=REQUEST_TIMEOUT)
        print(f"[NORMAL] Request sent to {path} from IP={ip}")
    except Exception as e:
        print(f"Request failed: {e}")

    time.sleep(
        random.uniform(
            NORMAL_MIN_DELAY,
            NORMAL_MAX_DELAY,
        )
    )