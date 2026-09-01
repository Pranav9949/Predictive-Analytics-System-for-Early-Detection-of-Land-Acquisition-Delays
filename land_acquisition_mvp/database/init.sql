-- ============================================================
-- init.sql — PostGIS Database Initialization (V2)
-- ============================================================
-- Creates tables for the Operational Early-Warning Platform
-- ============================================================

CREATE EXTENSION IF NOT EXISTS postgis;

-- 1. Projects Table
DROP TABLE IF EXISTS projects CASCADE;
CREATE TABLE projects (
    project_id      INTEGER PRIMARY KEY,
    project_name    VARCHAR(255),
    district        VARCHAR(50) NOT NULL,
    project_type    VARCHAR(50) NOT NULL,
    total_acres     NUMERIC(10, 2),
    land_acquired_pct       NUMERIC(5, 2),
    approval_days_pending   INTEGER,
    compensation_disbursed_pct  NUMERIC(5, 2),
    legal_cases_count       INTEGER,
    ownership_disputes      INTEGER,
    rnp_progress_pct        NUMERIC(5, 2),
    possession_pct          NUMERIC(5, 2),
    affected_families       INTEGER,
    doc_deficiency_score    NUMERIC(4, 3),
    historical_district_delay_avg NUMERIC(6, 2),
    
    -- Predictions
    risk_score              NUMERIC(5, 2),
    predicted_delay_days    INTEGER,
    risk_category           VARCHAR(20),
    
    -- Interventions & Feedback
    intervention_taken      TEXT,
    intervention_date       TIMESTAMP,
    actual_delay_days       INTEGER,
    
    -- PostGIS geometry
    geom            geometry(Point, 4326),

    created_at      TIMESTAMP DEFAULT NOW(),
    updated_at      TIMESTAMP DEFAULT NOW()
);

-- Indexes
CREATE INDEX idx_projects_district ON projects (district);
CREATE INDEX idx_projects_risk ON projects (risk_score);
CREATE INDEX idx_projects_geom ON projects USING GIST (geom);

-- 2. Audit Logs
DROP TABLE IF EXISTS audit_logs CASCADE;
CREATE TABLE audit_logs (
    id              SERIAL PRIMARY KEY,
    timestamp       TIMESTAMP DEFAULT NOW(),
    username        VARCHAR(100),
    role            VARCHAR(50),
    action          VARCHAR(255),
    project_id      INTEGER REFERENCES projects(project_id),
    details         TEXT
);

-- 3. Model Performance Log
DROP TABLE IF EXISTS model_performance_log CASCADE;
CREATE TABLE model_performance_log (
    id              SERIAL PRIMARY KEY,
    timestamp       TIMESTAMP DEFAULT NOW(),
    accuracy        NUMERIC(5, 4),
    f1_score        NUMERIC(5, 4),
    roc_auc         NUMERIC(5, 4),
    trigger_reason  VARCHAR(255),
    train_size      INTEGER
);
