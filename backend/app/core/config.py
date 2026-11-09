import logging
import secrets
from typing import List, Optional

from pydantic_settings import BaseSettings, SettingsConfigDict

logger = logging.getLogger(__name__)

_DEV_JWT_SECRET = "dev-only-insecure-jwt-secret-change-me"


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=".env", env_file_encoding="utf-8", case_sensitive=True, extra="ignore")

    PROJECT_NAME: str = "Sidekick API"
    API_V1_STR: str = "/api/v1"
    ENVIRONMENT: str = "development"  # "development" | "production"

    MONGODB_URL: str = "mongodb://127.0.0.1:27017"
    DATABASE_NAME: str = "sidekick"

    JWT_SECRET: str = _DEV_JWT_SECRET
    ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 60 * 24 * 7  # 7 days
    PASSWORD_RESET_EXPIRE_MINUTES: int = 30

    # Comma-separated list of exact origins allowed to call the API.
    FRONTEND_URL: str = "http://localhost:3000"
    # Optional regex for preview deployments, e.g. https://sidekick-[a-z0-9-]+\.vercel\.app
    CORS_ORIGIN_REGEX: Optional[str] = r"https://sidekick[a-z0-9-]*\.vercel\.app"

    CLOUDINARY_URL: Optional[str] = None

    # Outgoing email (password reset). If SMTP_HOST is empty, reset emails cannot be sent.
    SMTP_HOST: Optional[str] = None
    SMTP_PORT: int = 587
    SMTP_USER: Optional[str] = None
    SMTP_PASSWORD: Optional[str] = None
    SMTP_FROM: Optional[str] = None
    SMTP_USE_TLS: bool = True

    @property
    def is_production(self) -> bool:
        return self.ENVIRONMENT.lower() == "production"

    @property
    def frontend_origins(self) -> List[str]:
        return [o.strip().rstrip("/") for o in self.FRONTEND_URL.split(",") if o.strip()]

    @property
    def primary_frontend_url(self) -> str:
        origins = self.frontend_origins
        return origins[0] if origins else "http://localhost:3000"

    @property
    def email_enabled(self) -> bool:
        return bool(self.SMTP_HOST and (self.SMTP_FROM or self.SMTP_USER))


settings = Settings()

if settings.JWT_SECRET == _DEV_JWT_SECRET or len(settings.JWT_SECRET) < 32:
    if settings.is_production:
        raise RuntimeError(
            "JWT_SECRET must be set to a strong random value (>= 32 chars) in production. "
            f"Example: {secrets.token_urlsafe(48)}"
        )
    logger.warning("Using an insecure development JWT_SECRET. Set JWT_SECRET in production.")
