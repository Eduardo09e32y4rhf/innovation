"""
Auth Service Entrypoint — Innovation.ia @Pro
─────────────────────────────────────────────
Roda APENAS os módulos de autenticação e usuários.
Porta interna: 8001
Kong encaminha: /api/auth, /api/users → http://auth_service:8001
"""
from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from api.middleware.correlation_id import CorrelationIdMiddleware
from api.v1.endpoints import auth, users, companies, subscriptions, plans, terms, audit_logs
import domain.models  # noqa: F401 — registra todos os modelos ORM
from core.config import settings
from core.security.vpn_block import vpn_blocker_middleware
from infrastructure.database.sql.session import engine
from infrastructure.database.sql.base import Base


@asynccontextmanager
async def lifespan(app: FastAPI):
    print("[AUTH-SVC] Sincronizando tabelas de auth...")
    Base.metadata.create_all(bind=engine)
    yield
    print("[AUTH-SVC] Shutdown.")


app = FastAPI(
    title="Innovation.ia — Auth Service",
    description="Serviço de autenticação, usuários e assinaturas.",
    version="2.0.0",
    lifespan=lifespan,
)

allowed_origins = [origin.strip() for origin in settings.ALLOWED_ORIGINS.split(",") if origin.strip()]
allow_all_origins = allowed_origins == ["*"]

app.middleware("http")(vpn_blocker_middleware)
app.add_middleware(CorrelationIdMiddleware)
app.add_middleware(
    CORSMiddleware,
    allow_origins=allowed_origins or ["http://localhost:3000"],
    allow_origin_regex=r"https://[a-zA-Z0-9-]+\.loca\.lt|https://[a-zA-Z0-9-]+\.ngrok-free\.app",
    allow_credentials=not allow_all_origins,
    allow_methods=["GET", "POST", "PUT", "DELETE", "PATCH", "OPTIONS"],
    allow_headers=["Content-Type", "Authorization", "Accept", "Origin", "X-Requested-With", "X-Correlation-ID"],
)

# ── Routers ──────────────────────────────────────────────────────────────────
app.include_router(auth.router)          # /api/auth/*
app.include_router(users.router, prefix="/api")      # /api/users/*
app.include_router(companies.router, prefix="/api")  # /api/companies/*
app.include_router(subscriptions.router, prefix="/api")
app.include_router(plans.router, prefix="/api")
app.include_router(terms.router, prefix="/api")
app.include_router(audit_logs.router, prefix="/api")


@app.get("/health")
async def health():
    """Health check — Kong usa isso para saber se o serviço está vivo."""
    try:
        # Testa conexão real com o banco
        from infrastructure.database.sql.session import SessionLocal
        db = SessionLocal()
        db.execute(__import__("sqlalchemy").text("SELECT 1"))
        db.close()
        db_status = "ok"
    except Exception as e:
        db_status = f"error: {e}"

    return {
        "service": "auth",
        "status": "ok" if db_status == "ok" else "degraded",
        "database": db_status,
    }
