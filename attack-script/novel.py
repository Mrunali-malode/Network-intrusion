"""
Novel / unknown attack.

Sends an unusual traffic pattern the model was never trained on: large-body
POST/PUT requests to a rotating set of odd endpoints, at a moderate rate. This
shifts the traffic distribution (drift rises) but does NOT match any known-attack
signature and does not look confidently like DoS/Probe/R2L/U2R -> the backend
flags these as novel and collects them into an 'Attack-N' bucket for you to label.

Signature -> model class: (none) -> collected as NOVEL / Unknown
"""

import random
import string
import time

import requests

from config import REQUEST_TIMEOUT, TARGET_URL

# "New" source range, distinct from the known attacker pool.
NOVEL_IPS = ["91.109.5.12", "91.109.5.44", "77.91.102.7", "77.91.102.31"]

# Odd endpoints that are NOT in the auth / RCE / sensitive vocab (so they don't
# trip the R2L/U2R signatures) and vary enough to shift path distribution.
NOVEL_PATHS = [
    "/api/graphql/introspection", "/ws/stream/subscribe", "/api/v3/telemetry",
    "/beacon/collect", "/rpc/invoke", "/sync/delta", "/ingest/batch",
    "/api/v3/metrics/push", "/edge/relay", "/pipeline/emit",
]


def _blob(n: int) -> str:
    return "".join(random.choices(string.ascii_letters + string.digits, k=n))


def run():
    print(f"[novel] sending unusual (unknown-pattern) traffic to {TARGET_URL}")
    sent = 0
    while True:
        try:
            headers = {
                "X-Forwarded-For": random.choice(NOVEL_IPS),
                "User-Agent": "CustomAgent/9.9 (unknown)",
                "Content-Type": "application/json",
            }
            path = random.choice(NOVEL_PATHS)
            method = random.choice(["POST", "PUT", "PATCH"])
            # Large, oddly-sized bodies -> shifts the content-length distribution.
            body = _blob(random.randint(2000, 8000))
            requests.request(
                method, f"{TARGET_URL}{path}", data=body, headers=headers,
                timeout=REQUEST_TIMEOUT,
            )
            sent += 1
            if sent % 10 == 0:
                print(f"[novel] {sent} unusual requests sent")
        except Exception:
            pass
        time.sleep(random.uniform(0.1, 0.25))  # ~5-8/s: enough to drift, below DoS


if __name__ == "__main__":
    run()
