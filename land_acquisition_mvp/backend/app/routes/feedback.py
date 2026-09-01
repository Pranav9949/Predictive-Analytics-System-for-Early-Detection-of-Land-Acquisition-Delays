"""
feedback.py - Continuous Learning Feedback Loop
"""
import sys
import os
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from app.database import get_db, Project, AuditLog
from app.models import FeedbackInput
from app.auth import get_current_user, require_role

# Import ML script
ML_DIR = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", "..", "..", "ml"))
sys.path.insert(0, ML_DIR)
import continuous_learning

router = APIRouter()

@router.post("/feedback/outcome")
async def submit_feedback(
    feedback: FeedbackInput,
    db: Session = Depends(get_db),
    user: dict = Depends(require_role(["LAO", "Collector"]))
):
    proj = db.query(Project).filter(Project.project_id == feedback.project_id).first()
    if not proj:
        raise HTTPException(status_code=404, detail="Project not found")
        
    proj.actual_delay_days = feedback.actual_delay_days
    
    # Log feedback for continuous learning
    feedback_res = continuous_learning.log_feedback(
        project_id=feedback.project_id,
        predicted_risk=proj.risk_score if proj.risk_score else 0.0,
        actual_delay_days=feedback.actual_delay_days
    )
    
    # Check if we should retrain
    ok, count = continuous_learning.should_retrain()
    retrained = False
    if ok:
        continuous_learning.retrain_model()
        retrained = True
        
    # Audit log
    audit = AuditLog(
        username=user["username"],
        role=user["role"],
        action="Outcome Feedback",
        project_id=feedback.project_id,
        details=f"Feedback submitted. Actual delay: {feedback.actual_delay_days} days."
    )
    db.add(audit)
    db.commit()
    
    return {
        "message": "Feedback submitted successfully",
        "prediction_error": feedback_res["prediction_error"],
        "retraining_triggered": retrained,
        "unused_entries_count": count
    }
