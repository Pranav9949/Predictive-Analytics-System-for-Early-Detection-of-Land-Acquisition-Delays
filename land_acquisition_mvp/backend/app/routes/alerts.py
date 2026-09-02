"""
alerts.py - Alert Generation
"""
from typing import List
from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from app.database import get_db, Project
from app.models import AlertItem

router = APIRouter()

@router.get("/alerts/trigger", response_model=List[AlertItem])
@router.get("/alerts/critical", response_model=List[AlertItem])
async def get_alerts(db: Session = Depends(get_db)):
    """
    Returns a list of high-risk projects that require immediate attention.
    In a real system, this would compare previous vs current risk scores.
    """
    # Fetch top 10 highest risk projects that have NO intervention taken
    projects = db.query(Project).filter(
        Project.risk_score >= 50,
        (Project.intervention_taken == None) | (Project.intervention_taken == "")
    ).order_by(Project.risk_score.desc()).limit(10).all()
    
    alerts = []
    for p in projects:
        # Determine recommended action based on simple heuristics
        action = "Escalate to District Collector"
        reason = f"Risk score is critically high ({p.risk_score})."
        
        if p.compensation_disbursed_pct < 50:
            action = "Escalate Compensation Disbursement"
            reason = "Compensation disbursement is below 50%."
        elif p.legal_cases_count > 2:
            action = "Schedule Joint Court Hearing"
            reason = f"Active legal cases ({p.legal_cases_count}) causing delays."
            
        alerts.append(AlertItem(
            project_id=p.project_id,
            project_name=p.project_name or f"Project #{p.project_id}",
            district=p.district,
            risk_score=p.risk_score,
            risk_category=p.risk_category or "High",
            alert_message=reason,
            recommended_action=action
        ))
        
    return alerts
