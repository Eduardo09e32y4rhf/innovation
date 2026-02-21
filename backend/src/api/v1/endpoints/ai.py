"""
AI Chat Endpoint — Tiered Model Access
- Gemini 1.5 Flash  → Plano Starter (básico)
- Gemini 1.5 Pro    → Plano Growth  (avançado)
- Claude 3.5 Sonnet → Apenas admin-unlocked / personalizado
"""

import os
import json
import re
from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from typing import Optional, List

from core.dependencies import get_current_user
from domain.models.user import User

router = APIRouter(prefix="/api/ai", tags=["ai-chat"])

GEMINI_API_KEY = os.getenv("GEMINI_API_KEY", "")
ANTHROPIC_API_KEY = os.getenv("ANTHROPIC_API_KEY", "")

# ─── Models ────────────────────────────────────────────────────────────────────


class ChatMessage(BaseModel):
    role: str  # "user" | "assistant"
    content: str


class ChatRequest(BaseModel):
    question: str
    context: Optional[str] = None
    model: Optional[str] = "gemini-flash"  # "gemini-flash" | "gemini-pro" | "claude"
    history: Optional[List[ChatMessage]] = []


# ─── System Prompts ────────────────────────────────────────────────────────────

SYSTEM_PROMPT = """Você é o assistente inteligente da Innovation.ia, uma plataforma SaaS Enterprise de gestão de RH, Recrutamento, Finanças e Projetos.

Suas capacidades:
- 🎯 Recrutamento: Analisar CVs, criar descrições de vagas, sugerir perguntas de entrevista
- 👥 RH: Ajudar com avaliações 360°, PDI, gestão de clima e onboarding
- 💰 Financeiro: Calcular custos de folha, analisar centros de custo, projetar fluxo de caixa
- 📋 Projetos: Estimar esforço, criar cronogramas, sugerir alocação de recursos
- 🎫 Suporte: Ajudar com respostas a tickets, categorização e priorização

Regras:
1. Responda SEMPRE em português brasileiro
2. Seja conciso mas completo
3. Use formatação (negrito, listas) para facilitar a leitura
4. Quando fizer cálculos, mostre a conta
5. Se não souber algo, diga honestamente e sugira uma alternativa
"""

CLAUDE_SYSTEM_PROMPT = """Você é o assistente premium Claude da Innovation.ia — modo Enterprise.
Você tem capacidade avançada de análise de documentos, geração de relatórios executivos,
código review e consultoria estratégica de RH/Financeiro.

Responda SEMPRE em português brasileiro com qualidade executiva."""

# ─── Helper: Gemini ────────────────────────────────────────────────────────────


async def _ask_gemini(
    question: str, history: List[ChatMessage], model_name: str
) -> str:
    import google.genai as genai

    if not GEMINI_API_KEY:
        raise HTTPException(503, "GEMINI_API_KEY não configurada. Configure no .env")

    client = genai.Client(api_key=GEMINI_API_KEY)

    # Build conversation history
    # The new SDK uses a slightly different structure for chat
    chat_history = []
    for msg in history or []:
        chat_history.append(
            {"role": "user" if msg.role == "user" else "model", "parts": [{"text": msg.content}]}
        )

    response = client.models.generate_content(
        model=model_name,
        contents=chat_history + [{"role": "user", "parts": [{"text": f"{SYSTEM_PROMPT}\n\n{question}"}]}]
    )
    return response.text


# ─── Helper: Claude ────────────────────────────────────────────────────────────


