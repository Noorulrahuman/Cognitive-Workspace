from functools import lru_cache
from pathlib import Path
from typing import Literal

from pydantic import SecretStr
from pydantic_settings import BaseSettings, SettingsConfigDict

# app/config/settings.py -> project root is two levels up
BASE_DIR = Path(__file__).resolve().parents[2]


class Settings(BaseSettings):
    # Application Config
    ENVIRONMENT: Literal["development", "staging", "production"] = "development"

    FRONTEND_URL: str = "http://localhost:3000"
    
    # Required: app fails fast at startup if missing
    DATABASE_URL: SecretStr | None = None

    # Supabase (backend uses the SECRET key, never the publishable one)
    SUPABASE_URL: str | None = None
    SUPABASE_SECRET_KEY: SecretStr | None = None

    # Future services: optional until you actually use them
    REDIS_URL: str | None = None
    QDRANT_URL: str | None = None
    GEMINI_API_KEY: SecretStr | None = None
    GROQ_API_KEY: SecretStr | None = None

    model_config = SettingsConfigDict(
        env_file=BASE_DIR / ".env",
        env_file_encoding="utf-8",
        case_sensitive=True,
        extra="ignore",
    )

    @property
    def is_production(self) -> bool:
        return self.ENVIRONMENT == "production"


@lru_cache
def get_settings() -> Settings:
    """Creates a cached singleton instance of Settings to avoid re-reading disk."""
    return Settings()


settings = get_settings()