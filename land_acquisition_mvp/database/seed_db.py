"""
seed_db.py — Database Seeder
==============================
Reads the generated CSV data and inserts it into the PostGIS
database with randomly jittered coordinates per district.
"""

import os
import sys
import numpy as np
import pandas as pd
from sqlalchemy import create_engine, text

# ──────────────────────────────────────────────────────────────
# Configuration
# ──────────────────────────────────────────────────────────────
DATABASE_URL = os.environ.get(
    "DATABASE_URL",
    "postgresql://postgres:postgres@localhost:5432/land_acquisition",
)

ML_DIR = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", "ml"))
CSV_PATH = os.path.join(ML_DIR, "land_data.csv")

# District center coordinates (Maharashtra, India)
DISTRICT_COORDS = {
    "Mumbai":     {"lat": 19.0760, "lon": 72.8777},
    "Pune":       {"lat": 18.5204, "lon": 73.8567},
    "Nagpur":     {"lat": 21.1458, "lon": 79.0882},
    "Nashik":     {"lat": 19.9975, "lon": 73.7898},
    "Aurangabad": {"lat": 19.8762, "lon": 75.3433},
}

np.random.seed(42)


def seed_database():
    """Load CSV data and insert into PostGIS database."""

    # ── 1. Load CSV ──────────────────────────────────────────
    print(f"📂 Loading data from {CSV_PATH}...")
    if not os.path.exists(CSV_PATH):
        print("❌ CSV not found. Run generate_data.py first.")
        sys.exit(1)

    df = pd.read_csv(CSV_PATH)
    print(f"   Loaded {len(df)} rows.")

    # ── 2. Connect to Database ───────────────────────────────
    print(f"🔌 Connecting to database...")
    try:
        engine = create_engine(DATABASE_URL)
        with engine.connect() as conn:
            conn.execute(text("SELECT 1"))
        print("   ✅ Connected.")
    except Exception as e:
        print(f"   ❌ Connection failed: {e}")
        print("   Make sure PostgreSQL + PostGIS is running.")
        sys.exit(1)

    # ── 3. Insert Data with Coordinates ──────────────────────
    print("📥 Inserting data...")
    insert_sql = text("""
        INSERT INTO projects (
            project_id, district, project_type, total_acres,
            land_acquired_pct, approval_days_pending, compensation_disbursed_pct,
            legal_cases_count, ownership_disputes, rnp_progress_pct,
            possession_pct, affected_families, doc_deficiency_score,
            historical_district_delay_avg, delay_label, geom
        ) VALUES (
            :project_id, :district, :project_type, :total_acres,
            :land_acquired_pct, :approval_days_pending, :compensation_disbursed_pct,
            :legal_cases_count, :ownership_disputes, :rnp_progress_pct,
            :possession_pct, :affected_families, :doc_deficiency_score,
            :historical_district_delay_avg, :delay_label,
            ST_SetSRID(ST_MakePoint(:lon, :lat), 4326)
        )
        ON CONFLICT (project_id) DO NOTHING
    """)

    inserted = 0
    with engine.begin() as conn:
        for _, row in df.iterrows():
            # Generate jittered coordinates
            center = DISTRICT_COORDS.get(
                row["district"], {"lat": 19.0, "lon": 73.0}
            )
            lat = center["lat"] + np.random.uniform(-0.15, 0.15)
            lon = center["lon"] + np.random.uniform(-0.15, 0.15)

            conn.execute(insert_sql, {
                "project_id": int(row["project_id"]),
                "district": row["district"],
                "project_type": row["project_type"],
                "total_acres": float(row["total_acres"]),
                "land_acquired_pct": float(row["land_acquired_pct"]),
                "approval_days_pending": int(row["approval_days_pending"]),
                "compensation_disbursed_pct": float(row["compensation_disbursed_pct"]),
                "legal_cases_count": int(row["legal_cases_count"]),
                "ownership_disputes": int(row["ownership_disputes"]),
                "rnp_progress_pct": float(row["rnp_progress_pct"]),
                "possession_pct": float(row["possession_pct"]),
                "affected_families": int(row["affected_families"]),
                "doc_deficiency_score": float(row["doc_deficiency_score"]),
                "historical_district_delay_avg": float(row["historical_district_delay_avg"]),
                "delay_label": int(row["delay_label"]),
                "lat": round(lat, 6),
                "lon": round(lon, 6),
            })
            inserted += 1

            if inserted % 500 == 0:
                print(f"   Inserted {inserted}/{len(df)}...")

    print(f"✅ Successfully seeded {inserted} projects into the database.")


if __name__ == "__main__":
    seed_database()
