"""
explainer.py — SHAP Explainability Wrapper
===========================================
Loads the trained XGBoost model and provides functions to
extract the top SHAP drivers for any given input.
"""

import os
import joblib
import numpy as np
import pandas as pd
import shap

# ──────────────────────────────────────────────────────────────
# Paths
# ──────────────────────────────────────────────────────────────
BASE_DIR = os.path.dirname(__file__)
MODEL_FILE = os.path.join(BASE_DIR, "delay_model.pkl")
COLUMNS_FILE = os.path.join(BASE_DIR, "feature_columns.pkl")

# ──────────────────────────────────────────────────────────────
# Human-readable feature labels
# ──────────────────────────────────────────────────────────────
FEATURE_LABEL_MAP = {
    "total_acres": "Total Land (Acres)",
    "land_acquired_pct": "Land Acquired %",
    "approval_days_pending": "Approval Days Pending",
    "compensation_disbursed_pct": "Compensation Disbursed %",
    "legal_cases_count": "Legal Cases Count",
    "ownership_disputes": "Ownership Disputes",
    "rnp_progress_pct": "R&R Progress %",
    "possession_pct": "Possession %",
    "affected_families": "Affected Families",
    "doc_deficiency_score": "Document Deficiency Score",
    "historical_district_delay_avg": "Historical District Delay Avg",
    # One-hot encoded features (district & project_type)
    "district_Mumbai": "District: Mumbai",
    "district_Pune": "District: Pune",
    "district_Nagpur": "District: Nagpur",
    "district_Nashik": "District: Nashik",
    "district_Aurangabad": "District: Aurangabad",
    "project_type_Highway": "Project Type: Highway",
    "project_type_Railway": "Project Type: Railway",
    "project_type_Metro": "Project Type: Metro",
    "project_type_Irrigation": "Project Type: Irrigation",
}


class SHAPExplainer:
    """Wraps SHAP TreeExplainer for the delay prediction model."""

    def __init__(self):
        print("🔍 Loading model and SHAP explainer...")
        self.model = joblib.load(MODEL_FILE)
        self.feature_columns = joblib.load(COLUMNS_FILE)
        self.explainer = shap.TreeExplainer(self.model)
        print("✅ SHAP explainer ready.")

    def get_shap_drivers(self, input_array: np.ndarray, top_n: int = 3) -> list[dict]:
        """
        Given a 2D numpy array (1 × n_features), returns the top N
        features driving the delay prediction, with SHAP values.

        Returns:
            List of dicts: [
                {"feature": "Compensation Disbursed %", "shap_value": 0.23, "direction": "increases risk"},
                ...
            ]
        """
        # Compute SHAP values (for the positive / delay class)
        shap_values = self.explainer.shap_values(input_array)

        # shap_values may be a list for multi-class; take positive class
        if isinstance(shap_values, list):
            sv = shap_values[1][0]  # class 1 (delay), first sample
        else:
            sv = shap_values[0]  # single output, first sample

        # Pair feature names with SHAP values
        feature_shap_pairs = list(zip(self.feature_columns, sv))

        # Sort by absolute SHAP value (descending)
        feature_shap_pairs.sort(key=lambda x: abs(x[1]), reverse=True)

        # Extract top N drivers
        drivers = []
        for feat_name, shap_val in feature_shap_pairs[:top_n]:
            human_label = FEATURE_LABEL_MAP.get(feat_name, feat_name)
            direction = "increases risk" if shap_val > 0 else "decreases risk"
            drivers.append({
                "feature": human_label,
                "raw_feature": feat_name,
                "shap_value": round(float(shap_val), 4),
                "direction": direction,
            })

        return drivers

    def get_base_value(self) -> float:
        """Return the SHAP base (expected) value."""
        base = self.explainer.expected_value
        if isinstance(base, (list, np.ndarray)):
            return float(base[1]) if len(base) > 1 else float(base[0])
        return float(base)


# ── Quick test ───────────────────────────────────────────────
if __name__ == "__main__":
    import pandas as pd

    explainer = SHAPExplainer()

    # Create a dummy input matching the feature columns
    dummy_input = np.random.rand(1, len(explainer.feature_columns))
    drivers = explainer.get_shap_drivers(dummy_input, top_n=3)

    print("\n🔎 Top 3 SHAP Drivers (dummy input):")
    for d in drivers:
        print(f"   {d['feature']}: {d['shap_value']} ({d['direction']})")
