import os
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
import google.generativeai as genai
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
    enterprise
)
import domain.models  # Garante o registro de todos os modelos
from core.config import settings
from contextlib import asynccontextmanager
from core.superintendent import superintendent


@asynccontextmanager
async def lifespan(app: FastAPI):
    # Startup: Initialize Superintendent AI
    print("🤖 Innovation.ia Superintendent: Online")
    await superintendent.run_check()
    yield
    # Shutdown
    print("🤖 Innovation.ia Superintendent: Offline")


app = FastAPI(title="Innovation.ia - Elite Recruitment", lifespan=lifespan)

# Configuração do Gemini
GEMINI_API_KEY = settings.GEMINI_API_KEY
if GEMINI_API_KEY:
    try:
        genai.configure(api_key=GEMINI_API_KEY)
    except Exception as e:
        print(f"Aviso: Falha ao configurar Gemini AI (Pode estar depreciado): {e}")

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


@app.get("/health")
def health():
    return {"status": "ok"}
