"""
ML Training Script — XGBoost + Random Forest Ensemble
Generates synthetic student data, trains models, and saves artifacts to models/
"""

import json
import os

import joblib
import numpy as np
import pandas as pd
from sklearn.ensemble import RandomForestClassifier, VotingClassifier
from sklearn.metrics import classification_report, roc_auc_score
from sklearn.model_selection import train_test_split
from sklearn.preprocessing import LabelEncoder
from xgboost import XGBClassifier

SEED = 42
np.random.seed(SEED)

MODELS_DIR = os.path.join(os.path.dirname(__file__), "models")
os.makedirs(MODELS_DIR, exist_ok=True)


# ── 1. Generate Synthetic Data ─────────────────────────────────────────────

def generate_data(n: int = 2000) -> pd.DataFrame:
    attendance = np.clip(np.random.normal(75, 18, n), 0, 100)
    internal_marks = np.clip(np.random.normal(65, 20, n), 0, 100)
    submission_rate = np.clip(np.random.normal(80, 15, n), 0, 100)
    semester = np.random.randint(1, 9, n).astype(float)

    # Simulated trend: decrease in last 4 weeks
    attendance_trend = np.random.normal(-2, 5, n)  # negative = declining
    marks_trend = np.random.normal(-1, 4, n)

    # Risk label: 1 = at risk
    risk_score_raw = (
        (100 - attendance) * 0.35
        + (100 - internal_marks) * 0.30
        + (100 - submission_rate) * 0.20
        + np.clip(-attendance_trend * 3, 0, 15)
        + np.clip(-marks_trend * 2, 0, 10)
        + np.random.normal(0, 5, n)
    )

    at_risk = (risk_score_raw > 50).astype(int)

    return pd.DataFrame({
        "attendance_pct": attendance,
        "internal_marks": internal_marks,
        "assignment_submission_rate": submission_rate,
        "semester": semester,
        "attendance_trend": attendance_trend,
        "marks_trend": marks_trend,
        "at_risk": at_risk,
    })


# ── 2. Train ───────────────────────────────────────────────────────────────

def train():
    print("Generating synthetic training data...")
    df = generate_data(3000)
    df.to_csv(os.path.join(os.path.dirname(__file__), "data", "synthetic_students.csv"), index=False)

    FEATURES = [
        "attendance_pct",
        "internal_marks",
        "assignment_submission_rate",
        "semester",
        "attendance_trend",
        "marks_trend",
    ]
    X = df[FEATURES]
    y = df["at_risk"]

    X_train, X_test, y_train, y_test = train_test_split(X, y, test_size=0.2, random_state=SEED, stratify=y)

    xgb = XGBClassifier(
        n_estimators=200,
        max_depth=5,
        learning_rate=0.08,
        subsample=0.8,
        colsample_bytree=0.8,
        use_label_encoder=False,
        eval_metric="logloss",
        random_state=SEED,
    )

    rf = RandomForestClassifier(
        n_estimators=200,
        max_depth=8,
        min_samples_split=10,
        random_state=SEED,
        n_jobs=-1,
    )

    ensemble = VotingClassifier(
        estimators=[("xgb", xgb), ("rf", rf)],
        voting="soft",
        weights=[0.6, 0.4],
    )

    print("Training ensemble model...")
    ensemble.fit(X_train, y_train)

    y_pred = ensemble.predict(X_test)
    y_prob = ensemble.predict_proba(X_test)[:, 1]

    print("\n── Evaluation ─────────────────────────────────")
    print(classification_report(y_test, y_pred, target_names=["Not At Risk", "At Risk"]))
    print(f"ROC-AUC: {roc_auc_score(y_test, y_prob):.4f}")

    # Save artifacts
    joblib.dump(ensemble, os.path.join(MODELS_DIR, "ensemble_model.joblib"))
    joblib.dump(FEATURES, os.path.join(MODELS_DIR, "feature_names.joblib"))

    # Save feature importance from XGB component
    fi = dict(zip(FEATURES, xgb.feature_importances_))
    with open(os.path.join(MODELS_DIR, "feature_importance.json"), "w") as f:
        json.dump(fi, f, indent=2)

    print(f"\n✅ Model saved to {MODELS_DIR}/ensemble_model.joblib")


if __name__ == "__main__":
    train()
