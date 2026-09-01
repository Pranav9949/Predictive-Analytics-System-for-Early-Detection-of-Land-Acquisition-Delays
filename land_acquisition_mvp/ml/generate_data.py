"""
generate_data.py - Dynamic Synthetic Data Generator
=====================================================
Produces TWO datasets:
  1. land_data.csv       - 5000 historical rows (completed projects)
  2. ongoing_projects.csv - 100 in-progress projects (no actual outcome yet)
"""

import os
import numpy as np
import pandas as pd

SEED = 42
NUM_HISTORICAL = 5000
NUM_ONGOING = 100
BASE_DIR = os.path.dirname(os.path.abspath(__file__))
HISTORICAL_FILE = os.path.join(BASE_DIR, "land_data.csv")
ONGOING_FILE = os.path.join(BASE_DIR, "ongoing_projects.csv")

DISTRICTS = ["Mumbai", "Pune", "Nagpur", "Nashik", "Aurangabad"]
PROJECT_TYPES = ["Highway", "Railway", "Metro", "Irrigation"]

DISTRICT_DELAY_MAP = {
    "Mumbai": 150, "Pune": 90, "Nagpur": 120,
    "Nashik": 70, "Aurangabad": 110,
}

np.random.seed(SEED)


def _generate_rows(n, start_id=1, is_ongoing=False):
    """Generate n rows of synthetic land acquisition data."""
    project_id = np.arange(start_id, start_id + n)
    district = np.random.choice(DISTRICTS, size=n)
    project_type = np.random.choice(PROJECT_TYPES, size=n)

    total_acres = np.round(np.random.uniform(50, 1000, n), 1)
    land_acquired_pct = np.round(np.random.uniform(10, 100, n), 1)
    approval_days_pending = np.random.randint(0, 121, n)
    compensation_disbursed_pct = np.round(np.random.uniform(10, 100, n), 1)
    legal_cases_count = np.random.randint(0, 13, n)
    ownership_disputes = np.random.randint(0, 16, n)
    rnp_progress_pct = np.round(np.random.uniform(10, 100, n), 1)
    possession_pct = np.round(np.random.uniform(10, 100, n), 1)
    affected_families = np.random.randint(10, 801, n)
    doc_deficiency_score = np.round(np.random.uniform(0, 1, n), 3)

    historical_district_delay_avg = np.array(
        [DISTRICT_DELAY_MAP[d] + np.random.normal(0, 10) for d in district]
    )
    historical_district_delay_avg = np.clip(
        np.round(historical_district_delay_avg, 1), 30, 200
    )

    # -- Delay label (rule-based with noise) --
    delay_prob = np.zeros(n, dtype=float)
    mask_comp_legal = (compensation_disbursed_pct < 50) & (legal_cases_count > 2)
    delay_prob[mask_comp_legal] += 0.35
    delay_prob += doc_deficiency_score * 0.15
    delay_prob += np.clip((100 - rnp_progress_pct) / 100, 0, 1) * 0.15
    delay_prob += np.clip(approval_days_pending / 120, 0, 1) * 0.10
    delay_prob += np.clip((100 - possession_pct) / 100, 0, 1) * 0.10
    delay_prob += np.clip(ownership_disputes / 15, 0, 1) * 0.10
    delay_prob += np.clip(historical_district_delay_avg / 200, 0, 1) * 0.05
    delay_prob = np.clip(delay_prob, 0, 1)
    noise = np.random.normal(0, 0.05, n)
    delay_label = (delay_prob + noise > 0.45).astype(int)

    # For historical rows, generate actual_delay_days based on delay_label
    if not is_ongoing:
        actual_delay_days = np.where(
            delay_label == 1,
            np.random.randint(15, 180, n),   # delayed projects: 15-180 days
            np.random.randint(0, 15, n),      # on-time projects: 0-14 days
        )
    else:
        actual_delay_days = np.full(n, np.nan)  # ongoing = unknown outcome

    # Project names for display
    project_names = [
        f"{district[i]} {project_type[i]} Project #{project_id[i]}"
        for i in range(n)
    ]

    df = pd.DataFrame({
        "project_id": project_id,
        "project_name": project_names,
        "district": district,
        "project_type": project_type,
        "total_acres": total_acres,
        "land_acquired_pct": land_acquired_pct,
        "approval_days_pending": approval_days_pending,
        "compensation_disbursed_pct": compensation_disbursed_pct,
        "legal_cases_count": legal_cases_count,
        "ownership_disputes": ownership_disputes,
        "rnp_progress_pct": rnp_progress_pct,
        "possession_pct": possession_pct,
        "affected_families": affected_families,
        "doc_deficiency_score": doc_deficiency_score,
        "historical_district_delay_avg": historical_district_delay_avg,
        "delay_label": delay_label,
        "actual_delay_days": actual_delay_days,
        "intervention_taken": "",
        "intervention_date": "",
    })
    return df


def main():
    print("[generate_data] Generating synthetic datasets...")

    # -- Historical data (completed projects) --
    df_hist = _generate_rows(NUM_HISTORICAL, start_id=1, is_ongoing=False)
    df_hist.to_csv(HISTORICAL_FILE, index=False)
    print(f"  Historical: {len(df_hist)} rows  |  Delay rate: {df_hist['delay_label'].mean()*100:.1f}%")
    print(f"  Saved -> {HISTORICAL_FILE}")

    # -- Ongoing data (in-progress projects) --
    np.random.seed(SEED + 100)
    df_ongoing = _generate_rows(NUM_ONGOING, start_id=NUM_HISTORICAL + 1, is_ongoing=True)
    df_ongoing.to_csv(ONGOING_FILE, index=False)
    print(f"  Ongoing:    {len(df_ongoing)} rows  |  actual_delay_days = NULL")
    print(f"  Saved -> {ONGOING_FILE}")

    print("[generate_data] Done.")


if __name__ == "__main__":
    main()
