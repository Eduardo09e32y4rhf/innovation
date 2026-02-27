from pydantic_settings import BaseSettings, SettingsConfigDict
from pathlib import Path

BASE_DIR = Path(__file__).resolve().parents[2]  # backend/


class Settings(BaseSettings):
    DATABASE_URL: str = "sqlite:///./innovation_rh.db"
    SECRET_KEY: str = "change_this_immediately_in_production_for_security_reasons_12345"
    ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 30  # 30 minutos para segurança
    REFRESH_TOKEN_EXPIRE_DAYS: int = 30  # 30 dias para manter usuário logado
    TERMS_VERSION: str = "v1"

    # External Services
    REDIS_URL: str = "redis://localhost:6379/0"
    GEMINI_API_KEYS: str | None = None
    # Updated ALLOWED_ORIGINS to include production domains
    ALLOWED_ORIGINS: str = "http://localhost:3000,http://187.77.49.207,https://app.innovationia.com.br,https://ia.innovationia.com.br,https://bi.innovationia.com.br"

    # Google OAuth
    GOOGLE_CLIENT_ID: str | None = None
    GOOGLE_CLIENT_SECRET: str | None = None
    GOOGLE_REDIRECT_URI: str = "http://localhost:3000/auth/callback"

    # Twilio Settings
    TWILIO_ACCOUNT_SID: str | None = None
    TWILIO_AUTH_TOKEN: str | None = None
    TWILIO_PHONE_NUMBER: str | None = None

    # SendGrid Settings
    SENDGRID_API_KEY: str | None = None
    EMAIL_FROM: str = "no-reply@innovation.ia"

    # Mercado Pago Settings
    MP_ACCESS_TOKEN: str | None = None
    BASE_URL: str = (
        "http://localhost:8000"  # Default for local dev, override in prod/ngrok
    )

    # n8n Settings
    N8N_WEBHOOK_URL: str | None = None

    model_config = SettingsConfigDict(
        env_file=BASE_DIR / ".env",
        env_file_encoding="utf-8",
        extra="ignore",
    )


settings = Settings()

# exports diretos (simplifica imports no resto do projeto)
DATABASE_URL = settings.DATABASE_URL
# Fix relative SQLite path to absolute
if DATABASE_URL.startswith("sqlite:///./"):
    db_name = DATABASE_URL.split("sqlite:///./")[1]
    DATABASE_URL = f"sqlite:///{BASE_DIR}/{db_name}"
# Fix Render Postgres URL
if DATABASE_URL and DATABASE_URL.startswith("postgres://"):
    DATABASE_URL = DATABASE_URL.replace("postgres://", "postgresql://", 1)

SECRET_KEY = settings.SECRET_KEY
ALGORITHM = settings.ALGORITHM
ACCESS_TOKEN_EXPIRE_MINUTES = settings.ACCESS_TOKEN_EXPIRE_MINUTES
REFRESH_TOKEN_EXPIRE_DAYS = settings.REFRESH_TOKEN_EXPIRE_DAYS
TERMS_VERSION = settings.TERMS_VERSION
