"""Application configuration via Pydantic BaseSettings."""

from __future__ import annotations

import secrets
from functools import lru_cache
from pathlib import Path

from pydantic_settings import BaseSettings, SettingsConfigDict

_BASE_DIR = Path(__file__).resolve().parent.parent.parent


class Settings(BaseSettings):
    # Database (Supabase PostgreSQL) — must be set in backend/.env
    DATABASE_URL: str = ""

    # AI providers — must be set in backend/.env
    GROQ_API_KEY: str = ""
    GROQ_API_KEY2: str = ""
    GEMINI_API_KEY: str = ""

    # Firebase — must be set in backend/.env
    FIREBASE_PROJECT_ID: str = ""

    # App secret
    APP_SECRET_KEY: str = secrets.token_hex(32)

    # JWT
    JWT_ALGORITHM: str = "RS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 60 * 24 * 7  # 7 days

    model_config = SettingsConfigDict(
        env_file=[
            str(_BASE_DIR / ".env"),
            str(_BASE_DIR.parent / ".env"),
            ".env",
            "backend/.env",
        ],
        env_file_encoding="utf-8",
        extra="ignore",
    )

    @property
    def database_url(self) -> str:
        return self.DATABASE_URL

    def resolved_secret_key(self) -> str:
        return self.APP_SECRET_KEY

    @property
    def access_token_expire_minutes(self) -> int:
        return self.ACCESS_TOKEN_EXPIRE_MINUTES


@lru_cache
def get_settings() -> Settings:
    return Settings()


settings = get_settings()
