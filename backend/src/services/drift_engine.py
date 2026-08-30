import math
import numpy as np
from typing import List, Dict, Any
from collections import Counter

from src.storage.memory import traffic_events, baseline_events

# Try importing scipy functions; fallback to numpy-based implementations if needed
try:
    from scipy.stats import ks_2samp, wasserstein_distance
    SCIPY_AVAILABLE = True
except ImportError:
    SCIPY_AVAILABLE = False


def calculate_psi(baseline_cats: List[str], current_cats: List[str], top_k: int = 10) -> float:
    """
    Calculates Population Stability Index (PSI) for categorical distributions (e.g. URI Paths).
    PSI = sum((Actual% - Expected%) * ln(Actual% / Expected%))
    """
    if not baseline_cats or not current_cats:
        return 0.0

    # Get all unique categories across both sets
    all_cats = list(set(baseline_cats + current_cats))[:top_k]
    if not all_cats:
        return 0.0

    b_counter = Counter(baseline_cats)
    c_counter = Counter(current_cats)

    b_total = len(baseline_cats)
    c_total = len(current_cats)

    psi_val = 0.0
    eps = 1e-4  # Smoothing epsilon to prevent division by zero

    for cat in all_cats:
        expected_pct = (b_counter.get(cat, 0) + eps) / (b_total + eps * len(all_cats))
        actual_pct = (c_counter.get(cat, 0) + eps) / (c_total + eps * len(all_cats))
        
        psi_val += (actual_pct - expected_pct) * math.log(actual_pct / expected_pct)

    return round(float(psi_val), 4)


def numpy_ks_2samp(data1: np.ndarray, data2: np.ndarray):
    """Fallback 2-sample Kolmogorov-Smirnov test using Numpy ECDF."""
    if len(data1) == 0 or len(data2) == 0:
        return 0.0, 1.0
    
    n1, n2 = len(data1), len(data2)
    data1_sorted, data2_sorted = np.sort(data1), np.sort(data2)
    all_vals = np.concatenate([data1_sorted, data2_sorted])
    
    cdf1 = np.searchsorted(data1_sorted, all_vals, side='right') / n1
    cdf2 = np.searchsorted(data2_sorted, all_vals, side='right') / n2
    
    d_stat = float(np.max(np.abs(cdf1 - cdf2)))
    
    # Approximate asymptotic p-value
    en = math.sqrt(n1 * n2 / (n1 + n2))
    lambda_val = (en + 0.12 + 0.11 / en) * d_stat
    p_val = 2.0 * math.exp(-2.0 * lambda_val ** 2)
    p_val = min(1.0, max(0.0, float(p_val)))
    
    return d_stat, p_val


