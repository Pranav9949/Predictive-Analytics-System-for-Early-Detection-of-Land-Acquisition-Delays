"""
ingest.py - Ingestion APIs
"""
import io
import pandas as pd
from fastapi import APIRouter, UploadFile, File, Depends, HTTPException
from sqlalchemy.orm import Session
from typing import List, Dict, Any

from app.database import get_db, Project, AuditLog
from app.auth import get_current_user, require_role
from app.routes.predict import _prepare_input, _categorize_risk
from app.models import IngestResponse, ProjectInput

router = APIRouter()

@router.post("/ingest/csv", response_model=IngestResponse)
async def ingest_csv(
    file: UploadFile = File(...),
    db: Session = Depends(get_db),
    user: dict = Depends(require_role(["LAO", "Collector"]))
):
    from app.main import app_state
    if "model" not in app_state:
        raise HTTPException(status_code=503, detail="ML model not loaded.")
        
    content = await file.read()
    try:
        df = pd.read_csv(io.BytesIO(content))
    except Exception:
        raise HTTPException(status_code=400, detail="Invalid CSV file format")
        
    model = app_state["model"]
    processed = 0
    high_risk = 0
    
    for _, row in df.iterrows():
        pid = int(row.get("project_id"))
        
        # Check if exists
        proj = db.query(Project).filter(Project.project_id == pid).first()
        if not proj:
            proj = Project(project_id=pid)
            db.add(proj)
            
        proj.project_name = row.get("project_name", f"Project #{pid}")
        proj.district = row.get("district")
        proj.project_type = row.get("project_type")
        proj.total_acres = float(row.get("total_acres", 0))
        proj.land_acquired_pct = float(row.get("land_acquired_pct", 0))
        proj.approval_days_pending = int(row.get("approval_days_pending", 0))
        proj.compensation_disbursed_pct = float(row.get("compensation_disbursed_pct", 0))
        proj.legal_cases_count = int(row.get("legal_cases_count", 0))
        proj.ownership_disputes = int(row.get("ownership_disputes", 0))
        proj.rnp_progress_pct = float(row.get("rnp_progress_pct", 0))
        proj.possession_pct = float(row.get("possession_pct", 0))
        proj.affected_families = int(row.get("affected_families", 0))
        proj.doc_deficiency_score = float(row.get("doc_deficiency_score", 0))
        proj.historical_district_delay_avg = float(row.get("historical_district_delay_avg", 0))
        
        # Predict
        p_input = ProjectInput(**{
            k: getattr(proj, k) for k in [
                "project_id", "district", "project_type", "total_acres", "land_acquired_pct",
                "approval_days_pending", "compensation_disbursed_pct", "legal_cases_count",
                "ownership_disputes", "rnp_progress_pct", "possession_pct", "affected_families",
                "doc_deficiency_score", "historical_district_delay_avg"
            ]
        })
        input_array = _prepare_input(p_input, app_state)
        proba = model.predict_proba(input_array)[0][1]
        risk_score = round(float(proba) * 100, 1)
        
        proj.risk_score = risk_score
        proj.risk_category = _categorize_risk(risk_score)
        
        if risk_score >= 50:
            high_risk += 1
            
        processed += 1
        
    db.commit()
    
    # Audit log
    audit = AuditLog(
        username=user["username"],
        role=user["role"],
        action="CSV Ingestion",
        details=f"Ingested {processed} projects. {high_risk} marked as high risk."
    )
    db.add(audit)
    db.commit()
    
    return IngestResponse(
        message="Ingestion complete",
        processed_count=processed,
        high_risk_count=high_risk
    )

@router.post("/ingest/webhook")
async def ingest_webhook(
    payload: Dict[str, Any],
    db: Session = Depends(get_db)
):
    """Simulates receiving a webhook from NHAI/DILRMP"""
    return {"status": "accepted", "message": "Webhook processed (Simulation)"}
