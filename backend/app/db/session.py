from typing import Generator
import logging
from sqlalchemy import create_engine, text
from sqlalchemy.orm import sessionmaker, Session
from app.config import settings

logger = logging.getLogger("insightdi.db")

# Connect to PostgreSQL as the single authoritative database
database_url = settings.DATABASE_URL
if database_url.startswith("sqlite"):
    connect_args = {"check_same_thread": False}
else:
    connect_args = {"connect_timeout": 1}

try:
    engine = create_engine(database_url, connect_args=connect_args, pool_pre_ping=True)
    with engine.connect() as conn:
        conn.execute(text("SELECT 1"))
    safe_display_url = database_url.split("@")[-1] if "@" in database_url else database_url
    logger.info(f"Successfully connected to authoritative database: {safe_display_url}")
except Exception as e:
    import os
    sqlite_path = os.path.join(os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__)))), "insightdi.db")
    if os.path.exists(sqlite_path):
        logger.warning(
            f"PostgreSQL unavailable ({e}). Falling back to local authoritative SQLite database at {sqlite_path}."
        )
        database_url = f"sqlite:///{sqlite_path}"
        connect_args = {"check_same_thread": False}
        engine = create_engine(database_url, connect_args=connect_args)
    else:
        logger.critical(
            f"CRITICAL: Failed to connect to authoritative PostgreSQL database ({e}). "
            f"InsightDI strictly requires PostgreSQL. Ensure the Docker container 'insightdi-postgres' is running."
        )
        raise RuntimeError(
            f"Database connection failed: Could not connect to authoritative PostgreSQL database at {database_url}. "
            "Please run 'docker compose up -d' to start PostgreSQL."
        ) from e

SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)


def get_db() -> Generator[Session, None, None]:
    """Dependency for providing a transactional database session."""
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()
