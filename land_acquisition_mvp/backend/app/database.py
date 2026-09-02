"""
database.py - Database Connection and SQLAlchemy ORM Models
=============================================================
Provides SQLite fallback if PostgreSQL is not available.
"""

import os
from sqlalchemy import create_engine, Column, Integer, String, Float, DateTime, Text, Boolean
from sqlalchemy.orm import declarative_base, sessionmaker
from sqlalchemy.sql import func

# Use SQLite by default for easy demo if DATABASE_URL is missing
# Stable absolute path to backend/land_acquisition.db avoids duplicate DBs across cwd
BACKEND_DIR = os.path.abspath(os.path.join(os.path.dirname(__file__), ".."))
DEFAULT_DB_FILE = os.path.join(BACKEND_DIR, "land_acquisition.db").replace("\\", "/")
DEFAULT_URL = f"sqlite:///{DEFAULT_DB_FILE}"
DATABASE_URL = os.environ.get("DATABASE_URL", DEFAULT_URL)

engine = create_engine(
    DATABASE_URL, 
    connect_args={"check_same_thread": False} if "sqlite" in DATABASE_URL else {}
)

SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
Base = declarative_base()

# ── Dependency ──
def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()


# ── ORM Models ──

class Project(Base):
    __tablename__ = "projects"

    project_id = Column(Integer, primary_key=True, index=True)
    project_name = Column(String, index=True)
    district = Column(String, index=True)
    project_type = Column(String)
    
    total_acres = Column(Float)
    land_acquired_pct = Column(Float)
    approval_days_pending = Column(Integer)
    compensation_disbursed_pct = Column(Float)
    legal_cases_count = Column(Integer)
    ownership_disputes = Column(Integer)
    rnp_progress_pct = Column(Float)
    possession_pct = Column(Float)
    affected_families = Column(Integer)
    doc_deficiency_score = Column(Float)
    historical_district_delay_avg = Column(Float)
    
    # ML Outputs & Actuals
    risk_score = Column(Float, index=True)
    predicted_delay_days = Column(Integer)
    risk_category = Column(String)
    delay_label = Column(Integer) # From historical data if known
    
    # Intervention & Feedback
    intervention_taken = Column(Text, nullable=True)
    intervention_date = Column(DateTime, nullable=True)
    actual_delay_days = Column(Integer, nullable=True) # Populated on completion
    
    # Geo coords for SQLite fallback (PostGIS usually handles this, but we store flat for SQLite)
    lat = Column(Float, nullable=True)
    lon = Column(Float, nullable=True)

class AuditLog(Base):
    __tablename__ = "audit_logs"

    id = Column(Integer, primary_key=True, index=True)
    timestamp = Column(DateTime, server_default=func.now())
    username = Column(String)
    role = Column(String)
    action = Column(String)
    project_id = Column(Integer, index=True)
    details = Column(Text)

class ModelPerformanceLog(Base):
    __tablename__ = "model_performance_log"

    id = Column(Integer, primary_key=True, index=True)
    timestamp = Column(DateTime, server_default=func.now())
    accuracy = Column(Float)
    f1_score = Column(Float)
    roc_auc = Column(Float)
    trigger_reason = Column(String)
    train_size = Column(Integer)

# Create tables if using SQLite (PostGIS is handled by init.sql)
if "sqlite" in DATABASE_URL:
    Base.metadata.create_all(bind=engine)
