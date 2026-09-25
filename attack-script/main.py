"""
Attack orchestrator.

Usage:
    python main.py <mode>

Modes:
    normal      Legitimate browsing            -> Normal
    recon       Endpoint scanning / probing    -> Probe
    flood       DoS/DDoS flood                 -> DoS
    credential  Auth brute force / stuffing    -> R2L
    exploit     RCE / traversal / LFI          -> U2R
    novel       Unknown pattern                -> collected as NOVEL (label it!)
    demo        Scripted sequence cycling through all phases (great for a live
                walkthrough - watch the dashboard's Threat Classification change)

All traffic is sent through the capture proxy (see config.TARGET_URL).
Everything runs locally against your own demo site.
"""

import sys
import threading
import time

import normal
import recon
import flood
import credential
import exploit
import novel

MODES = {
    "normal": normal.run,
    "recon": recon.run,
    "flood": flood.run,
    "credential": credential.run,
    "exploit": exploit.run,
    "novel": novel.run,
}

# Scripted demo: (label, module.run, seconds). Normal traffic runs underneath
# the whole time in a background thread for realistic mixed traffic.
DEMO_SEQUENCE = [
    ("Baseline normal traffic", normal.run, 15),
    ("PROBE  - reconnaissance scan", recon.run, 20),
    ("DoS    - flood attack", flood.run, 20),
    ("R2L    - credential brute force", credential.run, 20),
    ("U2R    - exploitation / RCE", exploit.run, 20),
]


def _run_for(label: str, fn, seconds: int):
    print("\n" + "=" * 60)
    print(f"  PHASE: {label}  ({seconds}s)")
    print("=" * 60)
    t = threading.Thread(target=fn, daemon=True)
    t.start()
    time.sleep(seconds)


def run_demo():
    print("Starting scripted attack demo. Watch the dashboard.")
    # Continuous normal traffic underneath the attack phases.
    threading.Thread(target=normal.run, daemon=True).start()
    for label, fn, secs in DEMO_SEQUENCE:
        _run_for(label, fn, secs)
    print("\nDemo sequence complete. Attack threads continue until you Ctrl+C.")
    while True:
        time.sleep(1)


def main():
    if len(sys.argv) < 2 or sys.argv[1] not in (*MODES, "demo"):
        print(__doc__)
        sys.exit(1)
    mode = sys.argv[1]
    try:
        if mode == "demo":
            run_demo()
        else:
            MODES[mode]()
    except KeyboardInterrupt:
        print("\nStopped.")


if __name__ == "__main__":
    main()
