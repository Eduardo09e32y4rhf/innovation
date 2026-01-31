from pathlib import Path

from pydantic_settings import BaseSettings, SettingsConfigDict

BASE_DIR = Path(__file__).resolve().parents[2]


class Settings(BaseSettings):
    DATABASE_URL: str
    SECRET_KEY: str
    SUPABASE_URL: str | None = None
    SUPABASE_KEY: str | None = None
    ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 1440
    TERMS_VERSION: str = "v1"
    MP_ACCESS_TOKEN: str
    MP_PUBLIC_KEY: str | None = None

    model_config = SettingsConfigDict(
        env_file=(BASE_DIR / ".env.production" if (BASE_DIR / ".env.production").exists() else BASE_DIR / ".env"),
        env_file_encoding="utf-8",
        extra="ignore",
    )


settings = Settings()
