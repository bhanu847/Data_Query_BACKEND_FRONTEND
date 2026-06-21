import os
from functools import lru_cache
from dotenv import load_dotenv
load_dotenv()


def _fix_database_url(url: str) -> str:
    if not url or "your" in url.lower():
        return "sqlite:///./dataquery.db"
    if url.startswith("postgres://"):
        return url.replace("postgres://", "postgresql+psycopg2://", 1)
    return url


def _clean_key(val: str) -> str:
    if not val or "your" in val.lower() or val == "change-me-in-production":
        return ""
    return val


class Settings:
    JWT_SECRET: str = os.getenv("JWT_SECRET", "change-me-in-production")
    JWT_ALGORITHM: str = os.getenv("JWT_ALGORITHM", "HS256")
    ACCESS_TOKEN_EXPIRE_MINUTES: int = int(os.getenv("ACCESS_TOKEN_EXPIRE_MINUTES", "10080"))

    DATABASE_URL: str = _fix_database_url(os.getenv("DATABASE_URL", "sqlite:///./dataquery.db"))

    OPENAI_API_KEY: str = _clean_key(os.getenv("OPENAI_API_KEY", ""))
    OPENAI_MODEL: str = os.getenv("OPENAI_MODEL", "gpt-4o-mini")

    UPLOAD_DIR: str = os.getenv("UPLOAD_DIR", "./uploads")
    MAX_UPLOAD_MB: int = int(os.getenv("MAX_UPLOAD_MB", "50"))

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
