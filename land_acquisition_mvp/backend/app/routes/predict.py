"""
predict.py - Prediction Endpoint (Modified for V2)
"""
import os
import sys
import numpy as np
import pandas as pd
from fastapi import APIRouter, HTTPException, Depends
from sqlalchemy.orm import Session

from app.models import ProjectInput, PredictionResponse, SHAPDriver, StageRisk
from app.database import get_db, Project

ML_DIR = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", "..", "..", "ml"))
sys.path.insert(0, ML_DIR)
from train_model import compute_stage_risks

router = APIRouter()

RECOMMENDATION_MAP = {
    "compensation_disbursed_pct": "Escalate pending compensation disbursement to the District Collector.",
    "legal_cases_count": "Schedule joint court hearing and engage mediators for dispute resolution.",
    "ownership_disputes": "Initiate ownership verification drive and deploy revenue officers.",
    "approval_days_pending": "Fast-track pending approvals through single-window clearance system.",
    "doc_deficiency_score": "Launch document rectification camp for affected parcels.",
    "rnp_progress_pct": "Accelerate R&R package delivery and resettlement site preparation.",
    "possession_pct": "Deploy additional survey teams to expedite physical possession.",
    "land_acquired_pct": "Prioritize notification under Section 11 for remaining parcels.",
    "affected_families": "Set up additional grievance redressal camps in affected areas.",
}

def _get_recommendation(drivers: list[dict]) -> str:
    if not drivers:
        return "Monitor project status regularly."
    top_raw = drivers[0].get("raw_feature", "")
    for key, rec in RECOMMENDATION_MAP.items():
        if key in top_raw:
            return rec
    return "Review project parameters and escalate to senior management."

def _categorize_risk(score: float) -> str:
    if score >= 75: return "Critical"
    elif score >= 50: return "High"
    elif score >= 25: return "Moderate"
    else: return "Low"

def _prepare_input(project: ProjectInput, app_state: dict) -> np.ndarray:
    encoder = app_state["encoder"]
    numeric_values = [
        project.total_acres, project.land_acquired_pct, project.approval_days_pending,
        project.compensation_disbursed_pct, project.legal_cases_count, project.ownership_disputes,
        project.rnp_progress_pct, project.possession_pct, project.affected_families,
        project.doc_deficiency_score, project.historical_district_delay_avg,
    ]
    cat_df = pd.DataFrame([[project.district, project.project_type]], columns=["district", "project_type"])
    cat_encoded = encoder.transform(cat_df)
    return np.hstack([np.array(numeric_values).reshape(1, -1), cat_encoded])

@router.post("/predict", response_model=PredictionResponse)
async def predict_delay(
    project: ProjectInput,
    db: Session = Depends(get_db)
):
    from app.main import app_state
    if "model" not in app_state:
        raise HTTPException(status_code=503, detail="ML model not loaded.")
        
    model = app_state["model"]
    shap_explainer = app_state["shap_explainer"]
    
    input_array = _prepare_input(project, app_state)
    proba = model.predict_proba(input_array)[0][1]
    risk_score = round(float(proba) * 100, 1)
    category = _categorize_risk(risk_score)
    
    raw_drivers = shap_explainer.get_shap_drivers(input_array, top_n=3)
    top_drivers = [SHAPDriver(**d) for d in raw_drivers]
    
    row_data = pd.Series({
        "approval_days_pending": project.approval_days_pending,
        "doc_deficiency_score": project.doc_deficiency_score,
        "compensation_disbursed_pct": project.compensation_disbursed_pct,
        "affected_families": project.affected_families,
        "legal_cases_count": project.legal_cases_count,
        "ownership_disputes": project.ownership_disputes,
        "possession_pct": project.possession_pct,
        "land_acquired_pct": project.land_acquired_pct,
        "rnp_progress_pct": project.rnp_progress_pct,
    })
    stage_dict = compute_stage_risks(row_data)
    stage_risks = [StageRisk(stage=k, risk=v) for k, v in stage_dict.items()]
    
    recommendation = _get_recommendation(raw_drivers)
    
    # Save to DB if project exists
    proj = db.query(Project).filter(Project.project_id == project.project_id).first()
    if proj:
        proj.risk_score = risk_score
        proj.risk_category = category
        db.commit()
        
    return PredictionResponse(
        risk_score=risk_score, category=category,
        top_drivers=top_drivers, stage_risks=stage_risks,
        recommendation=recommendation
    )
