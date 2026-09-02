"""
whatif.py - What-If Simulator Endpoint (SIH 2026)
==================================================
Simulates parameter improvements (e.g. accelerating compensation disbursement,
resolving legal disputes, or expediting approvals) using the EXACT SAME trained
XGBoost model without any retraining.
"""

import os
import sys
from fastapi import APIRouter, HTTPException
from app.models import WhatIfRequest, WhatIfResponse, ProjectInput
from app.routes.predict import _prepare_input

ML_DIR = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", "..", "..", "ml"))
if ML_DIR not in sys.path:
    sys.path.insert(0, ML_DIR)

from train_model import get_risk_category

router = APIRouter()


@router.post("/whatif", response_model=WhatIfResponse)
async def whatif_simulation(request: WhatIfRequest):
    """
    Evaluates risk impact of modifying one or more project state parameters.
    Guarantees that the SAME trained model is evaluated without retraining.
    """
    from app.main import app_state
    if "model" not in app_state:
        raise HTTPException(status_code=503, detail="ML model not loaded.")

    model = app_state["model"]
    project = request.project
    feature = request.feature_to_change
    new_value = request.new_value

    # 1. Calculate original risk
    original_input, _ = _prepare_input(project, app_state)
    original_proba = float(model.predict_proba(original_input)[0][1])
    original_risk = round(original_proba * 100.0, 1)

    # 2. Modify feature
    project_dict = project.model_dump()
    if feature not in project_dict:
        raise HTTPException(status_code=400, detail=f"Unknown project feature: '{feature}'.")

    original_value = project_dict[feature]
    project_dict[feature] = new_value

    try:
        modified_project = ProjectInput(**project_dict)
    except Exception as e:
        raise HTTPException(status_code=422, detail=f"Invalid parameter value: {e}")

    # 3. Calculate new risk with modified parameter
    modified_input, _ = _prepare_input(modified_project, app_state)
    new_proba = float(model.predict_proba(modified_input)[0][1])
    new_risk = round(new_proba * 100.0, 1)

    reduction = round(original_risk - new_risk, 1)

    return WhatIfResponse(
        original_risk=original_risk,
        new_risk=new_risk,
        reduction=reduction,
        feature_changed=feature,
        original_value=float(original_value),
        new_value=float(new_value),
        original_probability=round(original_proba, 4),
        new_probability=round(new_proba, 4),
        original_category=get_risk_category(original_risk),
        new_category=get_risk_category(new_risk),
    )
