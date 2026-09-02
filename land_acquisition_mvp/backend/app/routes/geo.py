"""
geo.py - Geospatial Endpoint (V2)
==================================
Returns GeoJSON FeatureCollection directly from the database.
"""
from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
import numpy as np

from app.database import get_db, Project

router = APIRouter()

# Jitter logic for SQLite fallback since we don't have PostGIS ST_X/ST_Y
DISTRICT_COORDS = {
    "Mumbai":     {"lat": 19.0760, "lon": 72.8777},
    "Pune":       {"lat": 18.5204, "lon": 73.8567},
    "Nagpur":     {"lat": 21.1458, "lon": 79.0882},
    "Nashik":     {"lat": 19.9975, "lon": 73.7898},
    "Aurangabad": {"lat": 19.8762, "lon": 75.3433},
}

@router.get("/projects/geo")
@router.get("/geo/projects")
async def get_projects_geo(db: Session = Depends(get_db)):
    projects = db.query(Project).all()
    
    features = []
    np.random.seed(42)
    
    for p in projects:
        # Get coords
        lat = p.lat
        lon = p.lon
        
        if lat is None or lon is None:
            center = DISTRICT_COORDS.get(p.district, {"lat": 19.0, "lon": 73.0})
            lat = center["lat"] + np.random.uniform(-0.15, 0.15)
            lon = center["lon"] + np.random.uniform(-0.15, 0.15)
            
        features.append({
            "type": "Feature",
            "geometry": {
                "type": "Point",
                "coordinates": [round(lon, 6), round(lat, 6)]
            },
            "properties": {
                "project_id": abs(int(p.project_id)),
                "project_name": p.project_name,
                "district": p.district,
                "project_type": p.project_type,
                "total_acres": abs(float(p.total_acres or 0.0)),
                "risk_score": abs(float(p.risk_score)) if p.risk_score else 0.0,
                "risk_category": p.risk_category if p.risk_category else "Unknown",
                "intervention_taken": p.intervention_taken,
                # Additional fields for the frontend table
                "compensation_disbursed_pct": abs(float(p.compensation_disbursed_pct or 0.0)),
                "legal_cases_count": abs(int(p.legal_cases_count or 0)),
                "ownership_disputes": abs(int(p.ownership_disputes or 0)),
                "approval_days_pending": abs(int(p.approval_days_pending or 0)),
                "rnp_progress_pct": abs(float(p.rnp_progress_pct or 0.0)),
                "possession_pct": abs(float(p.possession_pct or 0.0)),
                "doc_deficiency_score": abs(float(p.doc_deficiency_score or 0.0)),
                "affected_families": abs(int(p.affected_families or 0)),
                "historical_district_delay_avg": abs(float(p.historical_district_delay_avg or 0.0)),
                "land_acquired_pct": abs(float(p.land_acquired_pct or 0.0))
            }
        })
        
    return {
        "type": "FeatureCollection",
        "features": features
    }
