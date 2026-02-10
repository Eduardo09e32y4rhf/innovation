from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from fastapi.responses import FileResponse
from slowapi import Limiter, _rate_limit_exceeded_handler
from slowapi.util import get_remote_address
from slowapi.errors import RateLimitExceeded
import logging
import os
import google.generativeai as genai
from fastapi.responses import JSONResponse

from app.api import (
    auth,
    plans,
    payments,
    terms,
    companies,
    jobs,
    applications,
    candidates,
    subscriptions,
    audit_logs,
    ai,
    documents,
    services_documents,
    services_full,
    users,
)

from app.core.logging_config import setup_logging

# Configuração de logging centralizada
logger = setup_logging()

# Rate Limiter
limiter = Limiter(key_func=get_remote_address)

app = FastAPI(
    title="Innovation SaaS",
    description="API completa para gestão de empresas e vagas",
    version="1.0.0"
)

# CONFIGURAÇÃO GEMINI
GEMINI_API_KEY = os.getenv("GEMINI_API_KEY", "SUA_CHAVE_AQUI")
genai.configure(api_key=GEMINI_API_KEY)
model_gemini = genai.GenerativeModel('gemini-pro')

# Adicionar middleware de logging
@app.middleware("http")
async def log_requests(request: Request, call_next):
    logger.info(f"{request.method} {request.url.path}")
    response = await call_next(request)
    logger.info(f"Status: {response.status_code}")
    return response

# Adiciona rate limiting
app.state.limiter = limiter
app.add_exception_handler(RateLimitExceeded, _rate_limit_exceeded_handler)

# Configuração CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Routers API
app.include_router(auth.router)
app.include_router(plans.router)
app.include_router(payments.router)
app.include_router(terms.router)
app.include_router(companies.router)
app.include_router(jobs.router)
app.include_router(applications.router)
app.include_router(candidates.router)
app.include_router(subscriptions.router)
app.include_router(audit_logs.router)
app.include_router(ai.router)
app.include_router(documents.router)
app.include_router(services_documents.router)
app.include_router(services_full.router)
app.include_router(users.router)

@app.get("/api/status")
def api_status():
    return {"status": "online", "version": "1.0.0"}

@app.get("/api/dashboard-stats", tags=["API"])
async def get_stats():
    return {
        "vagas_ativas": 12,
        "total_candidatos": 458,
        "triagens_ia": "1.2k",
        "economia_tempo": "72h"
    }



# --- ROTAS DO FRONTEND (WEB-TEST) ---
@app.get("/dashboard")
async def get_dashboard():
    return FileResponse("../web-test/company/dashboard.html")

@app.get("/vagas")
async def get_vagas_page():
    return FileResponse("../web-test/company/jobs.html")

@app.get("/candidatos")
async def get_candidates_page():
    return FileResponse("../web-test/company/candidates.html")

@app.get("/configuracoes")
async def get_settings_page():
    return FileResponse("../web-test/company/settings.html")

@app.get("/login")
async def read_login():
    return FileResponse("../web-test/company/login.html")

@app.get("/")
async def read_index():
    return FileResponse("../web-test/index.html")

@app.get("/health")
def health_check():
    return {"status": "healthy"}

# API DO CHAT IA
@app.post("/api/chat")
async def chat_ia(request: Request):
    try:
        data = await request.json()
        user_message = data.get("message")
        
        if not user_message:
            return JSONResponse(status_code=400, content={"response": "Mensagem vazia."})

        # Prompt context for recruitment assistant
        prompt = f"Você é o assistente virtual da Innovation.ia, uma plataforma de recrutamento tech de elite. Ajude o recrutador com a seguinte dúvida ou tarefa: {user_message}"
        
        response = model_gemini.generate_content(prompt)
        return {"response": response.text}
    except Exception as e:
        logger.error(f"Erro Gemini: {str(e)}")
        return JSONResponse(status_code=500, content={"response": "Erro na IA. Verifique a conexão ou a chave API."})
