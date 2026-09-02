"""
main.py - FastAPI Application Entry Point (V2)
==============================================
Operational platform entry point. Loads ML artifacts, DB schema, 
seeds ongoing projects, and includes all 8 operational routes.
Optimized for native Python 3 deployment on Render.
"""

import os
import sys
from contextlib import asynccontextmanager

import joblib
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

# Ensure ML and backend root directories are in sys.path
ML_DIR = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", "..", "ml"))
BACKEND_DIR = os.path.abspath(os.path.join(os.path.dirname(__file__), ".."))

if ML_DIR not in sys.path:
    sys.path.insert(0, ML_DIR)
if BACKEND_DIR not in sys.path:
    sys.path.insert(0, BACKEND_DIR)

from explainer import SHAPExplainer
from app.database import Base, engine
from seed_database import seed_projects

app_state = {}


@asynccontextmanager
async def lifespan(app: FastAPI):
    # 1. Create database tables
    print("[STARTUP] Initializing database...", flush=True)
    try:
        Base.metadata.create_all(bind=engine)
    except Exception as e:
        print(f"[ERROR] Database initialization failed: {e}", flush=True)
        raise

    model_path = os.path.join(ML_DIR, "delay_model.pkl")
    encoder_path = os.path.join(ML_DIR, "encoder.pkl")
    columns_path = os.path.join(ML_DIR, "feature_columns.pkl")

    # 2. Load ML model
    print("[STARTUP] Loading ML model...", flush=True)
    try:
        app_state["model"] = joblib.load(model_path)
    except Exception as e:
        print(f"[ERROR] Loading ML model failed: {e}", flush=True)
        raise

    # 3. Load encoder
    print("[STARTUP] Loading encoder...", flush=True)
    try:
        app_state["encoder"] = joblib.load(encoder_path)
    except Exception as e:
        print(f"[ERROR] Loading encoder failed: {e}", flush=True)
        raise

    # 4. Load feature columns
    print("[STARTUP] Loading feature columns...", flush=True)
    try:
        app_state["feature_columns"] = joblib.load(columns_path)
    except Exception as e:
        print(f"[ERROR] Loading feature columns failed: {e}", flush=True)
        raise

    # 5. Initialize SHAP explainer
    print("[STARTUP] Initializing SHAP...", flush=True)
    try:
        app_state["shap_explainer"] = SHAPExplainer()
    except Exception as e:
        print(f"[ERROR] Initializing SHAP failed: {e}", flush=True)
        raise

    # 6. Seed ongoing projects into database
    print("[STARTUP] Seeding project database...", flush=True)
    try:
        seed_projects()
    except Exception as e:
        print(f"[ERROR] Seeding project database failed: {e}", flush=True)
        raise

    # 7. Mark application ready
    print("[STARTUP] Application ready", flush=True)

    yield

    app_state.clear()
    print("[INFO] Cleaned up ML artifacts.", flush=True)


app = FastAPI(
    title="Land Acquisition Command Center",
    description="Operational Early-Warning Platform for SIH 2026",
    version="2.0.0",
    lifespan=lifespan,
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.get("/health")
async def health_check():
    """Reports actual dynamic inference readiness calculated from runtime state."""
    model_loaded = "model" in app_state and app_state["model"] is not None
    encoder_loaded = "encoder" in app_state and app_state["encoder"] is not None
    feature_columns_loaded = "feature_columns" in app_state and app_state["feature_columns"] is not None
    shap_loaded = "shap_explainer" in app_state and app_state["shap_explainer"] is not None

    prediction_ready = bool(
        model_loaded and encoder_loaded and feature_columns_loaded and shap_loaded
    )
    status = "operational" if prediction_ready else "degraded"

    return {
        "status": status,
        "model_loaded": model_loaded,
        "encoder_loaded": encoder_loaded,
        "feature_columns_loaded": feature_columns_loaded,
        "shap_loaded": shap_loaded,
        "prediction_ready": prediction_ready,
        "version": "2.0.0",
    }


# ── Routers ──
from app.routes.auth import router as auth_router
from app.routes.ingest import router as ingest_router
from app.routes.status import router as status_router
from app.routes.alerts import router as alerts_router
from app.routes.geo import router as geo_router
from app.routes.predict import router as predict_router
from app.routes.whatif import router as whatif_router
from app.routes.feedback import router as feedback_router
from app.routes.model_health import router as model_health_router

app.include_router(auth_router, tags=["Auth"])
app.include_router(ingest_router, tags=["Ingest"])
app.include_router(status_router, tags=["Intervention Tracker"])
app.include_router(alerts_router, tags=["Alerts"])
app.include_router(geo_router, tags=["GIS"])
app.include_router(predict_router, tags=["Prediction"])
app.include_router(whatif_router, tags=["Simulator"])
app.include_router(feedback_router, tags=["Learning Loop"])
app.include_router(model_health_router, tags=["Model Governance"])
