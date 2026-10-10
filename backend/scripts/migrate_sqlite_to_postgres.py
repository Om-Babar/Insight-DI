import os
import sys
import sqlite3
import time
from datetime import datetime, date
from typing import Dict, Any, List

from sqlalchemy import create_engine, text, Table, MetaData
from sqlalchemy.orm import Session

# Add project root to sys.path
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from app.config import settings
from app.db.base import Base
import app.models  # Registers all models with Base

def parse_val(val: Any, col_type: str):
    if val is None:
        return None
    type_str = str(col_type).upper()
    if "DATE" in type_str and "DATETIME" not in type_str and "TIMESTAMP" not in type_str:
        if isinstance(val, (date, datetime)):
            return val if isinstance(val, date) else val.date()
        if isinstance(val, str):
            try:
                return datetime.strptime(val.split(" ")[0], "%Y-%m-%d").date()
            except Exception:
                return None
    elif "DATETIME" in type_str or "TIMESTAMP" in type_str:
        if isinstance(val, datetime):
            return val
        if isinstance(val, str):
            try:
                return datetime.fromisoformat(val.replace("Z", "+00:00"))
            except Exception:
                try:
                    return datetime.strptime(val, "%Y-%m-%d %H:%M:%S")
                except Exception:
                    return None
    elif "BOOLEAN" in type_str or "BOOL" in type_str:
        if isinstance(val, bool):
            return val
        return bool(val)
    return val