def calculate_drift_metrics() -> Dict[str, Any]:
    """
    Computes statistical concept drift across multiple techniques:
    1. KS-Test (Kolmogorov-Smirnov Test)
    2. Population Stability Index (PSI)
    3. Wasserstein Distance
    4. Z-Score Anomaly Shift
    """
    events_list = list(traffic_events)
    baseline_list = list(baseline_events)

    # Fallback to splitting traffic events if explicit baseline is small
    if len(baseline_list) < 20 and len(events_list) >= 40:
        split_idx = min(100, len(events_list) // 2)
        baseline_sample = events_list[:split_idx]
        current_sample = events_list[split_idx:]
    else:
        baseline_sample = baseline_list if len(baseline_list) >= 10 else events_list[:50]
        current_sample = events_list[-50:] if len(events_list) >= 10 else events_list

    if not baseline_sample or not current_sample:
        return {
            "status": "NORMAL",
            "drift_detected": False,
            "overall_drift_score": 0.0,
            "techniques": {
                "ks_test": {"statistic": 0.0, "p_value": 1.0, "drift": False},
                "psi": {"score": 0.0, "status": "STABLE", "drift": False},
                "wasserstein": {"distance": 0.0, "drift": False},
                "z_score": {"score": 0.0, "drift": False},
            },
            "features": [],
            "sample_counts": {"baseline": len(baseline_sample), "current": len(current_sample)},
        }

    # Extract numerical feature arrays
    b_depths = np.array([e.path_depth for e in baseline_sample], dtype=float)
    c_depths = np.array([e.path_depth for e in current_sample], dtype=float)

    b_content = np.array([e.content_length for e in baseline_sample], dtype=float)
    c_content = np.array([e.content_length for e in current_sample], dtype=float)

    b_params = np.array([e.query_param_count for e in baseline_sample], dtype=float)
    c_params = np.array([e.query_param_count for e in current_sample], dtype=float)

    # 1. KS-Test on Path Depths & Content Length
    if SCIPY_AVAILABLE and len(b_depths) > 1 and len(c_depths) > 1:
        ks_stat_depth, p_val_depth = ks_2samp(b_depths, c_depths)
        ks_stat_content, p_val_content = ks_2samp(b_content, c_content)
    else:
        ks_stat_depth, p_val_depth = numpy_ks_2samp(b_depths, c_depths)
        ks_stat_content, p_val_content = numpy_ks_2samp(b_content, c_content)

    min_p_value = min(float(p_val_depth), float(p_val_content))
    ks_drift = min_p_value < 0.05

    # 2. PSI on Path distribution & Method distribution
    b_paths = [e.path for e in baseline_sample]
    c_paths = [e.path for e in current_sample]
    psi_paths = calculate_psi(b_paths, c_paths)

    b_methods = [e.method for e in baseline_sample]
    c_methods = [e.method for e in current_sample]
    psi_methods = calculate_psi(b_methods, c_methods)

    overall_psi = max(psi_paths, psi_methods)
    psi_status = "STABLE" if overall_psi < 0.1 else ("MODERATE SHIFT" if overall_psi < 0.25 else "SEVERE DRIFT")
    psi_drift = overall_psi >= 0.25

    # 3. Wasserstein Distance on Path Depths & Payload Content Length
    if SCIPY_AVAILABLE and len(b_depths) > 0 and len(c_depths) > 0:
        w_depth = float(wasserstein_distance(b_depths, c_depths))
        w_content = float(wasserstein_distance(b_content, c_content))
    else:
        w_depth = float(np.abs(np.mean(b_depths) - np.mean(c_depths))) if len(b_depths) and len(c_depths) else 0.0
        w_content = float(np.abs(np.mean(b_content) - np.mean(c_content))) if len(b_content) and len(c_content) else 0.0

    wasserstein_score = round((w_depth * 1.5) + (w_content / 500.0), 4)
    wasserstein_drift = wasserstein_score > 0.8

    # 4. Z-Score Anomaly Shift on Request Rate / Density
    # Calculate timestamps rate variance
    if len(current_sample) >= 5:
        times = [e.timestamp for e in current_sample]
        duration = max(1.0, (max(times) - min(times)) / 1000.0 if max(times) > 1e11 else (max(times) - min(times)))
        current_rps = len(current_sample) / max(0.1, duration)
    else:
        current_rps = len(current_sample)

    b_mean_depth = np.mean(b_depths) if len(b_depths) > 0 else 1.0
    b_std_depth = np.std(b_depths) if len(b_depths) > 0 and np.std(b_depths) > 0 else 0.5
    c_mean_depth = np.mean(c_depths) if len(c_depths) > 0 else 1.0

    z_score = abs(c_mean_depth - b_mean_depth) / (b_std_depth + 1e-4)
    z_score = round(float(z_score), 3)
    z_drift = z_score > 2.5 or current_rps > 20

    # Composite Drift Score (0 - 100%)
    drift_score_raw = 0.0
    if ks_drift:
        drift_score_raw += 30.0
    drift_score_raw += min(35.0, overall_psi * 100.0)
    drift_score_raw += min(20.0, wasserstein_score * 15.0)
    if z_drift:
        drift_score_raw += 25.0

    overall_drift_score = min(100.0, round(drift_score_raw, 1))

    if overall_drift_score > 55.0 or (ks_drift and psi_drift):
        status = "CRITICAL"
        overall_drift = True
    elif overall_drift_score > 25.0 or psi_drift or z_drift:
        status = "WARNING"
        overall_drift = True
    else:
        status = "NORMAL"
        overall_drift = False

    return {
        "status": status,
        "drift_detected": overall_drift,
        "overall_drift_score": overall_drift_score,
        "techniques": {
            "ks_test": {
                "name": "Kolmogorov-Smirnov Test",
                "statistic": round(float(ks_stat_depth), 4),
                "p_value": round(min_p_value, 5),
                "drift": ks_drift,
                "description": "2-sample distribution goodness-of-fit test",
            },
            "psi": {
                "name": "Population Stability Index",
                "score": overall_psi,
                "status": psi_status,
                "drift": psi_drift,
                "description": "Quantifies shift in URI path and method frequencies",
            },
            "wasserstein": {
                "name": "Wasserstein Distance (EMD)",
                "distance": wasserstein_score,
                "drift": wasserstein_drift,
                "description": "Earth Mover's Distance for feature space geometry",
            },
            "z_score": {
                "name": "Z-Score Anomaly",
                "score": z_score,
                "drift": z_drift,
                "description": "Standard deviation shift relative to baseline mean",
            },
        },
        "features": [
            {
                "name": "Path Depth",
                "baseline_avg": round(float(np.mean(b_depths)), 2) if len(b_depths) else 0,
                "current_avg": round(float(np.mean(c_depths)), 2) if len(c_depths) else 0,
                "drift": abs(float(np.mean(c_depths) - np.mean(b_depths))) > 0.8 if len(b_depths) and len(c_depths) else False,
            },
            {
                "name": "Content Length",
                "baseline_avg": round(float(np.mean(b_content)), 1) if len(b_content) else 0,
                "current_avg": round(float(np.mean(c_content)), 1) if len(c_content) else 0,
                "drift": abs(float(np.mean(c_content) - np.mean(b_content))) > 200 if len(b_content) and len(c_content) else False,
            },
            {
                "name": "Query Param Count",
                "baseline_avg": round(float(np.mean(b_params)), 2) if len(b_params) else 0,
                "current_avg": round(float(np.mean(c_params)), 2) if len(c_params) else 0,
                "drift": abs(float(np.mean(c_params) - np.mean(b_params))) > 0.5 if len(b_params) and len(c_params) else False,
            },
        ],
        "sample_counts": {
            "baseline": len(baseline_sample),
            "current": len(current_sample),
        },
    }
