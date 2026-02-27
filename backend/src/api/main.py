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
    webhooks,
    companies,
)
import domain.models  # Garante o registro de todos os modelos
from core.config import settings
from contextlib import asynccontextmanager
from core.superintendent import superintendent
from core.security.vpn_block import vpn_blocker_middleware


@asynccontextmanager
async def lifespan(app: FastAPI):
    # Startup: Initialize Superintendent AI
    print("🤖 Innovation.ia Superintendent: Online")
    await superintendent.run_check()
    yield
    # Shutdown
    print("🤖 Innovation.ia Superintendent: Offline")


app = FastAPI(title="Innovation.ia - Elite Recruitment", lifespan=lifespan)
app.middleware("http")(vpn_blocker_middleware)

# O Gemini é configurado dinamicamente nos endpoints via google.genai.Client
# usando a chave definida no settings.GEMINI_API_KEYS


# Middleware CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.ALLOWED_ORIGINS.split(","),
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Incluir Roteadores da API
app.include_router(auth.router)
app.include_router(jobs.router)
app.include_router(applications.router)
app.include_router(enterprise.router)
app.include_router(payments.router)
app.include_router(ai.router)
app.include_router(matching.router)
app.include_router(dashboard.router)
app.include_router(interviews.router)
app.include_router(ai_services.router)
app.include_router(projects.router)
app.include_router(rh.router)
app.include_router(finance.router)
app.include_router(support.router)
app.include_router(companies.router)
# ── Advanced Modules (MASTERPLAN completion) ──
app.include_router(rh_advanced.router)
app.include_router(csc_advanced.router)
app.include_router(finance_advanced.router)
app.include_router(projects_advanced.router)
app.include_router(killer_questions.router)
# ── Webhooks (Integration with n8n) ──
app.include_router(webhooks.router)


@app.get("/health")
def health():
    return {"status": "ok"}
