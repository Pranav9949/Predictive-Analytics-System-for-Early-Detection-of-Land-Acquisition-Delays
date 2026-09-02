"""
predict.py - Early-Warning Delay Prediction Endpoint (SIH 2026)
================================================================
Evaluates project delay probability using trained XGBoost classifier.
Calculates SHAP explainability drivers (risk-increasing vs protective),
evaluates 6-stage lifecycle vulnerabilities, and produces dynamic administrative
recommendations.
Strictly prevents data leakage by isolating the 13 prediction-time features.
"""

import os
import sys
import re
from typing import List, Dict, Any, Optional
import numpy as np
import pandas as pd
from fastapi import APIRouter, HTTPException, Depends
from sqlalchemy.orm import Session
from sqlalchemy import or_, and_, cast, String

from app.models import ProjectInput, PredictionResponse, SHAPDriver, StageRisk, ProjectSearchResult
from app.database import get_db, Project

ML_DIR = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", "..", "..", "ml"))
if ML_DIR not in sys.path:
    sys.path.insert(0, ML_DIR)

from train_model import compute_stage_risks, get_risk_category, NUMERIC_COLS, CATEGORICAL_COLS

_categorize_risk = get_risk_category

router = APIRouter()


def _prepare_input(project: ProjectInput, app_state: dict) -> tuple[np.ndarray, dict]:
    """
    Extract ONLY the 13 prediction-time features using strictly absolute values.
    Guarantees no target or outcome column enters the pipeline.
    """
    encoder = app_state["encoder"]

    # Normalize doc_deficiency_score if given as percentage 0-100
    doc_score = abs(float(project.doc_deficiency_score))
    if doc_score > 1.0:
        doc_score = doc_score / 100.0

    numeric_values = [
        abs(float(project.total_acres)),
        abs(float(project.land_acquired_pct)),
        abs(int(project.approval_days_pending)),
        abs(float(project.compensation_disbursed_pct)),
        abs(int(project.legal_cases_count)),
        abs(int(project.ownership_disputes)),
        abs(float(project.rnp_progress_pct)),
        abs(float(project.possession_pct)),
        abs(int(project.affected_families)),
        abs(doc_score),
        abs(float(project.historical_district_delay_avg)),
    ]

    cat_df = pd.DataFrame([[project.district, project.project_type]], columns=CATEGORICAL_COLS)
    cat_encoded = encoder.transform(cat_df)

    input_array = np.hstack([np.array(numeric_values).reshape(1, -1), cat_encoded])

    feature_dict = {
        "district": project.district,
        "project_type": project.project_type,
        "total_acres": abs(float(project.total_acres)),
        "land_acquired_pct": abs(float(project.land_acquired_pct)),
        "approval_days_pending": abs(int(project.approval_days_pending)),
        "compensation_disbursed_pct": abs(float(project.compensation_disbursed_pct)),
        "legal_cases_count": abs(int(project.legal_cases_count)),
        "ownership_disputes": abs(int(project.ownership_disputes)),
        "rnp_progress_pct": abs(float(project.rnp_progress_pct)),
        "possession_pct": abs(float(project.possession_pct)),
        "affected_families": abs(int(project.affected_families)),
        "doc_deficiency_score": round(abs(doc_score), 3),
        "historical_district_delay_avg": abs(float(project.historical_district_delay_avg)),
    }

    return input_array, feature_dict


def generate_recommendations(
    project: ProjectInput,
    top_drivers: List[Dict[str, Any]],
    stage_risks: Dict[str, Any]
) -> List[str]:
    """
    Dynamic Administrative Recommendation Engine.
    Synthesizes current project parameters with the strongest SHAP risk drivers
    to produce prioritized, highly actionable administrative directives.
    """
    recs: List[str] = []
    top_driver_features = [d.get("raw_feature", "") for d in top_drivers[:4]]
    driver_text = " ".join(top_driver_features)

    doc_score = float(project.doc_deficiency_score)
    if doc_score > 1.0:
        doc_score = doc_score / 100.0

    # Rule 1: Compensation Bottleneck
    if project.compensation_disbursed_pct < 50 or "compensation_disbursed_pct" in driver_text:
        recs.append(
            f"Prioritize pending compensation disbursement (currently at {project.compensation_disbursed_pct}%): "
            "Convene an emergency DBT release camp with the District Collector and designated bank branch."
        )

    # Rule 2: Legal Disputes
    if project.legal_cases_count >= 4 or "legal_cases_count" in driver_text:
        recs.append(
            f"Escalate unresolved legal matters ({project.legal_cases_count} active cases): "
            "Organize a Special Land Lok Adalat and depute government pleaders for expedited disposal."
        )

    # Rule 3: Approval Delay
    if project.approval_days_pending >= 60 or "approval_days_pending" in driver_text:
        recs.append(
            f"Expedite competent-authority approval ({project.approval_days_pending} days pending): "
            "Escalate to the State High-Level Clearance Committee (HLCC) via the single-window fast-track portal."
        )

    # Rule 4: Documentation Deficiency
    if doc_score >= 0.35 or "doc_deficiency_score" in driver_text:
        recs.append(
            f"Remediate documentation deficiencies ({round(doc_score * 100, 1)}% deficiency score): "
            "Deploy a Special Revenue Talathi camp for parcel survey verification and title deed rectification."
        )

    # Rule 5: Ownership Disputes
    if project.ownership_disputes >= 4 or "ownership_disputes" in driver_text:
        recs.append(
            f"Mediate title and boundary disputes ({project.ownership_disputes} disputes flagged): "
            "Initiate Sub-Divisional Officer (SDO) conciliation sessions before final section 23 award."
        )

    # Rule 6: Rehabilitation & Resettlement Lag
    if project.rnp_progress_pct < 50 or "rnp_progress_pct" in driver_text:
        recs.append(
            f"Accelerate R&R package deployment ({project.rnp_progress_pct}% completed): "
            "Fast-track civic infrastructure contracts and allotment letters for affected families."
        )

    # Rule 7: Physical Possession Barriers
    if project.possession_pct < 50 or "possession_pct" in driver_text:
        recs.append(
            f"Secure physical site possession ({project.possession_pct}% in hand): "
            "Coordinate joint revenue-police demarcation drives for encumbrance-free parcels."
        )

    # Fallback if no specific condition triggered
    if not recs:
        recs.append(
            "Maintain regular bi-weekly monitoring of milestones. Current parameters indicate stable trajectory."
        )

    return recs[:4]  # Return top 4 prioritized actions


