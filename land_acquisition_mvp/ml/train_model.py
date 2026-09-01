"""
train_model.py - XGBoost Delay Prediction Model Trainer
========================================================
Trains the classifier, saves model + encoder + feature columns,
AND exports feature_importances.json + model_metrics.json.
"""

import os
import json
import joblib
import numpy as np
import pandas as pd
from sklearn.model_selection import train_test_split
from sklearn.preprocessing import OneHotEncoder
from sklearn.metrics import (
    classification_report, accuracy_score,
    roc_auc_score, f1_score,
)
from xgboost import XGBClassifier

BASE_DIR = os.path.dirname(os.path.abspath(__file__))
DATA_FILE = os.path.join(BASE_DIR, "land_data.csv")
MODEL_FILE = os.path.join(BASE_DIR, "delay_model.pkl")
ENCODER_FILE = os.path.join(BASE_DIR, "encoder.pkl")
COLUMNS_FILE = os.path.join(BASE_DIR, "feature_columns.pkl")
IMPORTANCES_FILE = os.path.join(BASE_DIR, "feature_importances.json")
METRICS_FILE = os.path.join(BASE_DIR, "model_metrics.json")

CATEGORICAL_COLS = ["district", "project_type"]
NUMERIC_COLS = [
    "total_acres", "land_acquired_pct", "approval_days_pending",
    "compensation_disbursed_pct", "legal_cases_count", "ownership_disputes",
    "rnp_progress_pct", "possession_pct", "affected_families",
    "doc_deficiency_score", "historical_district_delay_avg",
]

# Stage-wise risk weights
STAGE_FEATURE_MAP = {
    "Approval Stage": {"approval_days_pending": 0.6, "doc_deficiency_score": 0.4},
    "Compensation Stage": {"compensation_disbursed_pct": 0.7, "affected_families": 0.3},
    "Legal Stage": {"legal_cases_count": 0.5, "ownership_disputes": 0.5},
    "Possession Stage": {"possession_pct": 0.4, "land_acquired_pct": 0.3, "rnp_progress_pct": 0.3},
}


def compute_stage_risks(row):
    """Compute 0-100 risk score per acquisition stage."""
    risks = {}
    risks["Approval Stage"] = round(min(
        (row["approval_days_pending"] / 120 * 0.6 + row["doc_deficiency_score"] * 0.4) * 100, 100), 1)
    risks["Compensation Stage"] = round(min(
        ((100 - row["compensation_disbursed_pct"]) / 100 * 0.7 + row["affected_families"] / 800 * 0.3) * 100, 100), 1)
    risks["Legal Stage"] = round(min(
        (row["legal_cases_count"] / 12 * 0.5 + row["ownership_disputes"] / 15 * 0.5) * 100, 100), 1)
    risks["Possession Stage"] = round(min(
        ((100 - row["possession_pct"]) / 100 * 0.4 +
         (100 - row["land_acquired_pct"]) / 100 * 0.3 +
         (100 - row["rnp_progress_pct"]) / 100 * 0.3) * 100, 100), 1)
    return risks


def prepare_features(df, encoder=None, fit=False):
    """Encode categoricals and return feature array + column names."""
    X_numeric = df[NUMERIC_COLS].values

    if fit:
        encoder = OneHotEncoder(sparse_output=False, handle_unknown="ignore")
        X_cat = encoder.fit_transform(df[CATEGORICAL_COLS])
    else:
        X_cat = encoder.transform(df[CATEGORICAL_COLS])

    cat_names = encoder.get_feature_names_out(CATEGORICAL_COLS).tolist()
    feature_columns = NUMERIC_COLS + cat_names
    X = np.hstack([X_numeric, X_cat])
    return X, feature_columns, encoder


def main():
    print("[train_model] Loading dataset...")
    df = pd.read_csv(DATA_FILE)
    print(f"  Shape: {df.shape}")

    y = df["delay_label"].values

    # Encode features
    print("[train_model] Encoding features...")
    X, feature_columns, encoder = prepare_features(df, fit=True)
    print(f"  Total features: {len(feature_columns)}")

    # Train/test split
    X_train, X_test, y_train, y_test = train_test_split(
        X, y, test_size=0.2, random_state=42, stratify=y
    )
    print(f"  Train: {X_train.shape[0]}  |  Test: {X_test.shape[0]}")

    # Train XGBoost
    print("[train_model] Training XGBoost...")
    model = XGBClassifier(
        n_estimators=200, max_depth=6, learning_rate=0.1,
        subsample=0.8, colsample_bytree=0.8, random_state=42,
        eval_metric="logloss",
    )
    model.fit(X_train, y_train)

    # Evaluate
    y_pred = model.predict(X_test)
    y_proba = model.predict_proba(X_test)[:, 1]

    acc = round(accuracy_score(y_test, y_pred), 4)
    auc = round(roc_auc_score(y_test, y_proba), 4)
    f1 = round(f1_score(y_test, y_pred), 4)

    print(f"\n  Accuracy : {acc}")
    print(f"  ROC-AUC  : {auc}")
    print(f"  F1 Score : {f1}")
    print("\n" + classification_report(y_test, y_pred, target_names=["No Delay", "Delay"]))

    # Save model artifacts
    joblib.dump(model, MODEL_FILE)
    joblib.dump(encoder, ENCODER_FILE)
    joblib.dump(feature_columns, COLUMNS_FILE)
    print(f"  Model   -> {MODEL_FILE}")
    print(f"  Encoder -> {ENCODER_FILE}")
    print(f"  Columns -> {COLUMNS_FILE}")

    # Save feature importances
    importances = dict(zip(feature_columns, model.feature_importances_.tolist()))
    sorted_imp = dict(sorted(importances.items(), key=lambda x: x[1], reverse=True))
    with open(IMPORTANCES_FILE, "w") as f:
        json.dump(sorted_imp, f, indent=2)
    print(f"  Feature importances -> {IMPORTANCES_FILE}")

    # Save baseline metrics
    import datetime
    metrics = {
        "timestamp": datetime.datetime.now().isoformat(),
        "accuracy": acc,
        "roc_auc": auc,
        "f1_score": f1,
        "train_size": int(X_train.shape[0]),
        "test_size": int(X_test.shape[0]),
        "n_features": len(feature_columns),
        "retraining_trigger": "initial_training",
    }
    with open(METRICS_FILE, "w") as f:
        json.dump(metrics, f, indent=2)
    print(f"  Metrics -> {METRICS_FILE}")

    print("\n[train_model] Done.")


if __name__ == "__main__":
    main()
