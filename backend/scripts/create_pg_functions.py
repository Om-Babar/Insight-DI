import sys
import os

# Add parent directory to path
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from sqlalchemy import text
from app.db.session import engine

def create_pg_functions():
    with engine.begin() as conn:
        print("Creating round(double precision, integer) compatibility function in PostgreSQL...")
        sql = """
        CREATE OR REPLACE FUNCTION round(double precision, integer) 
        RETURNS numeric AS $$ 
            SELECT round($1::numeric, $2); 
        $$ LANGUAGE sql IMMUTABLE;
        """
        conn.execute(text(sql))
        print("Successfully created round(double precision, integer) function!")

if __name__ == "__main__":
    create_pg_functions()
