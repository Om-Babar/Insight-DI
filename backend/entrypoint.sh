#!/bin/bash
set -e

echo "=== InsightDI Backend Container Initializing ==="

# Wait for PostgreSQL
python - << 'EOF'
import os, time, sys
from sqlalchemy import create_engine, text

db_url = os.environ.get("DATABASE_URL", "postgresql+psycopg2://postgres:postgres@postgres:5432/insightdi")
print(f"Checking PostgreSQL availability at: {db_url}")

max_attempts = 30
for attempt in range(1, max_attempts + 1):
    try:
        engine = create_engine(db_url, pool_pre_ping=True)
        with engine.connect() as conn:
            conn.execute(text("SELECT 1"))
        print(f"Connected to PostgreSQL successfully on attempt {attempt}!")
        sys.exit(0)
    except Exception as exc:
        print(f"Attempt {attempt}/{max_attempts}: Database not ready yet ({exc}). Retrying in 2s...")
        time.sleep(2)

print("FATAL: Could not connect to PostgreSQL within allocated timeout.")
sys.exit(1)
EOF

# Ensure compatibility functions exist
python - << 'EOF'
import os
from sqlalchemy import create_engine, text

db_url = os.environ.get("DATABASE_URL", "postgresql+psycopg2://postgres:postgres@postgres:5432/insightdi")
engine = create_engine(db_url, pool_pre_ping=True)
try:
    with engine.begin() as conn:
        conn.execute(text("""
        CREATE OR REPLACE FUNCTION round(double precision, integer) 
        RETURNS numeric AS $$ 
            SELECT round($1::numeric, $2); 
        $$ LANGUAGE sql IMMUTABLE;
        """))
    print("PostgreSQL compatibility functions verified.")
except Exception as e:
    print(f"Warning: Could not create helper functions: {e}")
EOF

# Check if data exists; if not, auto-migrate from sqlite directly in Python
python - << 'EOF'
import os, sys
from sqlalchemy import create_engine, text
from scripts.migrate_sqlite_to_postgres import run_migration

db_url = os.environ.get("DATABASE_URL", "postgresql+psycopg2://postgres:postgres@postgres:5432/insightdi")
engine = create_engine(db_url, pool_pre_ping=True)

needs_migration = False
try:
    with engine.connect() as conn:
        res = conn.execute(text("SELECT count(*) FROM information_schema.tables WHERE table_schema='public' AND table_name='products'")).scalar()
        if res == 0:
            needs_migration = True
        else:
            cnt = conn.execute(text("SELECT count(*) FROM products")).scalar()
            if cnt == 0:
                needs_migration = True
except Exception as e:
    print(f"Notice during migration check: {e}")
    needs_migration = True

if needs_migration:
    print("Database tables empty or uninitialized. Triggering SQLite -> PostgreSQL migration...")
    run_migration()
else:
    print("Database already populated. Skipping initial migration.")
EOF

echo "=== Starting InsightDI FastAPI Application ==="
exec uvicorn app.main:app --host 0.0.0.0 --port 8000