@router.post("/predict", response_model=PredictionResponse)
async def predict_delay(
    project: ProjectInput,
    db: Session = Depends(get_db)
):
    """
    Early-warning delay prediction endpoint.
    Answers: 'Based on the current state of this project, how likely is it to experience a future delay?'
    """
    from app.main import app_state
    if "model" not in app_state:
        raise HTTPException(status_code=503, detail="ML model artifacts not loaded.")

    model = app_state["model"]
    shap_explainer = app_state["shap_explainer"]

    # 1. Prepare strictly the 13 prediction-time features
    input_array, feature_dict = _prepare_input(project, app_state)

    # 2. Predict probability via trained XGBoost model
    # delay_probability = model.predict_proba(X)[1]
    prob_delayed = float(model.predict_proba(input_array)[0][1])
    risk_score = round(prob_delayed * 100.0, 1)
    risk_category = get_risk_category(risk_score)

    # 3. SHAP Explainability: Separate risk drivers vs protective factors
    shap_result = shap_explainer.explain(input_array, feature_value_dict=feature_dict, top_n=5)
    top_risk_drivers = shap_result["top_risk_drivers"]
    protective_factors = shap_result["protective_factors"]
    base_probability = round(float(shap_result.get("base_value", 0.0)), 3)

    # Backward-compatible SHAP driver objects
    top_drivers_legacy = [
        SHAPDriver(
            feature=d["feature"],
            raw_feature=d["raw_feature"],
            shap_value=d["shap_value"],
            direction=d["direction"],
            value=d.get("value"),
            impact=d.get("impact"),
        )
        for d in top_risk_drivers
    ]

    # 4. Transparent 6-Stage Lifecycle Risk Assessment
    raw_stage_data = compute_stage_risks(feature_dict)
    stage_risks_dict = {
        k: v for k, v in raw_stage_data.items()
        if k in ["Notification", "Documentation", "Approval", "Compensation", "R&R", "Possession"]
    }

    stage_risks_list = [
        {
            "stage": stage_name,
            "risk": data["score"],
            "category": data["category"],
            "description": data["description"],
        }
        for stage_name, data in stage_risks_dict.items()
    ]

    # 5. Dynamic Administrative Recommendations
    recommendations = generate_recommendations(project, top_risk_drivers, stage_risks_dict)
    primary_recommendation = recommendations[0] if recommendations else "Review project parameters."

    # 6. If project exists in DB, update cached prediction (auditing/operational cache)
    if project.project_id is not None:
        proj = db.query(Project).filter(Project.project_id == project.project_id).first()
        if proj:
            proj.risk_score = risk_score
            proj.risk_category = risk_category
            db.commit()

    return PredictionResponse(
        delay_probability=round(prob_delayed, 4),
        risk_score=risk_score,
        risk_category=risk_category,
        category=risk_category,  # Backward compatibility
        top_risk_drivers=top_risk_drivers,
        top_drivers=top_drivers_legacy,  # Backward compatibility
        protective_factors=protective_factors,
        recommendations=recommendations,
        recommendation=primary_recommendation,  # Backward compatibility
        stage_risks=stage_risks_dict,
        stage_risks_list=stage_risks_list,
        base_probability=base_probability,
    )


