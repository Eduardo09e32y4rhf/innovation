import os
import pytest
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from sqlalchemy.pool import StaticPool
from fastapi.testclient import TestClient

# ── Variáveis de ambiente para isolamento total nos testes ────────────────
os.environ.setdefault("DATABASE_URL", "sqlite:///:memory:")
os.environ.setdefault("SECRET_KEY", "test_secret_key_for_testing_purposes_only")
os.environ.setdefault("GEMINI_API_KEYS", "dummy_gemini_key")
os.environ.setdefault("GEMINI_API_KEY", "dummy_gemini_key")
os.environ.setdefault("OPENAI_API_KEY", "sk-test-dummy-key-for-testing-only")
os.environ.setdefault("NVIDIA_API_KEY", "nvapi-dummy-for-testing")
os.environ.setdefault("ANTHROPIC_API_KEY", "sk-ant-dummy-for-testing")
os.environ.setdefault("ASAAS_API_KEY", "")
os.environ.setdefault("ASAAS_WEBHOOK_TOKEN", "test_webhook_secret")
os.environ.setdefault("MP_ACCESS_TOKEN", "TEST-dummy-mp-token")
os.environ.setdefault("PLUGGY_CLIENT_ID", "dummy")
os.environ.setdefault("PLUGGY_CLIENT_SECRET", "dummy")
os.environ.setdefault("RATELIMIT_ENABLED", "False") # Para garantir no backend secundário

# IMPORTANTE: Importar o app DEPOIS de configurar as var de ambiente
from api.main import app
from infrastructure.database.sql.dependencies import get_db
from infrastructure.database.sql.base import Base

# Use in-memory SQLite for tests
SQLALCHEMY_DATABASE_URL = "sqlite:///:memory:"

engine = create_engine(
    SQLALCHEMY_DATABASE_URL,
    connect_args={"check_same_thread": False},
    poolclass=StaticPool,
)
TestingSessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)


@pytest.fixture(scope="function")
def setup_db():
    # Create tables
    Base.metadata.create_all(bind=engine)
    yield
    # Drop tables
    Base.metadata.drop_all(bind=engine)


@pytest.fixture(scope="function")
def db_session(setup_db):
    session = TestingSessionLocal()
    try:
        yield session
    finally:
        session.close()


@pytest.fixture(scope="function")
def client(db_session, monkeypatch):
    """
    TestClient fixture that overrides dependencies,
    disables rate limits, and sets necessary environment.
    """
    def override_get_db():
        try:
            yield db_session
        finally:
            pass

    # Forçadamente desabilita o rate limiter no nível global para evitar 429 nos testes
    from slowapi import Limiter
    monkeypatch.setattr(Limiter, "limit", lambda *args, **kwargs: lambda f: f)

    # Desabilita o limiter no app também se ele já foi inicializado
    if hasattr(app, "state") and hasattr(app.state, "limiter"):
        app.state.limiter.enabled = False

    app.dependency_overrides[get_db] = override_get_db

    with TestClient(app) as c:
        yield c
