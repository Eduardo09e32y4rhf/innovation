"""
core/config.py — Configurações globais da Innovation.ia
-------------------------------------------------------
Lê variáveis de ambiente do arquivo .env (backend/.env).
Em produção, defina as variáveis diretamente no servidor (Railway, Render, etc.)

Variáveis obrigatórias para produção:
  - DATABASE_URL (PostgreSQL)
  - SECRET_KEY (gerar com: python -c "import secrets; print(secrets.token_hex(32))")
  - GEMINI_API_KEY_1 (Google AI Studio)
  - ASAAS_API_KEY (painel Asaas)
  - ASAAS_WEBHOOK_TOKEN (você escolhe o valor)
"""

from pydantic_settings import BaseSettings, SettingsConfigDict
from pathlib import Path

BASE_DIR = Path(__file__).resolve().parents[2]  # backend/


class Settings(BaseSettings):
    # ── Banco de Dados ──────────────────────────────────────────────────────
    # DEV: sqlite:///./innovation_rh.db
    # PROD: postgresql://user:pass@host:5432/innovation_prod
    DATABASE_URL: str = "sqlite:///./innovation_rh.db"

    # ── Segurança JWT ───────────────────────────────────────────────────────
    # Obrigatório — gerar com: python -c "import secrets; print(secrets.token_hex(32))"
    SECRET_KEY: str = "dev-secret-key-mude-em-producao"
    ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 1440  # 24h
    REFRESH_TOKEN_EXPIRE_DAYS: int = 30
    TERMS_VERSION: str = "v1"

    # ── Google Gemini ────────────────────────────────────────────────────────
    # Suporta múltiplas chaves para rotação automática
    GEMINI_API_KEYS: str | None = None  # lista separada por vírgula (legacy)
    GEMINI_API_KEY_1: str | None = None  # preferido
    GEMINI_API_KEY_2: str | None = None
    GEMINI_API_KEY_3: str | None = None
    GEMINI_API_KEY_4: str | None = None
    GEMINI_API_KEY_5: str | None = None

    # ── Claude (Anthropic) — Opcional ───────────────────────────────────────
    ANTHROPIC_API_KEY: str | None = None

    # ── OpenAI — Legado ─────────────────────────────────────────────────────
    OPENAI_API_KEY: str | None = None
    NVIDIA_API_KEY: str | None = None

    # ── Pagamentos — Asaas ──────────────────────────────────────────────────
    ASAAS_API_KEY: str | None = None
    ASAAS_API_URL: str = "https://api.asaas.com/v3"  # PRODUÇÃO
    ASAAS_WEBHOOK_TOKEN: str | None = None
    ASAAS_WEBHOOK_URL: str | None = None  # URL pública do /webhook

    # ── Pagamentos — Mercado Pago (legado) ──────────────────────────────────
    MP_ACCESS_TOKEN: str | None = None

    # ── Open Finance — Pluggy ───────────────────────────────────────────────
    PLUGGY_CLIENT_ID: str | None = None
    PLUGGY_CLIENT_SECRET: str | None = None

    # ── Storage — AWS S3 ────────────────────────────────────────────────────
    AWS_ACCESS_KEY: str | None = None
    AWS_SECRET_KEY: str | None = None
    AWS_BUCKET_NAME: str = "innovation-biometrics"
    AWS_REGION: str = "sa-east-1"

    # ── Email ────────────────────────────────────────────────────────────────
    SENDGRID_API_KEY: str | None = None
    EMAIL_FROM: str = "no-reply@innovation.ia"
    SMTP_HOST: str = "smtp.gmail.com"
    SMTP_PORT: int = 587
    SMTP_USER: str | None = None
    SMTP_PASSWORD: str | None = None
    EMAIL_FROM_NAME: str = "Innovation.ia"

    # ── WhatsApp / SMS ──────────────────────────────────────────────────────
    TWILIO_ACCOUNT_SID: str | None = None
    TWILIO_AUTH_TOKEN: str | None = None
    TWILIO_PHONE_NUMBER: str | None = None

    # ── Google OAuth ─────────────────────────────────────────────────────────
    GOOGLE_CLIENT_ID: str | None = None
    GOOGLE_CLIENT_SECRET: str | None = None
    GOOGLE_REDIRECT_URI: str = "http://localhost:3000/auth/callback"

    # ── Redis / Filas ────────────────────────────────────────────────────────
    REDIS_URL: str = "redis://localhost:6379/0"

    # ── App ──────────────────────────────────────────────────────────────────
    APP_ENV: str = "development"
    DEBUG: bool = False
    LOG_LEVEL: str = "INFO"
    BASE_URL: str = "http://localhost:8000"
    ALLOWED_ORIGINS: str = "*"

    model_config = SettingsConfigDict(
        env_file=BASE_DIR / ".env",
        env_file_encoding="utf-8",
        extra="ignore",
    )


settings = Settings()

# ── Exports diretos (simplifica imports no resto do projeto) ────────────────
DATABASE_URL = settings.DATABASE_URL

# Fix relative SQLite path → absolute
if DATABASE_URL.startswith("sqlite:///./"):
    db_name = DATABASE_URL.split("sqlite:///./")[1]
    DATABASE_URL = f"sqlite:///{BASE_DIR}/{db_name}"

# Fix Render/Railway Postgres URL schema
if DATABASE_URL and DATABASE_URL.startswith("postgres://"):
    DATABASE_URL = DATABASE_URL.replace("postgres://", "postgresql://", 1)

SECRET_KEY = settings.SECRET_KEY
ALGORITHM = settings.ALGORITHM
ACCESS_TOKEN_EXPIRE_MINUTES = settings.ACCESS_TOKEN_EXPIRE_MINUTES
REFRESH_TOKEN_EXPIRE_DAYS = settings.REFRESH_TOKEN_EXPIRE_DAYS
TERMS_VERSION = settings.TERMS_VERSION
