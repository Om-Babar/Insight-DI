from typing import Generator
import logging
from sqlalchemy import create_engine, text
from sqlalchemy.orm import sessionmaker, Session
from app.config import settings

logger = logging.getLogger("insightdi.db")

# Create engine with PostgreSQL first, fallback to SQLite if PostgreSQL fails to connect
database_url = settings.DATABASE_URL
connect_args = {}

if database_url.startswith("sqlite"):
    connect_args = {"check_same_thread": False}

try:
    engine = create_engine(database_url, connect_args=connect_args, pool_pre_ping=True)
    # Test connection
    with engine.connect() as conn:
        conn.execute(text("SELECT 1"))
    logger.info(f"Successfully connected to primary database: {database_url.split('@')[-1] if '@' in database_url else database_url}")
except Exception as e:
    if settings.USE_SQLITE_FALLBACK and not database_url.startswith("sqlite"):
        logger.warning(
            f"Could not connect to PostgreSQL ({e}). Falling back to local SQLite database: {settings.FALLBACK_SQLITE_URL}"
        )
        database_url = settings.FALLBACK_SQLITE_URL
        connect_args = {"check_same_thread": False}
        engine = create_engine(database_url, connect_args=connect_args, pool_pre_ping=True)
    else:
        logger.error(f"Database connection error: {e}")
        raise e

SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)


def get_db() -> Generator[Session, None, None]:
    """Dependency for providing a transactional database session."""
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()
