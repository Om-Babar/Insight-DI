import sqlite3
import os
import sys

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

def audit():
    db_path = "insightdi.db"
    if not os.path.exists(db_path):
        print(f"File {db_path} not found")
        return
    
    conn = sqlite3.connect(db_path)
    cur = conn.cursor()
    tables = [r[0] for r in cur.execute("SELECT name FROM sqlite_master WHERE type='table' AND name NOT LIKE 'sqlite_%'").fetchall()]
    
    print("==========================================")
    print("   CURRENT SQLITE DATABASE AUDIT REPORT   ")
    print("==========================================")
    print(f"Database File: {os.path.abspath(db_path)}")
    print(f"File Size: {os.path.getsize(db_path):,} bytes ({os.path.getsize(db_path)/(1024*1024):.2f} MB)")
    print(f"Total Tables: {len(tables)}\n")
    
    total_records = 0
    table_stats = {}
    for t in sorted(tables):
        cnt = cur.execute(f"SELECT COUNT(*) FROM \"{t}\"").fetchone()[0]
        total_records += cnt
        table_stats[t] = cnt
        print(f"  {t:<25}: {cnt:>10,} rows")
        
    print("------------------------------------------")
    print(f"  TOTAL RECORDS PRESERVED  : {total_records:>10,} rows\n")
    
    # Check for foreign keys or relationships
    print("Schema Foreign Key Summary:")
    for t in sorted(tables):
        fks = cur.execute(f"PRAGMA foreign_key_list(\"{t}\")").fetchall()
        if fks:
            fk_str = ", ".join([f"{fk[3]} -> {fk[2]}({fk[4]})" for fk in fks])
            print(f"  {t:<25}: {fk_str}")

    print("\nColumn Length Compatibility with SQLAlchemy Models:")
    from app.db.base import Base
    import app.models
    mismatches = 0
    for table_name, table in Base.metadata.tables.items():
        if table_name not in tables:
            continue
        for col in table.columns:
            if hasattr(col.type, "length") and col.type.length is not None:
                max_len = cur.execute(f"SELECT MAX(LENGTH(CAST(\"{col.name}\" AS TEXT))) FROM \"{table_name}\"").fetchone()[0]
                if max_len and max_len > col.type.length:
                    print(f"  [LENGTH EXCEEDED] {table_name}.{col.name}: model limit={col.type.length}, actual data={max_len}")
                    mismatches += 1
    if mismatches == 0:
        print("  All model column string lengths are 100% compatible with dataset!")

if __name__ == "__main__":
    audit()
