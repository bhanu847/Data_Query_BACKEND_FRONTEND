import os
from functools import lru_cache
from dotenv import load_dotenv
load_dotenv()


class Settings:
    """App settings, driven by environment variables (see .env.example)."""

    # Auth
    JWT_SECRET: str = os.getenv("JWT_SECRET", "change-me-in-production")
    JWT_ALGORITHM: str = os.getenv("JWT_ALGORITHM", "HS256")
    ACCESS_TOKEN_EXPIRE_MINUTES: int = int(os.getenv("ACCESS_TOKEN_EXPIRE_MINUTES", "10080"))  # 7 days

    # Database. Defaults to local SQLite so the app runs with zero setup.
    # For production use Postgres, e.g. postgresql+psycopg2://user:pass@host:5432/db
    DATABASE_URL: str = os.getenv("DATABASE_URL", "sqlite:///./dataquery.db")

    # AI. If no key is set, the query/dashboard engines fall back to pandas-only logic.
    OPENAI_API_KEY: str = os.getenv("OPENAI_API_KEY", "")
    OPENAI_MODEL: str = os.getenv("OPENAI_MODEL", "gpt-4o-mini")

    # Uploads
    UPLOAD_DIR: str = os.getenv("UPLOAD_DIR", "./uploads")
    MAX_UPLOAD_MB: int = int(os.getenv("MAX_UPLOAD_MB", "50"))

    # CORS — set CORS_ORIGINS env var to your Vercel domain in production
    CORS_ORIGINS: list[str] = [
        o.strip() for o in os.getenv(
            "CORS_ORIGINS",
            "http://localhost:5173,http://127.0.0.1:5173,http://localhost:5174,http://127.0.0.1:5174"
        ).split(",") if o.strip()
    ]


@lru_cache
def get_settings() -> Settings:
    return Settings()


settings = get_settings()
