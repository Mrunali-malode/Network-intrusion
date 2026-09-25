# Point everything at the CAPTURE PROXY (not the site directly). The proxy
# forwards to the netflix-clone and is the traffic sensor feeding the model.
TARGET_URL = "http://localhost:8080"

REQUEST_TIMEOUT = 3

# Normal browsing pacing.
NORMAL_MIN_DELAY = 0.5
NORMAL_MAX_DELAY = 2.0

# DoS flood intensity.
FLOOD_WORKERS = 60
FLOOD_REQUESTS_PER_BATCH = 120

# Probe / recon pacing.
RECON_WORKERS = 12

# Legitimate-looking source IPs (spoofed via X-Forwarded-For).
NORMAL_IPS = [
    "198.51.100.14", "198.51.100.22", "203.0.113.88",
    "192.168.1.105", "172.16.0.42", "72.14.192.1",
]

# Attacker source IPs (Tor exit / botnet ranges) - spoofed via X-Forwarded-For.
ATTACKER_IPS = [
    "185.220.101.5", "185.220.101.44", "185.220.102.78",
    "45.83.223.12", "45.83.223.99", "103.21.244.15",
    "103.21.244.201", "194.26.29.11",
]
