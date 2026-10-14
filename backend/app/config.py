from typing import List, Union
from pydantic_settings import BaseSettings, SettingsConfigDict
from pydantic import field_validator
import os


class Settings(BaseSettings):
    PROJECT_NAME: str = "InsightDI AI Decision Intelligence API"
    VERSION: str = "1.0.0"
    ENVIRONMENT: str = "development"
    DEBUG: bool = True
    API_V1_STR: str = "/api/v1"

    # Database (PostgreSQL Authoritative)
    DATABASE_URL: str = "postgresql+psycopg2://postgres:postgres@localhost:5432/insightdi"
    USE_SQLITE_FALLBACK: bool = False

    # Security & Auth
    SECRET_KEY: str = "insightdi-super-secret-development-key-change-in-production-12345"
    ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 60 * 24  # 24 hours

    # LLM APIs
    GEMINI_API_KEY: str = ""
    OPENAI_API_KEY: str = ""
    ACTIVE_LLM_PROVIDER: str = "gemini"

    # Apify Competitive Intelligence
    APIFY_API_TOKEN: str = ""
    APIFY_AMAZON_ACTOR_ID: str = "junglee/amazon-crawler"
    APIFY_FLIPKART_ACTOR_ID: str = "shahidirfan/flipkart-product-scraper"

    # CORS
    CORS_ORIGINS: List[str] = [
        "http://localhost:5173",
        "http://localhost:3000",
        "http://localhost:8080",
        "https://*.lovable.app",
        "https://*.lovableproject.com",
    ]

    model_config = SettingsConfigDict(
        env_file=os.path.join(os.path.dirname(os.path.dirname(__file__)), ".env"),
        env_file_encoding="utf-8",
        extra="ignore",
    )


settings = Settings()
