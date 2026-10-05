"""
Database Seeding Script for InsightDI
Bulk-inserts the validated synthetic dataset from Dataset/output/final/*.csv
into PostgreSQL / SQLite in strict relational order.
"""
import os
import sys
import time
import logging
from datetime import datetime
import pandas as pd
from sqlalchemy import text

# Add backend directory to sys.path
BASE_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
sys.path.insert(0, BASE_DIR)

from app.db.session import engine, SessionLocal
from app.db.base import Base
import app.models

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s - %(levelname)s - %(message)s",
)
logger = logging.getLogger("seed_database")

DATASET_DIR = os.path.join(os.path.dirname(BASE_DIR), "Dataset", "output", "final")


def clean_dataframe(df: pd.DataFrame) -> pd.DataFrame:
    """Replace NaN / NaT with None for clean SQL NULL insertion."""
    return df.where(pd.notnull(df), None)


def seed_promotions(con):
    path = os.path.join(DATASET_DIR, "promotions.csv")
    logger.info(f"Loading promotions from {path}...")
    df = pd.read_csv(path)
    df["start_date"] = pd.to_datetime(df["start_date"]).dt.date
    df["end_date"] = pd.to_datetime(df["end_date"]).dt.date
    df = clean_dataframe(df)
    df.to_sql("promotions", con=con, if_exists="append", index=False)
    logger.info(f"Loaded {len(df):,} promotions.")


def seed_customers(con):
    path = os.path.join(DATASET_DIR, "customers.csv")
    logger.info(f"Loading customers from {path}...")
    df = pd.read_csv(path)
    df["registration_date"] = pd.to_datetime(df["registration_date"]).dt.date
    df = clean_dataframe(df)
    df.to_sql("customers", con=con, if_exists="append", index=False, chunksize=2000)
    logger.info(f"Loaded {len(df):,} customers.")


def seed_products(con):
    path = os.path.join(DATASET_DIR, "products.csv")
    logger.info(f"Loading products from {path}...")
    df = pd.read_csv(path)
    df = clean_dataframe(df)
    df.to_sql("products", con=con, if_exists="append", index=False)
    logger.info(f"Loaded {len(df):,} products.")


def seed_orders(con):
    path = os.path.join(DATASET_DIR, "orders.csv")
    logger.info(f"Loading orders from {path}...")
    df = pd.read_csv(path)
    df["order_date"] = pd.to_datetime(df["order_date"]).dt.date
    df["return_date"] = pd.to_datetime(df["return_date"]).dt.date
    df = clean_dataframe(df)
    df.to_sql("orders", con=con, if_exists="append", index=False, chunksize=5000)
    logger.info(f"Loaded {len(df):,} orders.")


def seed_order_items(con):
    path = os.path.join(DATASET_DIR, "order_items.csv")
    logger.info(f"Loading order_items from {path}...")
    df = pd.read_csv(path)
    df = clean_dataframe(df)
    df.to_sql("order_items", con=con, if_exists="append", index=False, chunksize=5000)
    logger.info(f"Loaded {len(df):,} order_items.")


def seed_inventory(con):
    path = os.path.join(DATASET_DIR, "inventory.csv")
    logger.info(f"Loading inventory from {path}...")
    df = pd.read_csv(path)
    df["date"] = pd.to_datetime(df["date"]).dt.date
    df["stockout_flag"] = df["stockout_flag"].astype(bool)
    df = clean_dataframe(df)
    df.to_sql("inventory", con=con, if_exists="append", index=False, chunksize=5000)
    logger.info(f"Loaded {len(df):,} inventory records.")


def seed_marketing(con):
    path = os.path.join(DATASET_DIR, "marketing.csv")
    logger.info(f"Loading marketing from {path}...")
    df = pd.read_csv(path)
    df["date"] = pd.to_datetime(df["date"]).dt.date
    df = clean_dataframe(df)
    df.to_sql("marketing", con=con, if_exists="append", index=False, chunksize=2000)
    logger.info(f"Loaded {len(df):,} marketing records.")


def seed_competitors(con):
    path = os.path.join(DATASET_DIR, "competitors.csv")
    logger.info(f"Loading competitors from {path}...")
    df = pd.read_csv(path)
    df["date"] = pd.to_datetime(df["date"]).dt.date
    df = clean_dataframe(df)
    df.to_sql("competitors", con=con, if_exists="append", index=False, chunksize=5000)
    logger.info(f"Loaded {len(df):,} competitor records.")


def verify_row_counts(con):
    """Verify that all tables have been populated with expected row counts."""
    tables = [
        ("promotions", 9),
        ("customers", 5000),
        ("products", 500),
        ("orders", 100000),
        ("order_items", 159770),
        ("inventory", 183000),
        ("marketing", 1830),
        ("competitors", 124500),
    ]

    logger.info("=== Verification: Checking Table Row Counts ===")
    all_passed = True
    for table_name, expected_count in tables:
        count = con.execute(text(f"SELECT COUNT(*) FROM {table_name}")).scalar()
        status = "PASSED" if count == expected_count else "FAILED"
        if status == "FAILED":
            all_passed = False
        logger.info(f"Table '{table_name}': {count:,} / {expected_count:,} rows [{status}]")

    return all_passed


def main():
    start_time = time.time()
    logger.info("Starting database seeding process...")
    logger.info(f"Source Directory: {DATASET_DIR}")

    # Recreate tables with clean schema
    Base.metadata.drop_all(bind=engine)
    Base.metadata.create_all(bind=engine)

    with engine.begin() as con:

        # Disable foreign key checks for SQLite during bulk insert if needed
        if engine.url.drivername.startswith("sqlite"):
            con.execute(text("PRAGMA foreign_keys = OFF;"))

        # Sequential FK ordered loading
        seed_promotions(con)
        seed_customers(con)
        seed_products(con)
        seed_orders(con)
        seed_order_items(con)
        seed_inventory(con)
        seed_marketing(con)
        seed_competitors(con)

        if engine.url.drivername.startswith("sqlite"):
            con.execute(text("PRAGMA foreign_keys = ON;"))

        success = verify_row_counts(con)
        if success:
            logger.info(f"Database successfully seeded in {time.time() - start_time:.2f} seconds!")
        else:
            logger.warning("Seeding completed with some row count discrepancies.")


if __name__ == "__main__":
    main()
