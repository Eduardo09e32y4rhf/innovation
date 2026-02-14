from pydantic_settings import BaseSettings, SettingsConfigDict
from pathlib import Path

BASE_DIR = Path(__file__).resolve().parents[3]


class Settings(BaseSettings):
    DATABASE_URL: str
    SECRET_KEY: str
    ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 30  # 30 minutos para segurança
    REFRESH_TOKEN_EXPIRE_DAYS: int = 30  # 30 dias para manter usuário logado
    TERMS_VERSION: str = "v1"
    
    # External Services
    GEMINI_API_KEY: str | None = None
    ALLOWED_ORIGINS: str = "*"

    # Twilio Settings
    TWILIO_ACCOUNT_SID: str | None = None
    TWILIO_AUTH_TOKEN: str | None = None
    TWILIO_PHONE_NUMBER: str | None = None
    
    # SendGrid Settings
    SENDGRID_API_KEY: str | None = None
    EMAIL_FROM: str = "no-reply@innovation.ia"

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

SECRET_KEY = settings.SECRET_KEY
ALGORITHM = settings.ALGORITHM
ACCESS_TOKEN_EXPIRE_MINUTES = settings.ACCESS_TOKEN_EXPIRE_MINUTES
REFRESH_TOKEN_EXPIRE_DAYS = settings.REFRESH_TOKEN_EXPIRE_DAYS
TERMS_VERSION = settings.TERMS_VERSION
