"""
models.py - Pydantic Request/Response Schemas (SIH 2026 Early-Warning Platform)
================================================================================
Comprehensive validation and clean separation between prediction-time features
and outcome/auditing schemas.
"""

from pydantic import BaseModel, Field, field_validator
from typing import Optional, List, Dict, Any
from datetime import datetime

# ──────────────────────────────────────────────────────────────
# Base Prediction Input
# ──────────────────────────────────────────────────────────────

VALID_DISTRICTS = ["Mumbai", "Pune", "Nagpur", "Nashik", "Aurangabad"]
VALID_PROJECT_TYPES = ["Highway", "Railway", "Metro", "Irrigation"]


class ProjectInput(BaseModel):
    """
    Input schema representing the project state TODAY.
    Strictly accepts only the 13 prediction-time features.
    Identifiers are optional and never passed into the ML model.
    """
    district: str = Field(..., description="Project district (e.g. Pune, Mumbai, Nagpur)")
    project_type: str = Field(..., description="Project sector type (Highway, Railway, Metro, Irrigation)")
    total_acres: float = Field(..., gt=0, description="Total project land area in acres (must be > 0)")
    land_acquired_pct: float = Field(..., ge=0, le=100, description="Percentage of land formally acquired (0-100)")
    approval_days_pending: int = Field(..., ge=0, description="Days pending competent authority approval (>= 0)")
    compensation_disbursed_pct: float = Field(..., ge=0, le=100, description="Percentage of compensation disbursed (0-100)")
    legal_cases_count: int = Field(..., ge=0, description="Number of pending court/writ cases (>= 0)")
    ownership_disputes: int = Field(..., ge=0, description="Number of unverified title/ownership disputes (>= 0)")
    rnp_progress_pct: float = Field(..., ge=0, le=100, description="Rehabilitation & Resettlement progress % (0-100)")
    possession_pct: float = Field(..., ge=0, le=100, description="Physical possession secured % (0-100)")
    affected_families: int = Field(..., ge=0, description="Number of project-affected families (>= 0)")
    doc_deficiency_score: float = Field(..., ge=0, description="Documentation deficiency score (0-1 or 0-100)")
    historical_district_delay_avg: float = Field(..., ge=0, description="District historical delay benchmark in days")

    # Optional identifiers (NEVER used as ML features)
    project_id: Optional[int] = Field(default=None, description="Optional DB identifier")
    project_name: Optional[str] = Field(default=None, description="Optional project name")

    @field_validator("district")
    @classmethod
    def validate_district(cls, v: str) -> str:
        v_clean = v.strip().title()
        if v_clean not in VALID_DISTRICTS:
            # Allow fallback if in valid list case-insensitively
            for d in VALID_DISTRICTS:
                if d.lower() == v.lower():
                    return d
            return v_clean  # OHE handle_unknown will handle, but warning issued
        return v_clean

    @field_validator("project_type")
    @classmethod
    def validate_project_type(cls, v: str) -> str:
        v_clean = v.strip().title()
        for pt in VALID_PROJECT_TYPES:
            if pt.lower() == v.lower():
                return pt
        return v_clean


class WhatIfRequest(BaseModel):
    project: ProjectInput
    feature_to_change: str
    new_value: float


# ──────────────────────────────────────────────────────────────
# Operational & Feedback Schemas
# ──────────────────────────────────────────────────────────────

class LoginRequest(BaseModel):
    username: str
    password: str


class LoginResponse(BaseModel):
    access_token: str
    token_type: str
    role: str
    name: str


class IngestResponse(BaseModel):
    message: str
    processed_count: int
    high_risk_count: int


class InterventionUpdate(BaseModel):
    project_id: int
    intervention_taken: str
    intervention_date: Optional[str] = None


class FeedbackInput(BaseModel):
    project_id: int
    actual_delay_days: int


class AlertItem(BaseModel):
    project_id: int
    project_name: str
    district: str
    risk_score: float
    risk_category: str
    alert_message: str
    recommended_action: str


# ──────────────────────────────────────────────────────────────
# Prediction & Model Health Response Schemas
# ──────────────────────────────────────────────────────────────

class SHAPDriver(BaseModel):
    feature: str
    raw_feature: str
    shap_value: float
    direction: str
    value: Optional[Any] = None
    impact: Optional[float] = None


class StageRisk(BaseModel):
    stage: str
    risk: float
    category: Optional[str] = None
    description: Optional[str] = None


class PredictionResponse(BaseModel):
    delay_probability: float
    risk_score: float
    risk_category: str
    category: str  # Backward-compatible alias
    top_risk_drivers: List[Dict[str, Any]]
    top_drivers: List[SHAPDriver]  # Backward-compatible alias
    protective_factors: List[Dict[str, Any]]
    recommendations: List[str]
    recommendation: str  # Primary recommendation backward-compatible alias
    stage_risks: Dict[str, Any]
    stage_risks_list: List[Dict[str, Any]]
    base_probability: Optional[float] = None


class WhatIfResponse(BaseModel):
    original_risk: float
    new_risk: float
    reduction: float
    feature_changed: str
    original_value: float
    new_value: float
    original_probability: Optional[float] = None
    new_probability: Optional[float] = None
    original_category: Optional[str] = None
    new_category: Optional[str] = None


class ModelHealthResponse(BaseModel):
    model_name: str
    model_version: str
    prediction_target: str
    raw_features_count: int
    encoded_features_count: int
    prediction_features: List[str]
    leakage_prevented_columns: List[str]
    train_size: int
    test_size: int
    total_samples: int
    accuracy: float
    roc_auc: float
    precision: float
    recall: float
    f1_score: float
    confusion_matrix: Dict[str, int]
    timestamp: str
    evaluation_strategy: str
    status: str
