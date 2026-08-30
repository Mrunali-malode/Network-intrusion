import random
import time
import requests

from config import TARGET_URL, REQUEST_TIMEOUT

START_RATE = 2
MAX_RATE = 30
RESET_AFTER_MAX = True

rate = START_RATE

ATTACK_IPS = [
    "45.83.223.12", "45.83.223.99", "185.220.101.44",
    "103.21.244.201", "194.26.29.11"
]

PATHS = [
    "/browse", "/movies", "/api/v1/user/settings?debug=true",
    "/admin/login", "/api/internal/config"
]

print(f"Starting gradual traffic drift simulation against {TARGET_URL}")

while True:
    print(f"Current rate: {rate} req/sec")

    start_time = time.time()

    for _ in range(rate):
        try:
            ip = random.choice(ATTACK_IPS)
            path = random.choice(PATHS)
            headers = {"X-Forwarded-For": ip}
            url = f"{TARGET_URL.rstrip('/')}{path}"
            requests.get(url, headers=headers, timeout=REQUEST_TIMEOUT)
        except Exception as e:
            print(f"Request failed: {e}")

    elapsed = time.time() - start_time

    if elapsed < 1:
        time.sleep(1 - elapsed)

    rate += 1

    if rate > MAX_RATE:
        if RESET_AFTER_MAX:
            print(f"Reached {MAX_RATE} req/sec. Resetting to {START_RATE}.")
            rate = START_RATE
        else:
            rate = MAX_RATE