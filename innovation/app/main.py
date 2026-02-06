from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from slowapi import Limiter, _rate_limit_exceeded_handler
from slowapi.util import get_remote_address
from slowapi.errors import RateLimitExceeded
import logging

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
)

# Configuração de logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)

# Rate Limiter
limiter = Limiter(key_func=get_remote_address)

app = FastAPI(
    title="Innovation SaaS",
    description="API completa para gestão de empresas e vagas",
    version="1.0.0"
)

# Adiciona rate limiting
app.state.limiter = limiter
app.add_exception_handler(RateLimitExceeded, _rate_limit_exceeded_handler)

# Configuração CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:3000",  # React/Next.js dev
        "http://localhost:8080",  # Vue/Angular dev
        "http://127.0.0.1:3000",
        # Adicione seus domínios de produção aqui
        # "https://innovation.ia",
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Routers
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


@app.get("/")
def root():
    return {
        "status": "API rodando",
        "version": "1.0.0",
        "docs": "/docs"
    }


@app.get("/health")
def health_check():
    """Endpoint de health check para monitoramento"""
    return {"status": "healthy"}