async def _ask_claude(question: str, history: List[ChatMessage]) -> str:
    import httpx

    if not ANTHROPIC_API_KEY:
        raise HTTPException(
            503, "ANTHROPIC_API_KEY não configurada. Contate o administrador."
        )

    messages = []
    for msg in history or []:
        messages.append({"role": msg.role, "content": msg.content})
    messages.append({"role": "user", "content": question})

    async with httpx.AsyncClient() as client:
        response = await client.post(
            "https://api.anthropic.com/v1/messages",
            headers={
                "x-api-key": ANTHROPIC_API_KEY,
                "anthropic-version": "2023-06-01",
                "content-type": "application/json",
            },
            json={
                "model": "claude-3-5-sonnet-20241022",
                "max_tokens": 2048,
                "system": CLAUDE_SYSTEM_PROMPT,
                "messages": messages,
            },
            timeout=60.0,
        )

        if response.status_code != 200:
            raise HTTPException(502, f"Erro da API Claude: {response.status_code}")

        result = response.json()
        return result["content"][0]["text"]


# ─── Main Endpoint ─────────────────────────────────────────────────────────────

# Rate Limiting
from slowapi import Limiter
from slowapi.util import get_remote_address
from starlette.requests import Request

limiter = Limiter(key_func=get_remote_address)


@router.post("/ask")
@limiter.limit("10/minute")
async def ask_ai(
    request: Request,
    data: ChatRequest,
    current_user: User = Depends(get_current_user),
):
    """
    Chat IA com modelo baseado no plano do usuário:
    - gemini-flash  → Starter (grátis / básico)
    - gemini-pro    → Growth  (avançado)
    - claude        → Enterprise / Admin-unlocked only
    """
    model_choice = (data.model or "gemini-flash").lower()

    # Gate Claude access — only for admin or enterprise users
    if model_choice == "claude":
        user_role = getattr(current_user, "role", "user")
        user_plan = getattr(current_user, "plan", "starter")
        if user_role != "admin" and user_plan not in ("enterprise", "custom"):
            return {
                "answer": "⚠️ **O modelo Claude está disponível apenas para planos Enterprise ou usuários autorizados pelo administrador.** Use o Gemini Flash (básico) ou Gemini Pro (avançado).",
                "model_used": "blocked",
                "error": True,
            }

    try:
        if model_choice == "claude":
            answer = await _ask_claude(data.question, data.history or [])
            model_used = "Claude 3.5 Sonnet"
        elif model_choice == "gemini-pro":
            answer = await _ask_gemini(
                data.question, data.history or [], "gemini-1.5-pro"
            )
            model_used = "Gemini 1.5 Pro"
        else:
            answer = await _ask_gemini(
                data.question, data.history or [], "gemini-1.5-flash"
            )
            model_used = "Gemini 1.5 Flash"

        return {
            "answer": answer,
            "model_used": model_used,
            "error": False,
        }

    except HTTPException:
        raise
    except Exception as e:
        return {
            "answer": f"Erro ao processar: {str(e)}",
            "model_used": model_choice,
            "error": True,
        }


# ─── Model Info ────────────────────────────────────────────────────────────────


@router.get("/models")
async def list_models(current_user: User = Depends(get_current_user)):
    """Retorna os modelos disponíveis e acesso do usuário."""
    user_role = getattr(current_user, "role", "user")
    user_plan = getattr(current_user, "plan", "starter")
    claude_unlocked = user_role == "admin" or user_plan in ("enterprise", "custom")

    return {
        "models": [
            {
                "id": "gemini-flash",
                "name": "Gemini 1.5 Flash",
                "description": "Rápido e eficiente para tarefas do dia-a-dia",
                "plan": "Starter",
                "available": True,
                "icon": "⚡",
            },
            {
                "id": "gemini-pro",
                "name": "Gemini 1.5 Pro",
                "description": "Análises profundas e respostas detalhadas",
                "plan": "Growth",
                "available": True,
                "icon": "🚀",
            },
            {
                "id": "claude",
                "name": "Claude 3.5 Sonnet",
                "description": "Inteligência premium para decisões estratégicas",
                "plan": "Enterprise",
                "available": claude_unlocked,
                "icon": "🧠",
                "locked_message": (
                    None
                    if claude_unlocked
                    else "Apenas para planos Enterprise ou acesso personalizado."
                ),
            },
        ],
        "current_plan": user_plan,
        "role": user_role,
    }
