from functools import lru_cache
import json

from pydantic import Field
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=".env", env_file_encoding="utf-8", extra="ignore")

    app_name: str = "Food Store API"
    app_version: str = "0.1.0"
    environment: str = "development"
    api_prefix: str = "/api/v1"
    log_level: str = "INFO"
    database_url: str = Field(..., alias="DATABASE_URL")
    secret_key: str = Field(..., alias="SECRET_KEY", min_length=32)
    access_token_expire_minutes: int = Field(30, alias="ACCESS_TOKEN_EXPIRE_MINUTES")
    refresh_token_expire_days: int = Field(7, alias="REFRESH_TOKEN_EXPIRE_DAYS")
    cors_origins: str = Field("http://localhost:5173", alias="CORS_ORIGINS")
    mp_access_token: str = Field("TEST-placeholder-access-token", alias="MP_ACCESS_TOKEN")
    mp_public_key: str = Field("TEST-placeholder-public-key", alias="MP_PUBLIC_KEY")
    mp_notification_url: str = Field("http://localhost:8000/api/v1/payments/webhook", alias="MP_NOTIFICATION_URL")
    bootstrap_admin_email: str = Field("admin@foodstore.local", alias="BOOTSTRAP_ADMIN_EMAIL")
    bootstrap_admin_password: str = Field("Admin1234!", alias="BOOTSTRAP_ADMIN_PASSWORD")
    bootstrap_admin_full_name: str = Field("Food Store Admin", alias="BOOTSTRAP_ADMIN_FULL_NAME")

    @property
    def cors_origins_list(self) -> list[str]:
        stripped = self.cors_origins.strip()
        if not stripped:
            return []
        if stripped.startswith("[") and stripped.endswith("]"):
            return list(json.loads(stripped))
        return [item.strip() for item in stripped.split(",") if item.strip()]


@lru_cache
def get_settings() -> Settings:
    return Settings()
