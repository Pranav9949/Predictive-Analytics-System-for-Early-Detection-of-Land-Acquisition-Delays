"""
whatif.py - What-If Simulator Endpoint (V2)
"""
from fastapi import APIRouter, HTTPException, Depends
from app.models import WhatIfRequest, WhatIfResponse, ProjectInput
from app.routes.predict import _prepare_input

router = APIRouter()

@router.post("/whatif", response_model=WhatIfResponse)
async def whatif_simulation(request: WhatIfRequest):
    from app.main import app_state
    if "model" not in app_state:
        raise HTTPException(status_code=503, detail="ML model not loaded.")
        
    model = app_state["model"]
    project = request.project
    feature = request.feature_to_change
    new_value = request.new_value
    
    # 1. Calculate original risk
    original_input = _prepare_input(project, app_state)
    original_risk = round(float(model.predict_proba(original_input)[0][1]) * 100, 1)
    
    # 2. Modify feature
    project_dict = project.model_dump()
    if feature not in project_dict:
        raise HTTPException(status_code=400, detail=f"Unknown feature: '{feature}'.")
        
    original_value = project_dict[feature]
    project_dict[feature] = new_value
    modified_project = ProjectInput(**project_dict)
    
    # 3. Calculate new risk
    modified_input = _prepare_input(modified_project, app_state)
    new_risk = round(float(model.predict_proba(modified_input)[0][1]) * 100, 1)
    
    reduction = round(original_risk - new_risk, 1)
    
    return WhatIfResponse(
        original_risk=original_risk,
        new_risk=new_risk,
        reduction=reduction,
        feature_changed=feature,
        original_value=float(original_value),
        new_value=float(new_value)
    )
