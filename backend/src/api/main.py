import os
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
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

# Incluir Roteadores da API
app.include_router(auth.router, prefix="/api")
app.include_router(jobs.router, prefix="/api")
app.include_router(applications.router, prefix="/api")
app.include_router(enterprise.router, prefix="/api")
app.include_router(payments.router, prefix="/api")
app.include_router(ai.router, prefix="/api")
app.include_router(matching.router, prefix="/api")
app.include_router(dashboard.router)
app.include_router(interviews.router, prefix="/api")
app.include_router(ai_services.router, prefix="/api")
app.include_router(projects.router, prefix="/api")
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
app.include_router(webhooks.router, prefix="/api")
app.include_router(analytics.router, prefix="/api")
app.include_router(candidates.router, prefix="/api")
app.include_router(services_documents.router, prefix="/api")
app.include_router(services_full.router, prefix="/api")
# ── Advanced Modules (MASTERPLAN completion) ──
app.include_router(rh_advanced.router, prefix="/api")
app.include_router(csc_advanced.router, prefix="/api")
app.include_router(finance_advanced.router, prefix="/api")
app.include_router(projects_advanced.router, prefix="/api")
app.include_router(killer_questions.router, prefix="/api")
app.include_router(ai_admin.router, prefix="/api")
app.include_router(notifications.router, prefix="/api")
app.include_router(finance_das.router, prefix="/api")


@app.get("/health")
def health():
    return {"status": "ok"}