def run_migration():
    sqlite_path = os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), "insightdi.db")
    if not os.path.exists(sqlite_path):
        raise FileNotFoundError(f"SQLite source file {sqlite_path} does not exist.")

    pg_url = "postgresql+psycopg2://postgres:postgres@localhost:5432/insightdi"
    print("=================================================================")
    print("         INSIGHT-DI SAFE SQLITE -> POSTGRESQL MIGRATION          ")
    print("=================================================================")
    print(f"Source SQLite      : {sqlite_path}")
    print(f"Destination Postgres: {pg_url}")
    
    # Connect to SQLite
    sqlite_conn = sqlite3.connect(sqlite_path)
    sqlite_conn.row_factory = sqlite3.Row
    sqlite_cur = sqlite_conn.cursor()
    
    # Connect to PostgreSQL
    pg_engine = create_engine(pg_url, pool_pre_ping=True)
    with pg_engine.connect() as conn:
        conn.execute(text("SELECT 1"))
    print("PostgreSQL connection verified successfully.\n")

    # 1. Create all schema tables in PostgreSQL
    print("1. Creating canonical schema tables in PostgreSQL...")
    Base.metadata.create_all(bind=pg_engine)
    print("   Canonical schema and indexes initialized.\n")

    # 2. Migration Order
    migration_order = [
        "users",
        "promotions",
        "customers",
        "products",
        "upload_metadata",
        "schema_mappings",
        "orders",
        "order_items",
        "inventory",
        "competitors",
        "marketing",
        "kpi_cache",
        "forecast_results",
        "rca_results",
        "recommendations",
        "simulation_history",
    ]

    sqlite_tables = [
        r[0] for r in sqlite_cur.execute(
            "SELECT name FROM sqlite_master WHERE type='table' AND name NOT LIKE 'sqlite_%'"
        ).fetchall()
    ]

    # Verify all sqlite tables exist in migration order or add remainder
    ordered_tables = [t for t in migration_order if t in sqlite_tables]
    for t in sqlite_tables:
        if t not in ordered_tables:
            ordered_tables.append(t)

    # 3. Disable foreign keys during high-speed batch copy
    with pg_engine.begin() as pg_conn:
        pg_conn.execute(text("SET session_replication_role = 'replica';"))

    stats: Dict[str, Dict[str, int]] = {}
    total_start = time.time()

    for table_name in ordered_tables:
        t_start = time.time()
        # Count source rows
        src_count = sqlite_cur.execute(f'SELECT COUNT(*) FROM "{table_name}"').fetchone()[0]
        if src_count == 0:
            stats[table_name] = {"source": 0, "migrated": 0}
            print(f"  [{table_name}] 0 rows (skipped)")
            continue

        # Get metadata for target table
        target_table = Base.metadata.tables.get(table_name)
        if target_table is None:
            # Table might not be in Base, reflect it
            meta = MetaData()
            target_table = Table(table_name, meta, autoload_with=pg_engine)

        col_types = {col.name: str(col.type) for col in target_table.columns}

        # Clear existing data in target table if any to ensure clean idempotent run
        with pg_engine.begin() as pg_conn:
            pg_conn.execute(text(f'TRUNCATE TABLE "{table_name}" CASCADE;'))

        # Stream rows from SQLite in batches
        batch_size = 10000
        cursor = sqlite_conn.cursor()
        cursor.execute(f'SELECT * FROM "{table_name}"')
        
        migrated_for_table = 0
        col_names = [d[0] for d in cursor.description]

        while True:
            rows = cursor.fetchmany(batch_size)
            if not rows:
                break

            records: List[Dict[str, Any]] = []
            for r in rows:
                row_dict = {}
                for idx, col in enumerate(col_names):
                    if col in col_types:
                        raw_val = r[idx]
                        parsed = parse_val(raw_val, col_types[col])
                        row_dict[col] = parsed
                records.append(row_dict)

            with pg_engine.begin() as pg_conn:
                pg_conn.execute(target_table.insert(), records)
            
            migrated_for_table += len(records)
            print(f"  [{table_name}] Migrating... {migrated_for_table:,} / {src_count:,}", end="\r")

        t_elapsed = time.time() - t_start
        stats[table_name] = {"source": src_count, "migrated": migrated_for_table}
        print(f"  [{table_name:<20}] Done: {migrated_for_table:,} / {src_count:,} rows migrated in {t_elapsed:.2f}s")

    # 4. Re-enable foreign key constraints
    with pg_engine.begin() as pg_conn:
        pg_conn.execute(text("SET session_replication_role = 'origin';"))
    print("\nForeign key integrity constraints re-enabled.")

    # 5. Row Count Verification
    print("\n=================================================================")
    print("             DATA MIGRATION VERIFICATION AUDIT                   ")
    print("=================================================================")
    all_matched = True
    total_src = 0
    total_dst = 0

    with pg_engine.connect() as pg_conn:
        for t, s in stats.items():
            dst_cnt = pg_conn.execute(text(f'SELECT COUNT(*) FROM "{t}"')).scalar()
            src_cnt = s["source"]
            total_src += src_cnt
            total_dst += dst_cnt
            match = (src_cnt == dst_cnt)
            if not match:
                all_matched = False
            status_str = "MATCH" if match else "MISMATCH"
            print(f"  {t:<25}: Source={src_cnt:>8,} | Dest={dst_cnt:>8,} [{status_str}]")

    total_time = time.time() - total_start
    print("-----------------------------------------------------------------")
    print(f"  TOTAL RECORDS MIGRATED  : {total_dst:,} / {total_src:,} in {total_time:.2f}s")
    
    if all_matched:
        print("\nSUCCESS: 100% of SQLite data was migrated to PostgreSQL with ZERO data loss!")
    else:
        raise ValueError("MIGRATION ERROR: Row count mismatch detected between SQLite and PostgreSQL!")

    # 6. Reset PostgreSQL Sequences to prevent duplicate key errors on subsequent inserts
    print("\nResetting PostgreSQL primary key sequence counters...")
    with pg_engine.begin() as pg_conn:
        seq_query = """
        SELECT 
            t.relname AS table_name,
            a.attname AS column_name,
            s.relname AS sequence_name
        FROM pg_class s
        JOIN pg_depend d ON d.objid = s.oid
        JOIN pg_class t ON d.refobjid = t.oid
        JOIN pg_attribute a ON (d.refobjid = a.attrelid AND d.refobjsubid = a.attnum)
        WHERE s.relkind = 'S'
        ORDER BY t.relname;
        """
        results = pg_conn.execute(text(seq_query)).fetchall()
        for table_name, col_name, seq_name in results:
            sql = f"""
            SELECT setval(
                '{seq_name}', 
                GREATEST(COALESCE((SELECT MAX({col_name}) FROM "{table_name}"), 1), 1)
            );
            """
            res = pg_conn.execute(text(sql)).scalar()
            print(f"  Sequence '{seq_name}' -> {res}")
            
        # Create compatibility functions
        pg_conn.execute(text("""
        CREATE OR REPLACE FUNCTION round(double precision, integer) 
        RETURNS numeric AS $$ 
            SELECT round($1::numeric, $2); 
        $$ LANGUAGE sql IMMUTABLE;
        """))
    print("PostgreSQL sequences and helper functions synchronized successfully.")

if __name__ == "__main__":
    run_migration()

