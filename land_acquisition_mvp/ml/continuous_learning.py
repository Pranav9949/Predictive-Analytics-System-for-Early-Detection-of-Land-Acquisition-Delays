"""
continuous_learning.py - Feedback-Driven Model Retraining
==========================================================
Compares predicted risk vs actual delay outcomes, logs errors,
and triggers retraining when enough new data is collected.
"""

import os
import json
import datetime
import numpy as np
import pandas as pd
import joblib
from sklearn.model_selection import train_test_split
from sklearn.metrics import accuracy_score, f1_score, roc_auc_score
from xgboost import XGBClassifier

BASE_DIR = os.path.dirname(os.path.abspath(__file__))
DATA_FILE = os.path.join(BASE_DIR, "land_data.csv")
MODEL_FILE = os.path.join(BASE_DIR, "delay_model.pkl")
ENCODER_FILE = os.path.join(BASE_DIR, "encoder.pkl")
COLUMNS_FILE = os.path.join(BASE_DIR, "feature_columns.pkl")
METRICS_FILE = os.path.join(BASE_DIR, "model_metrics.json")
FEEDBACK_LOG = os.path.join(BASE_DIR, "feedback_log.csv")

RETRAIN_THRESHOLD = 50  # Retrain after this many new outcomes

NUMERIC_COLS = [
    "total_acres", "land_acquired_pct", "approval_days_pending",
    "compensation_disbursed_pct", "legal_cases_count", "ownership_disputes",
    "rnp_progress_pct", "possession_pct", "affected_families",
    "doc_deficiency_score", "historical_district_delay_avg",
]
CATEGORICAL_COLS = ["district", "project_type"]


def log_feedback(project_id, predicted_risk, actual_delay_days):
    """
    Log a single feedback entry: predicted risk vs actual outcome.
    Returns the prediction error.
    """
    actual_delayed = 1 if actual_delay_days > 14 else 0  # >14 days = delayed
    predicted_delayed = 1 if predicted_risk >= 50 else 0
    error = abs(predicted_risk / 100 - actual_delayed)

    entry = {
        "timestamp": datetime.datetime.now().isoformat(),
        "project_id": project_id,
        "predicted_risk": predicted_risk,
        "predicted_delayed": predicted_delayed,
        "actual_delay_days": actual_delay_days,
        "actual_delayed": actual_delayed,
        "prediction_error": round(error, 4),
        "used_for_retraining": False,
    }

    # Append to feedback log
    if os.path.exists(FEEDBACK_LOG):
        df = pd.read_csv(FEEDBACK_LOG)
        df = pd.concat([df, pd.DataFrame([entry])], ignore_index=True)
    else:
        df = pd.DataFrame([entry])

    df.to_csv(FEEDBACK_LOG, index=False)

    return {
        "prediction_error": round(error, 4),
        "correct": predicted_delayed == actual_delayed,
        "total_feedback_entries": len(df),
        "unused_entries": int((~df["used_for_retraining"].astype(bool)).sum()),
    }


def should_retrain():
    """Check if enough unused feedback entries have accumulated."""
    if not os.path.exists(FEEDBACK_LOG):
        return False, 0
    df = pd.read_csv(FEEDBACK_LOG)
    unused = (~df["used_for_retraining"].astype(bool)).sum()
    return unused >= RETRAIN_THRESHOLD, int(unused)


def retrain_model():
    """
    Retrain the model incorporating feedback data.
    Merges original training data with confirmed outcomes.
    """
    print("[continuous_learning] Starting model retraining...")

    # Load original training data
    df_original = pd.read_csv(DATA_FILE)

    # Load feedback log and merge confirmed outcomes
    if os.path.exists(FEEDBACK_LOG):
        df_feedback = pd.read_csv(FEEDBACK_LOG)
        # Mark all as used for retraining
        df_feedback["used_for_retraining"] = True
        df_feedback.to_csv(FEEDBACK_LOG, index=False)

        # Get feedback project data from the original dataset
        feedback_ids = df_feedback["project_id"].tolist()
        # Update delay labels in original data based on actual outcomes
        for _, row in df_feedback.iterrows():
            pid = row["project_id"]
            mask = df_original["project_id"] == pid
            if mask.any():
                df_original.loc[mask, "delay_label"] = row["actual_delayed"]

    # Prepare features
    from train_model import prepare_features
    encoder = joblib.load(ENCODER_FILE)

    y = df_original["delay_label"].values
    X, feature_columns, encoder = prepare_features(df_original, encoder, fit=False)

    # Train/test split
    X_train, X_test, y_train, y_test = train_test_split(
        X, y, test_size=0.2, random_state=42, stratify=y
    )

    # Retrain
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

    # Save updated model
    joblib.dump(model, MODEL_FILE)
    print(f"  Updated model saved -> {MODEL_FILE}")

    # Save updated metrics
    metrics = {
        "timestamp": datetime.datetime.now().isoformat(),
        "accuracy": acc,
        "roc_auc": auc,
        "f1_score": f1,
        "train_size": int(X_train.shape[0]),
        "test_size": int(X_test.shape[0]),
        "n_features": len(feature_columns),
        "retraining_trigger": "feedback_threshold_reached",
    }

    # Append to metrics history
    metrics_history_file = os.path.join(BASE_DIR, "model_metrics_history.json")
    history = []
    if os.path.exists(metrics_history_file):
        with open(metrics_history_file) as f:
            history = json.load(f)
    history.append(metrics)
    with open(metrics_history_file, "w") as f:
        json.dump(history, f, indent=2)

    # Save current metrics
    with open(METRICS_FILE, "w") as f:
        json.dump(metrics, f, indent=2)

    print(f"  Accuracy: {acc}  |  F1: {f1}  |  AUC: {auc}")
    print("[continuous_learning] Retraining complete.")

    return metrics


if __name__ == "__main__":
    ok, count = should_retrain()
    if ok:
        print(f"Retraining triggered ({count} new outcomes)...")
        retrain_model()
    else:
        print(f"Not enough feedback yet ({count}/{RETRAIN_THRESHOLD})")