@router.get("/projects/search", response_model=List[ProjectSearchResult])
async def search_projects(
    q: Optional[str] = "",
    limit: int = 15,
    db: Session = Depends(get_db)
):
    """
    Search existing project records by Project ID, District, Project Type, or Name.
    Returns 13 prediction parameters ready for auto-population.
    """
    query_str = (q or "").strip()
    target_pid = None
    if not query_str:
        projects = db.query(Project).limit(limit).all()
    else:
        filters = []
        digits = re.findall(r'\d+', query_str)
        if digits:
            try:
                # If digits like '2026-184' or '184', the specific project ID is usually the last number
                target_pid = int(digits[-1])
                filters.append(Project.project_id == target_pid)
            except ValueError:
                pass

        tokens = query_str.split()
        if len(tokens) > 1:
            token_filters = []
            for t in tokens:
                token_filters.append(or_(
                    Project.project_name.ilike(f"%{t}%"),
                    Project.district.ilike(f"%{t}%"),
                    Project.project_type.ilike(f"%{t}%"),
                    cast(Project.project_id, String).ilike(f"%{t}%")
                ))
            filters.append(and_(*token_filters))
        else:
            filters.append(or_(
                Project.project_name.ilike(f"%{query_str}%"),
                Project.district.ilike(f"%{query_str}%"),
                Project.project_type.ilike(f"%{query_str}%"),
                cast(Project.project_id, String).ilike(f"%{query_str}%")
            ))

        projects = db.query(Project).filter(or_(*filters)).limit(limit * 2).all()

        # Prioritize exact ID match, then name prefix matches
        if target_pid is not None:
            projects = sorted(projects, key=lambda p: (0 if p.project_id == target_pid else 1))
        projects = projects[:limit]

    results = []
    for p in projects:
        doc_pct = abs(round(p.doc_deficiency_score * 100, 1) if (p.doc_deficiency_score is not None and p.doc_deficiency_score <= 1.0) else (p.doc_deficiency_score or 0.0))
        risk_score = abs(float(p.risk_score)) if p.risk_score is not None else None
        risk_cat = p.risk_category
        if (not risk_cat or risk_cat == "Unknown") and risk_score is not None:
            risk_cat = get_risk_category(risk_score)

        results.append(
            ProjectSearchResult(
                project_id=p.project_id,
                formatted_id=f"PRJ-2026-{p.project_id:04d}",
                project_name=p.project_name or f"Project #{p.project_id}",
                district=p.district or "Pune",
                project_type=p.project_type or "Highway",
                total_acres=abs(float(p.total_acres or 0.0)),
                land_acquired_pct=abs(float(p.land_acquired_pct or 0.0)),
                approval_days_pending=abs(int(p.approval_days_pending or 0)),
                compensation_disbursed_pct=abs(float(p.compensation_disbursed_pct or 0.0)),
                legal_cases_count=abs(int(p.legal_cases_count or 0)),
                ownership_disputes=abs(int(p.ownership_disputes or 0)),
                rnp_progress_pct=abs(float(p.rnp_progress_pct or 0.0)),
                possession_pct=abs(float(p.possession_pct or 0.0)),
                affected_families=abs(int(p.affected_families or 0)),
                doc_deficiency_score=abs(float(doc_pct)),
                historical_district_delay_avg=abs(float(p.historical_district_delay_avg or 0.0)),
                risk_score=risk_score,
                risk_category=risk_cat or "Unknown",
            )
        )

    return results


@router.get("/projects/{project_id}", response_model=ProjectSearchResult)
async def get_project_by_id(
    project_id: int,
    db: Session = Depends(get_db)
):
    """
    Get a single project record by its primary key ID with strictly absolute values.
    """
    p = db.query(Project).filter(Project.project_id == project_id).first()
    if not p:
        raise HTTPException(status_code=404, detail="Project not found")

    doc_pct = abs(round(p.doc_deficiency_score * 100, 1) if (p.doc_deficiency_score is not None and p.doc_deficiency_score <= 1.0) else (p.doc_deficiency_score or 0.0))
    risk_score = abs(float(p.risk_score)) if p.risk_score is not None else None
    return ProjectSearchResult(
        project_id=p.project_id,
        formatted_id=f"PRJ-2026-{p.project_id:04d}",
        project_name=p.project_name or f"Project #{p.project_id}",
        district=p.district or "Pune",
        project_type=p.project_type or "Highway",
        total_acres=abs(float(p.total_acres or 0.0)),
        land_acquired_pct=abs(float(p.land_acquired_pct or 0.0)),
        approval_days_pending=abs(int(p.approval_days_pending or 0)),
        compensation_disbursed_pct=abs(float(p.compensation_disbursed_pct or 0.0)),
        legal_cases_count=abs(int(p.legal_cases_count or 0)),
        ownership_disputes=abs(int(p.ownership_disputes or 0)),
        rnp_progress_pct=abs(float(p.rnp_progress_pct or 0.0)),
        possession_pct=abs(float(p.possession_pct or 0.0)),
        affected_families=abs(int(p.affected_families or 0)),
        doc_deficiency_score=abs(float(doc_pct)),
        historical_district_delay_avg=abs(float(p.historical_district_delay_avg or 0.0)),
        risk_score=risk_score,
        risk_category=p.risk_category or "Unknown",
    )

