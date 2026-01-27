from pydantic_settings import BaseSettings, SettingsConfigDict
from pathlib import Path

BASE_DIR = Path(__file__).resolve().parents[2]

from pydantic_settings import BaseSettings

class Settings(BaseSettings):
    SECRET_KEY: str = "supersecret"
    MP_ACCESS_TOKEN: str = "TEST-MP-TOKEN"

settings = Settings()



class Settings(BaseSettings):
    DATABASE_URL: str
    SECRET_KEY: str
    ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 1440
    TERMS_VERSION: str = "v1"

    model_config = SettingsConfigDict(
        env_file=BASE_DIR / ".env",
        env_file_encoding="utf-8",
        extra="ignore",
    )


settings = Settings()

# exports diretos (simplifica imports no resto do projeto)
DATABASE_URL = settings.DATABASE_URL
SECRET_KEY = settings.SECRET_KEY
ALGORITHM = settings.ALGORITHM
ACCESS_TOKEN_EXPIRE_MINUTES = settings.ACCESS_TOKEN_EXPIRE_MINUTES
TERMS_VERSION = settings.TERMS_VERSION
