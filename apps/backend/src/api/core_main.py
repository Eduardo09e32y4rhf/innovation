"""
Core Service Entrypoint — Innovation.ia @Pro
─────────────────────────────────────────────
Roda os módulos de negócio: Vagas, RH, Finanças, Projetos, Suporte.
Porta interna: 8003
Kong encaminha: /api/jobs, /api/finance, /api/rh, etc → http://core_service:8003
"""
from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from api.middleware.correlation_id import CorrelationIdMiddleware
from api.v1.endpoints import (
    jobs, applications, dashboard, interviews,
    projects, rh, finance, support, payments,
    enterprise, rh_advanced, csc_advanced, finance_advanced,
    projects_advanced, notifications, documents, webhooks,
    analytics, candidates, services_documents, services_full,
    finance_das,
)
import domain.models  # noqa: F401
from core.config import settings
from core.security.vpn_block import vpn_blocker_middleware
from core.superintendent import superintendent
from infrastructure.database.sql.session import engine
from infrastructure.database.sql.base import Base


@asynccontextmanager
async def lifespan(app: FastAPI):
    print("[CORE-SVC] Sincronizando banco de dados...")
    Base.metadata.create_all(bind=engine)
    print("[CORE-SVC] Superintendent online...")
    await superintendent.run_check()
    yield
    print("[CORE-SVC] Shutdown.")


app = FastAPI(
    title="Innovation.ia — Core Service",
    description="Serviço principal: Vagas, RH, Finanças, Projetos e Suporte.",
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
    allow_origin_regex=r"https://.*\.loca\.lt|https://.*\.ngrok\.io|https://.*\.ngrok-free\.app",
    allow_credentials=not allow_all_origins,
    allow_methods=["*"],
    allow_headers=["*"],
)

# ── Routers ──────────────────────────────────────────────────────────────────
app.include_router(jobs.router)
app.include_router(applications.router)
app.include_router(dashboard.router)
app.include_router(interviews.router, prefix="/api")
app.include_router(projects.router)
app.include_router(rh.router, prefix="/api")
app.include_router(finance.router, prefix="/api")
app.include_router(support.router, prefix="/api")
app.include_router(payments.router)
app.include_router(enterprise.router)
app.include_router(rh_advanced.router)
app.include_router(csc_advanced.router)
app.include_router(finance_advanced.router)
app.include_router(projects_advanced.router)
app.include_router(notifications.router)
app.include_router(documents.router, prefix="/api")
app.include_router(webhooks.router)
app.include_router(analytics.router, prefix="/api")
app.include_router(candidates.router)
app.include_router(services_documents.router, prefix="/api")
app.include_router(services_full.router, prefix="/api")
app.include_router(finance_das.router, prefix="/api")


@app.get("/health")
async def health():
    """Health check real com verificação do banco."""
    try:
        from infrastructure.database.sql.session import SessionLocal
        import sqlalchemy
        db = SessionLocal()
        db.execute(sqlalchemy.text("SELECT 1"))
        db.close()
        db_status = "ok"
    except Exception as e:
        db_status = f"error: {e}"

    return {
        "service": "core",
        "status": "ok" if db_status == "ok" else "degraded",
        "database": db_status,
    }
