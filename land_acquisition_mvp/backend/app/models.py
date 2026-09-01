"""
models.py - Pydantic Request/Response Schemas (V2)
===================================================
Adds schemas for Operational workflows (Ingest, Intervene, Feedback).
"""

from pydantic import BaseModel, Field
from typing import Optional, List, Any
from datetime import datetime

# ── Base Models ──

class ProjectInput(BaseModel):
    project_id: int
    project_name: Optional[str] = None
    district: str
    project_type: str
    total_acres: float
    land_acquired_pct: float
    approval_days_pending: int
    compensation_disbursed_pct: float
    legal_cases_count: int
    ownership_disputes: int
    rnp_progress_pct: float
    possession_pct: float
    affected_families: int
    doc_deficiency_score: float
    historical_district_delay_avg: float

class WhatIfRequest(BaseModel):
    project: ProjectInput
    feature_to_change: str
    new_value: float

# ── Operational Models ──

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

# ── Prediction Response Models ──

class SHAPDriver(BaseModel):
    feature: str
    raw_feature: str
    shap_value: float
    direction: str

class StageRisk(BaseModel):
    stage: str
    risk: float

class PredictionResponse(BaseModel):
    risk_score: float
    category: str
    top_drivers: List[SHAPDriver]
    stage_risks: List[StageRisk]
    recommendation: str

class WhatIfResponse(BaseModel):
    original_risk: float
    new_risk: float
    reduction: float
    feature_changed: str
    original_value: float
    new_value: float
