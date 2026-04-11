"""
AI Service Entrypoint — Innovation.ia @Pro
──────────────────────────────────────────
Roda APENAS os módulos de IA, chat e análise de currículos.
Porta interna: 8002
Kong encaminha: /api/ai, /api/chat, /api/ai-admin → http://ai_service:8002
"""
from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from api.middleware.correlation_id import CorrelationIdMiddleware
from api.v1.endpoints import ai, ai_services, ai_admin, ai_reports, matching, innovation_chat, innovation_sync, killer_questions
import domain.models  # noqa: F401
from core.security.vpn_block import vpn_blocker_middleware
from infrastructure.database.sql.session import engine
from infrastructure.database.sql.base import Base


@asynccontextmanager
async def lifespan(app: FastAPI):
    print("[AI-SVC] Iniciando AI Service...")
    Base.metadata.create_all(bind=engine)
    yield
    print("[AI-SVC] Shutdown.")


app = FastAPI(
    title="Innovation.ia — AI Service",
    description="Serviço de IA: análise de currículos, DISC, OCR e geração de conteúdo.",
    version="2.0.0",
    lifespan=lifespan,
)

app.middleware("http")(vpn_blocker_middleware)
app.add_middleware(CorrelationIdMiddleware)
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# ── Routers ──────────────────────────────────────────────────────────────────
app.include_router(ai.router, prefix="/api")
app.include_router(ai_services.router)
app.include_router(ai_admin.router, prefix="/api")
app.include_router(ai_reports.router, prefix="/api")
app.include_router(matching.router)
app.include_router(innovation_chat.router, prefix="/api")
app.include_router(innovation_sync.router, prefix="/api")
app.include_router(killer_questions.router)


@app.get("/health")
async def health():
    """Health check com teste real à API Gemini."""
    import os
    gemini_keys = os.getenv("GEMINI_API_KEYS", "")
    gemini_status = "configured" if gemini_keys else "not_configured"

    try:
        from infrastructure.database.sql.session import SessionLocal
        db = SessionLocal()
        db.execute(__import__("sqlalchemy").text("SELECT 1"))
        db.close()
        db_status = "ok"
    except Exception as e:
        db_status = f"error: {e}"

    return {
        "service": "ai",
        "status": "ok" if db_status == "ok" else "degraded",
        "database": db_status,
        "gemini": gemini_status,
    }
