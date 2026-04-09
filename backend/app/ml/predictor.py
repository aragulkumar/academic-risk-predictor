"""
ML Predictor — loads trained ensemble, runs inference, generates SHAP explanations
"""

from __future__ import annotations

import json
import os

import joblib
import numpy as np
import shap

_MODEL_DIR = os.path.join(os.path.dirname(__file__), "..", "..", "..", "ml", "models")

# Cache loaded model + explainer in module scope
_model = None
_explainer = None
_features: list[str] = []


def _load():
    global _model, _explainer, _features
    if _model is not None:
        return

    model_path = os.path.join(_MODEL_DIR, "ensemble_model.joblib")
    features_path = os.path.join(_MODEL_DIR, "feature_names.joblib")

    if not os.path.exists(model_path):
        raise FileNotFoundError(
            f"Model not found at {model_path}. Run `python ml/train.py` first."
        )

    _model = joblib.load(model_path)
    _features = joblib.load(features_path)

    # Use the XGBoost sub-estimator for SHAP (tree explainer is exact & fast)
    xgb_model = _model.named_estimators_["xgb"]
    _explainer = shap.TreeExplainer(xgb_model)


FEATURE_LABELS = {
    "attendance_pct": "Attendance rate",
    "internal_marks": "Internal assessment score",
    "assignment_submission_rate": "Assignment submission rate",
    "semester": "Current semester",
    "attendance_trend": "Attendance trend (last 4 weeks)",
    "marks_trend": "Marks trend (last 4 weeks)",
}


def predict(
    attendance_pct: float,
    internal_marks: float,
    assignment_submission_rate: float,
    semester: int,
    attendance_trend: float = 0.0,
    marks_trend: float = 0.0,
) -> dict:
    """
    Returns:
        {
          "risk_score": float (0-100),
          "risk_level": str,
          "at_risk": bool,
          "explanation": str (JSON),
          "top_factors": str (plain English),
        }
    """
    _load()

    features = np.array([[
        attendance_pct,
        internal_marks,
        assignment_submission_rate,
        float(semester),
        attendance_trend,
        marks_trend,
    ]])

    # Risk probability → scale to 0-100
    prob_at_risk: float = float(_model.predict_proba(features)[0][1])
    risk_score = round(prob_at_risk * 100, 1)

    # Risk tier
    if risk_score >= 75:
        risk_level = "critical"
    elif risk_score >= 50:
        risk_level = "high"
    elif risk_score >= 30:
        risk_level = "medium"
    else:
        risk_level = "low"

    # SHAP values from XGB sub-model
    shap_values = _explainer.shap_values(features)[0]
    feature_impacts = dict(zip(_features, shap_values.tolist()))

    # Top 3 factors in plain English
    sorted_factors = sorted(feature_impacts.items(), key=lambda x: abs(x[1]), reverse=True)[:3]
    top_phrases = []
    for feat, val in sorted_factors:
        label = FEATURE_LABELS.get(feat, feat)
        direction = "low" if val > 0 else "high"
        top_phrases.append(f"{label} is {direction} (impact: {val:+.2f})")

    top_factors_str = " | ".join(top_phrases)

    return {
        "risk_score": risk_score,
        "risk_level": risk_level,
        "at_risk": prob_at_risk >= 0.5,
        "explanation": json.dumps(feature_impacts),
        "top_factors": top_factors_str,
    }
