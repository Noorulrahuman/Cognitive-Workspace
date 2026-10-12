from functools import lru_cache
from typing import Literal
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    # Application Config
    ENVIRONMENT: Literal["development", "staging", "production"] = "development"

    # Services & Databases
    DATABASE_URL: str
    REDIS_URL: str
    QDRANT_URL: str
    GEMINI_API_KEY: str

    # Pydantic Settings Configuration
    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        case_sensitive=True,
        extra="ignore"  # Ignores extraneous env variables not defined above
    )


@lru_cache
def get_settings() -> Settings:
    """Creates a cached singleton instance of Settings to avoid re-reading disk."""
    return Settings()


# Singleton export for direct access
settings = get_settings()