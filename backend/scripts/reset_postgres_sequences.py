import sys
import os

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from sqlalchemy import text
from app.db.session import engine

def reset_sequences():
    with engine.begin() as conn:
        print("Finding all tables with primary key sequences in PostgreSQL...")
        
        # Query all sequences associated with columns
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
        results = conn.execute(text(seq_query)).fetchall()
        print(f"Found {len(results)} sequences.")
        
        for table_name, col_name, seq_name in results:
            # Set sequence to max(col)
            sql = f"""
            SELECT setval(
                '{seq_name}', 
                GREATEST(COALESCE((SELECT MAX({col_name}) FROM "{table_name}"), 1), 1)
            );
            """
            res = conn.execute(text(sql)).scalar()
            print(f"  Reset sequence '{seq_name}' for {table_name}.{col_name} -> {res}")

        # Also specifically check upload_metadata and schema_mappings if not caught
        print("Done resetting PostgreSQL sequences.")

if __name__ == "__main__":
    reset_sequences()
