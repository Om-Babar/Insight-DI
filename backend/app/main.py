from contextlib import asynccontextmanager
import logging
from fastapi import FastAPI, Request, status
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from app.config import settings
from app.db.session import engine
from app.db.base import Base
import app.models  # Ensure all models are registered with Base metadata
from app.api.v1.api import api_router

# Setup logger
logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s - %(name)s - %(levelname)s - %(message)s",
)
logger = logging.getLogger("insightdi")
# InsightDI API Root Application


@asynccontextmanager
async def lifespan(app: FastAPI):
    """Lifecycle hook for startup and shutdown routines."""
    logger.info("Initializing InsightDI Database Tables...")
    try:
        Base.metadata.create_all(bind=engine)
        logger.info("Database tables initialized successfully.")
        # Ensure PostgreSQL compatibility helper functions exist
        if "postgresql" in str(engine.url):
            from sqlalchemy import text
            with engine.begin() as conn:
                conn.execute(text("""
                CREATE OR REPLACE FUNCTION round(double precision, integer) 
                RETURNS numeric AS $$ 
                    SELECT round($1::numeric, $2); 
                $$ LANGUAGE sql IMMUTABLE;
                """))
    except Exception as e:
        logger.error(f"Error creating database tables or compatibility functions: {e}")
    yield
    logger.info("Shutting down InsightDI API Server...")


app = FastAPI(
    title=settings.PROJECT_NAME,
    version=settings.VERSION,
    description="""
# InsightDI: AI-Powered Decision Intelligence Platform for E-Commerce SMEs

InsightDI bridges the gap between descriptive reporting and prescriptive decision intelligence.
It automatically ingests, validates, cleans, and standardizes multi-source SME e-commerce data into a unified canonical schema.
Then, it powers evidence-grounded analytics, machine-learning forecasting, root-cause diagnosis, explainable AI (SHAP), what-if simulation, and conversational decision support.
    """,
    lifespan=lifespan,
    docs_url="/docs",
    redoc_url="/redoc",
    openapi_url=f"{settings.API_V1_STR}/openapi.json",
)

# CORS configuration for Lovable frontend and local dev
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.CORS_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Global Exception Handlers
@app.exception_handler(Exception)
async def global_exception_handler(request: Request, exc: Exception):
    logger.error(f"Unhandled error processing {request.method} {request.url.path}: {exc}", exc_info=True)
    return JSONResponse(
        status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
        content={
            "success": False,
            "message": "Internal Server Error occurred. Please review server logs.",
            "error_detail": str(exc) if settings.DEBUG else None,
        },
    )


# Mount Versioned Routers
app.include_router(api_router, prefix=settings.API_V1_STR)


@app.get("/", tags=["Root"])
def root():
    """Welcome endpoint providing core API discovery URLs."""
    return {
        "project": settings.PROJECT_NAME,
        "version": settings.VERSION,
        "environment": settings.ENVIRONMENT,
        "docs": "/docs",
        "redoc": "/redoc",
        "health": f"{settings.API_V1_STR}/health",
        "openapi": f"{settings.API_V1_STR}/openapi.json",
    }
