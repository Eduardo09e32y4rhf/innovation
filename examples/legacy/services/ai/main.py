from fastapi import FastAPI, HTTPException
from fastapi.responses import StreamingResponse
from fastapi.middleware.cors import CORSMiddleware
import uvicorn
import os

from schemas import ChatRequest, ChatResponse
from ai_logic import ask_gemini, ask_gemini_stream

app = FastAPI(title="Innovation IA - AI Service")

# CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# ─────────────────────────────────────────────────────────────────
# HEALTH
# ─────────────────────────────────────────────────────────────────


@app.get("/api/ai/health")
async def health_check():
    return {"status": "healthy", "service": "ai-service"}


# ─────────────────────────────────────────────────────────────────
# MODELS — lista os modelos disponíveis para o frontend
# ─────────────────────────────────────────────────────────────────


@app.get("/api/ai/models")
async def list_models():
    return {
        "models": [
            {
                "id": "gemini-flash",
                "name": "Gemini 2.0 Flash",
                "description": "Rápido e eficiente para tarefas cotidianas de RH e análise.",
                "plan": "Starter",
                "available": True,
                "icon": "⚡",
                "model_id": "gemini-2.0-flash",
            },
            {
                "id": "gemini-pro",
                "name": "Gemini 3.1 Pro",
                "description": "Análises profundas, documentos longos e raciocínio complexo.",
                "plan": "Growth",
                "available": True,
                "icon": "🚀",
                "model_id": "gemini-3.1-pro",
            },
            {
                "id": "claude",
                "name": "Claude 3.5 Sonnet",
                "description": "IA Premium para Enterprise. Precisão máxima.",
                "plan": "Enterprise",
                "available": False,
                "icon": "🧠",
                "locked_message": "Disponível no plano Enterprise",
            },
        ]
    }


# ─────────────────────────────────────────────────────────────────
# CHAT — request/response padrão
# ─────────────────────────────────────────────────────────────────


@app.post("/api/ai/chat", response_model=ChatResponse)
async def chat(data: ChatRequest):
    model_map = {
        "gemini-flash": "gemini-2.0-flash",
        "gemini-pro": "gemini-3.1-pro",
    }
    model = model_map.get(
        data.model or "gemini-flash", data.model or "gemini-2.0-flash"
    )
    try:
        answer = await ask_gemini(data.question, data.history or [], model)
        return ChatResponse(answer=answer, model_used=model)
    except Exception as e:
        return ChatResponse(answer=str(e), model_used=model, error=True)


# ─────────────────────────────────────────────────────────────────
# CHAT STREAM — SSE streaming (usado pelo chat-ia/page.tsx)
# Aliases: /api/ai/ask-stream  e  /api/ai/chat/stream
# ─────────────────────────────────────────────────────────────────


async def _stream_response(data: ChatRequest):
    model_map = {
        "gemini-flash": "gemini-2.0-flash",
        "gemini-pro": "gemini-3.1-pro",
    }
    model = model_map.get(
        data.model or "gemini-flash", data.model or "gemini-2.0-flash"
    )
    return StreamingResponse(
        ask_gemini_stream(data.question, data.history or [], model),
        media_type="text/event-stream",
        headers={
            "Cache-Control": "no-cache",
            "X-Accel-Buffering": "no",
        },
    )


@app.post("/api/ai/ask-stream")
async def ask_stream(data: ChatRequest):
    """Endpoint principal usado pelo chat-ia/page.tsx"""
    return await _stream_response(data)


@app.post("/api/ai/chat/stream")
async def chat_stream(data: ChatRequest):
    """Alias para compatibilidade"""
    return await _stream_response(data)


# ─────────────────────────────────────────────────────────────────
# RANK CANDIDATE — usado pelo ATS
# ─────────────────────────────────────────────────────────────────


@app.post("/api/ai/rank-candidate")
async def rank_candidate(data: dict):
    resume_text = data.get("resume_text", "")
    job_description = data.get("job_description", "")
    question = f"""Analise este currículo e esta vaga e dê uma pontuação de 0 a 100:

CURRÍCULO:
{resume_text}

VAGA:
{job_description}

Responda APENAS com JSON: {{"score": 85, "summary": "...", "strengths": ["..."], "gaps": ["..."]}}"""

    try:
        from ai_logic import ask_gemini

        answer = await ask_gemini(question, [], "gemini-2.0-flash")
        import json, re

        match = re.search(r"\{.*\}", answer, re.DOTALL)
        if match:
            return json.loads(match.group())
        return {"score": 0, "summary": answer, "strengths": [], "gaps": []}
    except Exception as e:
        return {"score": 0, "summary": str(e), "strengths": [], "gaps": []}


if __name__ == "__main__":
    uvicorn.run("main:app", host="0.0.0.0", port=8002, reload=True)
