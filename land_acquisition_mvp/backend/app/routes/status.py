"""
status.py - Intervention Tracker
"""
from datetime import datetime
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from app.database import get_db, Project, AuditLog
from app.models import InterventionUpdate
from app.auth import get_current_user, require_role

router = APIRouter()

@router.put("/projects/status")
async def update_intervention(
    update: InterventionUpdate,
    db: Session = Depends(get_db),
    user: dict = Depends(require_role(["LAO", "Collector"]))
):
    proj = db.query(Project).filter(Project.project_id == update.project_id).first()
    if not proj:
        raise HTTPException(status_code=404, detail="Project not found")
        
    proj.intervention_taken = update.intervention_taken
    proj.intervention_date = datetime.now()
    
    # Audit log
    audit = AuditLog(
        username=user["username"],
        role=user["role"],
        action="Intervention Update",
        project_id=update.project_id,
        details=f"Intervention recorded: {update.intervention_taken}"
    )
    db.add(audit)
    db.commit()
    
    return {"message": "Intervention updated successfully", "project_id": update.project_id}
