"""
main.py - FastAPI Application Entry Point (V2)
==============================================
Operational platform entry point. Loads ML artifacts, DB schema, 
and includes all 8 operational routes.
"""

import os
import sys
from contextlib import asynccontextmanager

import joblib
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

ML_DIR = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", "..", "ml"))
sys.path.insert(0, ML_DIR)

from explainer import SHAPExplainer
from app.database import Base, engine

# Init DB for SQLite (if applicable)
Base.metadata.create_all(bind=engine)

app_state = {}

@asynccontextmanager
async def lifespan(app: FastAPI):
    print("🚀 Loading ML model artifacts for V2 Platform...")
    
    model_path = os.path.join(ML_DIR, "delay_model.pkl")
    encoder_path = os.path.join(ML_DIR, "encoder.pkl")
    columns_path = os.path.join(ML_DIR, "feature_columns.pkl")
    
    try:
        app_state["model"] = joblib.load(model_path)
        app_state["encoder"] = joblib.load(encoder_path)
        app_state["feature_columns"] = joblib.load(columns_path)
        app_state["shap_explainer"] = SHAPExplainer()
        print("✅ All ML artifacts loaded successfully.")
    except Exception as e:
        print(f"⚠️ ML artifact error: {e}")
        
    yield
    app_state.clear()
    print("🧹 Cleaned up ML artifacts.")

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
    return {"status": "operational", "model_loaded": "model" in app_state, "version": "2.0.0"}

# ── Routers ──
from app.routes.auth import router as auth_router
from app.routes.ingest import router as ingest_router
from app.routes.status import router as status_router
from app.routes.predict import router as predict_router
from app.routes.whatif import router as whatif_router
from app.routes.feedback import router as feedback_router
from app.routes.alerts import router as alerts_router
from app.routes.geo import router as geo_router

app.include_router(auth_router, tags=["Auth"])
app.include_router(ingest_router, tags=["Ingest"])
app.include_router(status_router, tags=["Intervention Tracker"])
app.include_router(predict_router, tags=["Prediction"])
app.include_router(whatif_router, tags=["Simulator"])
app.include_router(feedback_router, tags=["Learning Loop"])
app.include_router(alerts_router, tags=["Alerts"])
app.include_router(geo_router, tags=["GIS"])
