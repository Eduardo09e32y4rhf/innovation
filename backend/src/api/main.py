import os
from contextlib import asynccontextmanager
from fastapi import FastAPI, status
from fastapi.responses import JSONResponse
import google.generativeai as genai
from pydantic import BaseModel, Field
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
)
import domain.models  # Garante o registro de todos os modelos
from core.config import settings
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
model_gemini = None
if GEMINI_API_KEY:
    try:
        genai.configure(api_key=GEMINI_API_KEY)
        model_gemini = genai.GenerativeModel("gemini-pro")
    except Exception as e:
        print(f"Aviso: Falha ao configurar Gemini AI: {e}")

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


# Modelo para o Chat
class ChatMessage(BaseModel):
    message: str = Field(..., max_length=1000)


# --- API DE INTELIGÊNCIA ARTIFICIAL ---
@app.post("/api/chat")
async def chat_gemini(data: ChatMessage):
    try:
        if not model_gemini:
             return JSONResponse(
                status_code=503,
                content={"response": "Gemini AI não configurado."},
            )
        # Prompt focado em recrutamento
        prompt = f"Você é o assistente de recrutamento da Innovation.ia. Responda de forma curta e profissional: {data.message}"
        response = model_gemini.generate_content(prompt)
        return {"response": response.text}
    except Exception as e:
        return JSONResponse(
            status_code=500,
            content={"response": "Erro ao conectar com a IA."},
        )


# --- API DE DADOS PARA OS GRÁFICOS ---
@app.get("/api/stats")
async def get_stats():
    return {
        "vagas_ativas": 12,
        "candidatos_total": 458,
        "entrevistas_semana": 24,
        "score_ia_medio": 84,
        "grafico_fluxo": [120, 250, 180, 390, 320, 458],
        "grafico_contratacoes": [5, 8, 12, 7, 15, 20],
    }


@app.get("/health")
def health():
    return {"status": "ok"}
