"""
explainer.py - SHAP Explainability Engine
===========================================
Alignd with Smart India Hackathon 2026 early-warning requirements.
Extracts genuine SHAP TreeExplainer values for predictions without hardcoding.
Partitions contributions into:
  - top_risk_drivers (SHAP > 0: increases probability of future delay)
  - protective_factors (SHAP < 0: decreases delay risk)
Translates technical column names to human-readable administrative terms.
"""

import os
import joblib
import numpy as np
import shap

BASE_DIR = os.path.dirname(os.path.abspath(__file__))
MODEL_FILE = os.path.join(BASE_DIR, "delay_model.pkl")
COLUMNS_FILE = os.path.join(BASE_DIR, "feature_columns.pkl")

# Human-friendly feature labels (Never raw database variable names)
FEATURE_LABEL_MAP = {
    "compensation_disbursed_pct": "Compensation Disbursed",
    "legal_cases_count": "Legal Cases",
    "approval_days_pending": "Approval Days Pending",
    "rnp_progress_pct": "R&R Progress",
    "possession_pct": "Physical Possession",
    "land_acquired_pct": "Land Acquired",
    "doc_deficiency_score": "Documentation Deficiency",
    "ownership_disputes": "Ownership Disputes",
    "affected_families": "Affected Families",
    "total_acres": "Total Project Acres",
    "historical_district_delay_avg": "Historical District Delay Avg",
    # One-hot encoded indicators
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
        print("[INFO] Initializing SHAP TreeExplainer...")
        self.model = joblib.load(MODEL_FILE)
        self.feature_columns = joblib.load(COLUMNS_FILE)
        self.explainer = shap.TreeExplainer(self.model)
        print("[OK] SHAP explainer ready.")

    def explain(self, input_array: np.ndarray, feature_value_dict: dict = None, top_n: int = 5) -> dict:
        """
        Calculates exact SHAP values for an input vector and returns:
          - top_risk_drivers: factors increasing delay risk (positive SHAP)
          - protective_factors: factors mitigating delay risk (negative SHAP)
          - base_value: model expected value baseline
        """
        shap_values = self.explainer.shap_values(input_array)

        # Handle binary classification outputs
        if isinstance(shap_values, list):
            sv = shap_values[1][0]  # Positive class (delayed)
        elif len(shap_values.shape) == 2:
            sv = shap_values[0]
        else:
            sv = shap_values[0]

        pairs = list(zip(self.feature_columns, sv))

        risk_drivers = []
        protective_factors = []

        for feat_name, shap_val in pairs:
            human_label = FEATURE_LABEL_MAP.get(feat_name, feat_name)
            raw_val = None
            if feature_value_dict:
                raw_val = feature_value_dict.get(feat_name, None)
                # Check one-hot base
                if raw_val is None and "_" in feat_name:
                    prefix, opt = feat_name.split("_", 1)
                    if feature_value_dict.get(prefix) == opt:
                        raw_val = f"Yes ({opt})"

            entry = {
                "feature": human_label,
                "raw_feature": feat_name,
                "value": raw_val,
                "impact": round(float(shap_val), 3),
                "shap_value": round(float(shap_val), 3),
                "direction": "increases_risk" if shap_val > 0 else "decreases_risk",
            }

            if shap_val > 0.001:
                risk_drivers.append(entry)
            elif shap_val < -0.001:
                protective_factors.append(entry)

        # Sort risk drivers descending by positive impact
        risk_drivers.sort(key=lambda x: x["shap_value"], reverse=True)
        # Sort protective factors ascending (strongest negative impact first)
        protective_factors.sort(key=lambda x: x["shap_value"])

        # For legacy compatibility
        legacy_drivers = []
        for d in risk_drivers[:top_n]:
            legacy_drivers.append({
                "feature": d["feature"],
                "raw_feature": d["raw_feature"],
                "shap_value": d["shap_value"],
                "direction": "increases risk",
            })

        return {
            "top_risk_drivers": risk_drivers[:top_n],
            "protective_factors": protective_factors[:top_n],
            "legacy_top_drivers": legacy_drivers,
            "base_value": self.get_base_value(),
        }

    def get_shap_drivers(self, input_array: np.ndarray, top_n: int = 3) -> list[dict]:
        """Backward-compatible helper returning top N drivers."""
        res = self.explain(input_array, top_n=top_n)
        return res["legacy_top_drivers"]

    def get_base_value(self) -> float:
        """Return the SHAP base expected value."""
        base = self.explainer.expected_value
        if isinstance(base, (list, np.ndarray)):
            return float(base[1]) if len(base) > 1 else float(base[0])
        return float(base)


if __name__ == "__main__":
    explainer = SHAPExplainer()
    dummy_input = np.zeros((1, len(explainer.feature_columns)))
    res = explainer.explain(dummy_input)
    print(f"Top risk drivers: {len(res['top_risk_drivers'])}")
    print(f"Protective factors: {len(res['protective_factors'])}")
    print(f"Base value: {res['base_value']:.4f}")
