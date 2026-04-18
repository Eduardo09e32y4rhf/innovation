import os
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from api.middleware.correlation_id import CorrelationIdMiddleware
from api.v1.endpoints import (
    jobs,
    applications,
    ai,
    matching,
    auth,
    dashboard,
    interviews,
    ai_services,
    projects,
    rh,
    finance,
    support,
    payments,
    enterprise,
    rh_advanced,
    csc_advanced,
    finance_advanced,
    projects_advanced,
    killer_questions,
    ai_admin,
    notifications,
    companies,
    users,
    documents,
    terms,
    plans,
    audit_logs,
    subscriptions,
    webhooks,
    analytics,
    candidates,
    services_documents,
    services_full,
    finance_das,
    innovation_chat,
    ai_reports,
    innovation_sync,
)
import domain.models  # Garante o registro de todos os modelos
from core.config import settings
from contextlib import asynccontextmanager
from core.superintendent import superintendent
from core.security.vpn_block import vpn_blocker_middleware
from infrastructure.database.sql.session import engine
from infrastructure.database.sql.base import Base


@asynccontextmanager
async def lifespan(app: FastAPI):
    # Startup: Initialize Database Tables
    print("[DB] Sincronizando tabelas do banco de dados...")
    Base.metadata.create_all(bind=engine)

    # Startup: Initialize Superintendent AI
    print("[AI] Innovation.ia Superintendent: Online")
    await superintendent.run_check()
    yield
    # Shutdown
    print("[AI] Innovation.ia Superintendent: Offline")


app = FastAPI(title="Innovation.ia - Elite Recruitment", lifespan=lifespan)
app.middleware("http")(vpn_blocker_middleware)

# O Gemini é configurado dinamicamente nos endpoints via google.genai.Client
# usando a chave definida no settings.GEMINI_API_KEYS


# Middleware CORS - Unified for dev
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000", "http://127.0.0.1:3000"],
    allow_origin_regex=r"https://.*\.vercel\.app",
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)
# Middleware de Correlação — rastreabilidade Frontend ↔ Backend
app.add_middleware(CorrelationIdMiddleware)

# Incluir Roteadores da API
app.include_router(auth.router)
app.include_router(jobs.router)
app.include_router(applications.router)
app.include_router(enterprise.router)
app.include_router(payments.router)
app.include_router(ai.router, prefix="/api")
app.include_router(matching.router)
app.include_router(dashboard.router)
app.include_router(interviews.router, prefix="/api")
app.include_router(ai_services.router)
app.include_router(projects.router)
app.include_router(rh.router, prefix="/api")
app.include_router(finance.router, prefix="/api")
app.include_router(support.router, prefix="/api")
app.include_router(companies.router, prefix="/api")
app.include_router(users.router, prefix="/api")
app.include_router(documents.router, prefix="/api")
app.include_router(terms.router, prefix="/api")
app.include_router(plans.router, prefix="/api")
app.include_router(audit_logs.router, prefix="/api")
app.include_router(subscriptions.router, prefix="/api")
app.include_router(webhooks.router)
app.include_router(analytics.router, prefix="/api")
app.include_router(candidates.router)
app.include_router(services_documents.router, prefix="/api")
app.include_router(services_full.router, prefix="/api")
# ── Advanced Modules (MASTERPLAN completion) ──
app.include_router(rh_advanced.router)
app.include_router(csc_advanced.router)
app.include_router(finance_advanced.router)
app.include_router(projects_advanced.router)
app.include_router(killer_questions.router)
app.include_router(ai_admin.router, prefix="/api")
app.include_router(notifications.router)
app.include_router(finance_das.router, prefix="/api")
app.include_router(innovation_chat.router, prefix="/api")
app.include_router(ai_reports.router, prefix="/api")
app.include_router(innovation_sync.router, prefix="/api")


@app.get("/health")
async def health():
    """
    Health check real — verifica banco de dados e configuração de IA.
    Retorna 'ok' só quando tudo está funcional.
    """
    import os, sqlalchemy

    # ── Banco de Dados ────────────────────────────────────────────────────
    try:
        from infrastructure.database.sql.session import SessionLocal
        db = SessionLocal()
        db.execute(sqlalchemy.text("SELECT 1"))
        db.close()
        db_status = "ok"
    except Exception as e:
        db_status = f"error: {str(e)[:80]}"

    # ── Gemini API ────────────────────────────────────────────────────────
    gemini_keys = os.getenv("GEMINI_API_KEYS", "")
    gemini_status = "configured" if gemini_keys else "missing"

    # ── Status geral ──────────────────────────────────────────────────────
    overall = "ok" if db_status == "ok" else "degraded"

    return {
        "status": overall,
        "service": "innovation-monolith",
        "checks": {
            "database": db_status,
            "gemini_api": gemini_status,
        },
    }
