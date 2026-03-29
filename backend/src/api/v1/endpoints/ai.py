"""
AI Chat Endpoint — Tiered Model Access
- Gemini 1.5 Flash  → Plano Starter (básico)
- Gemini 3.1 Pro    → Plano Growth  (avançado)
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
from infrastructure.database.sql.dependencies import get_db
from sqlalchemy.orm import Session
from services import audit_service

router = APIRouter(prefix="/ai", tags=["ai-chat"])

from fastapi.responses import StreamingResponse
import asyncio

from core.ai_key_manager import ai_key_manager

ANTHROPIC_API_KEY = os.getenv("ANTHROPIC_API_KEY", "")

try:
    from google import genai
except ImportError:
    genai = None

# ─── Models ────────────────────────────────────────────────────────────────────


class ChatMessage(BaseModel):
    role: str  # "user" | "assistant"
    content: str


class ChatRequest(BaseModel):
    question: str
    context: Optional[str] = None
    model: Optional[str] = "gemini-flash"  # "gemini-flash" | "gemini-pro" | "claude"
    history: Optional[List[ChatMessage]] = []


class LandingPlanRequest(BaseModel):
    business_type: str


# ─── System Prompts ────────────────────────────────────────────────────────────

SYSTEM_PROMPT = """Você é o assistente inteligente da Innovation.ia, uma plataforma SaaS Enterprise.

Suas capacidades:
- 🔍 Busca na Web em Tempo Real: Você TEM PERMISSÃO E DEVE buscar ativamente na web (Google/YouTube) para fornecer informações 100% atualizadas sobre INSS, FGTS, Impostos, Leis Trabalhistas, e outras notícias.
- 🎯 Recrutamento: Analisar CVs, criar descrições de vagas.
- 👥 RH & 💰 Financeiro: Ajudar com avaliações, gestão de clima, folha de pagamento.

Regras:
1. Responda SEMPRE em português brasileiro, de forma SIMPLES e FÁCIL de qualquer pessoa entender.
2. Seja conciso mas completo. Use listas e negrito para destacar os pontos importantes.
3. Se perguntarem sobre leis, impostos, INSS ou FGTS, SEMPRE USE A BUSCA NA WEB para confirmar os valores atuais.
"""

CLAUDE_SYSTEM_PROMPT = """Você é o assistente inteligente da Innovation.ia, uma plataforma SaaS Enterprise.

Suas capacidades:
- 🔍 Busca na Web em Tempo Real: Você TEM PERMISSÃO E DEVE buscar ativamente na web (Google/YouTube) para fornecer informações 100% atualizadas sobre INSS, FGTS, Impostos, Leis Trabalhistas, e outras notícias.
- 🎯 Recrutamento: Analisar CVs, criar descrições de vagas.
- 👥 RH & 💰 Financeiro: Ajudar com avaliações, gestão de clima, folha de pagamento.

Regras:
1. Responda SEMPRE em português brasileiro, de forma SIMPLES e FÁCIL de qualquer pessoa entender.
2. Seja conciso mas completo. Use listas e negrito para destacar os pontos importantes.
3. Se perguntarem sobre leis, impostos, INSS ou FGTS, SEMPRE USE A BUSCA NA WEB para confirmar os valores atuais.
"""

# ─── Helper: Gemini ────────────────────────────────────────────────────────────


async def _ask_gemini(
    question: str, history: List[ChatMessage], model_name: str
) -> str:
    if not genai:
        return "❌ SDK Google GenAI não instalado."

    # Tenta usar as chaves disponíveis em rotação
    active_keys = ai_key_manager.get_all_active_keys()

    if not active_keys:
        raise HTTPException(503, "Sem chaves do Gemini disponíveis. Configure no .env")

    last_error = None

    for api_key in active_keys:
        try:
            client = genai.Client(api_key=api_key)

            # Converter histórico para formato do novo SDK
            chat_history = []
            for msg in history or []:
                chat_history.append(
                    {
                        "role": "user" if msg.role == "user" else "model",
                        "parts": [{"text": msg.content}],
                    }
                )

            # Chamar API usando system_instruction e a versão 2.0 que é mais poderosa
            actual_model = model_name
            if "flash" in model_name:
                actual_model = "gemini-2.0-flash"

            try:
                response = client.models.generate_content(
                    model=actual_model,
                    contents=chat_history
                    + [{"role": "user", "parts": [{"text": question}]}],
                    config={
                        "tools": [{"google_search": {}}],
                        "system_instruction": SYSTEM_PROMPT.strip(),
                        "temperature": 0.7,
                    },
                )
                return response.text
            except Exception as e:
                # Se for erro de cota ou chave, tentamos o próximo modelo (1.5) ou próxima chave
                if (
                    "429" in str(e)
                    or "quota" in str(e).lower()
                    or "API_KEY_INVALID" in str(e)
                ):
                    print(f"⚠️ Chave do Gemini falhou ({api_key[:10]}...): {e}")
                    ai_key_manager.mark_as_exhausted(api_key)
                    last_error = e
                    continue  # Tenta próxima chave no loop externo

                # Fallback para 1.5 se o 2.0 falhar por outro motivo
                if actual_model == "gemini-2.0-flash":
                    response = client.models.generate_content(
                        model="gemini-1.5-flash",
                        contents=chat_history
                        + [{"role": "user", "parts": [{"text": question}]}],
                        config={
                            "tools": [{"google_search": {}}],
                            "system_instruction": SYSTEM_PROMPT.strip(),
                        },
                    )
                    return response.text
                raise e
        except Exception as inner_e:
            print(f"❌ Erro crítico com chave: {inner_e}")
            last_error = inner_e
            continue

    raise HTTPException(
        503, f"Todas as chaves do Gemini falharam. Último erro: {str(last_error)}"
    )


async def _ask_gemini_stream(
    question: str, history: List[ChatMessage], model_name: str
):
    if not genai:
        yield "data: [ERROR] SDK Google GenAI não instalado.\n\n"
        return

    active_keys = ai_key_manager.get_all_active_keys()
    if not active_keys:
        yield "data: [ERROR] Sem chaves do Gemini disponíveis.\n\n"
        return

    for api_key in active_keys:
        try:
            # Uso do Client simplificado
            client = genai.Client(api_key=api_key)
            # Na verdade, o Client novo simplifica muita coisa, mas vamos garantir o loop.

            chat_history = []
            for msg in history or []:
                chat_history.append(
                    {
                        "role": "user" if msg.role == "user" else "model",
                        "parts": [{"text": msg.content}],
                    }
                )

            actual_model = model_name
            if "flash" in model_name:
                actual_model = "gemini-2.0-flash"

            try:
                # generate_content_stream retorna um iterator
                stream = client.models.generate_content_stream(
                    model=actual_model,
                    contents=chat_history
                    + [{"role": "user", "parts": [{"text": question}]}],
                    config={
                        "tools": [{"google_search": {}}],
                        "system_instruction": SYSTEM_PROMPT.strip(),
                        "temperature": 0.7,
                    },
                )

                for chunk in stream:
                    if chunk.text:
                        clean_text = chunk.text.replace("\n", "[NEWLINE]")
                        yield f"data: {clean_text}\n\n"
                        await asyncio.sleep(0.01)  # Cede o controle para o loop

                yield "data: [DONE]\n\n"
                return
            except Exception as e:
                if "429" in str(e) or "quota" in str(e).lower():
                    ai_key_manager.mark_as_exhausted(api_key)
                    continue
                # Fallback redundante para 1.5 se o 2.0 falhar
                if actual_model == "gemini-2.0-flash":
                    stream = client.models.generate_content_stream(
                        model="gemini-1.5-flash",
                        contents=chat_history
                        + [{"role": "user", "parts": [{"text": question}]}],
                        config={
                            "tools": [{"google_search": {}}],
                            "system_instruction": SYSTEM_PROMPT.strip(),
                        },
                    )
                    for chunk in stream:
                        if chunk.text:
                            texto_formatado = chunk.text.replace("\n", "[NEWLINE]")
                            yield f"data: {texto_formatado}\n\n"
                    yield "data: [DONE]\n\n"
                    return
                raise e
        except Exception as inner_e:
            continue

    yield f"data: [ERROR] Falha crítica: {str(inner_e)}\n\n"


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
        user_plan = getattr(current_user, "subscription_plan", "FREE").upper()
        if user_role != "admin" and user_plan not in ("ENTERPRISE", "CUSTOM"):
            return {
                "answer": "⚠️ **O modelo Claude está disponível apenas para planos Enterprise ou usuários autorizados pelo administrador.** Use o Gemini Flash (básico) ou Gemini Pro (avançado).",
                "model_used": "blocked",
                "error": True,
            }

    # Gate AI Access based on user plan
    user_plan = getattr(current_user, "subscription_plan", "FREE").upper()

    if user_plan in ["FREE", "BASIC", "STARTER"]:
        return {
            "answer": "⚠️ Seu plano atual não permite acesso livre à IA. Faça upgrade para o plano COMPLETE ou ENTERPRISE para desbloquear as funcionalidades cognitivas!",
            "model_used": "blocked",
            "error": True,
        }

    if user_plan == "COMPLETE":
        # Aqui você pode adicionar lógica de contagem de limite, por ex:
        # if current_user.points < 0: return bloqueio...
        pass

    try:
        if model_choice == "claude":
            answer = await _ask_claude(data.question, data.history or [])
            model_used = "Claude 3.5 Sonnet"
        else:
            answer = await _ask_gemini(
                data.question, data.history or [], "gemini-1.5-flash"
            )
            model_used = "Gemini 1.5 Flash"

        # Log usage and award XP
        db = next(get_db())
        audit_service.log_event(
            db, "CHAT_MESSAGE", user_id=current_user.id, details=f"Model: {model_used}"
        )

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


@router.post("/ask-stream")
async def ask_ai_stream(
    request: Request,
    data: ChatRequest,
    current_user: User = Depends(get_current_user),
):
    """
    Endpoint de streaming para resposta em tempo real.
    """
    model_choice = (data.model or "gemini-flash").lower()

    # Gate AI Access based on user plan
    user_plan = getattr(current_user, "subscription_plan", "FREE").upper()

    if user_plan in ["FREE", "BASIC", "STARTER"]:

        async def plan_limit_generator():
            yield "data: ⚠️ Seu plano atual não permite acesso livre à IA. Faça upgrade para o plano COMPLETE ou ENTERPRISE para desbloquear as funcionalidades cognitivas!\n\n"
            yield "data: [DONE]\n\n"

        return StreamingResponse(plan_limit_generator(), media_type="text/event-stream")

    # Log usage and award XP
    db = next(get_db())
    audit_service.log_event(
        db,
        "CHAT_MESSAGE",
        user_id=current_user.id,
        details=f"Model: {model_choice} (Streaming)",
    )

    # Por enquanto apenas Gemini suporta streaming nativo nesta implementação
    if "claude" in model_choice:
        # Fallback para não-streaming se tentar claude no stream (ou implementar claude stream depois)
        async def claude_fallback_generator():
            yield f"data: [ERROR] Streaming ainda não disponível para Claude. Use Gemini.\n\n"
            yield "data: [DONE]\n\n"

        return StreamingResponse(
            claude_fallback_generator(),
            media_type="text/event-stream",
        )

    return StreamingResponse(
        _ask_gemini_stream(data.question, data.history, model_choice),
        media_type="text/event-stream",
    )


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
                "name": "Gemini 3.1 Pro",
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
            {
                "id": "veo",
                "name": "Veo 3.0 (Video Gen)",
                "description": "Criação de vídeos cinematográficos a partir de texto",
                "plan": "Enterprise",
                "available": True,
                "icon": "🎬",
            },
        ],
        "current_plan": user_plan,
        "role": user_role,
    }


@router.post("/landing-plan")
async def landing_plan(data: LandingPlanRequest):
    """
    Endpoint público para a landing page (Simulador de ROI).
    Usa rotação de chaves.
    """
    business_type = data.business_type or "Usuário"

    user_query = (
        f"Simule planos para uma pessoa do cargo: {business_type}. "
        + "Cite 3 benefícios REAIS, PRÁTICOS e HUMANOS de usar a Innovation IA pagando R$ 9,99/mês. "
        + "Inicie cada benefício com um hífen (-) e seja curto."
    )

    try:
        # Reutiliza o helper _ask_gemini que já tem a rotação
        answer = await _ask_gemini(user_query, [], "gemini-1.5-flash")
        return {"answer": answer}
    except Exception as e:
        print(f"❌ Erro no simulador: {e}")
        raise HTTPException(500, detail="Erro interno do simulador.")


class VeoRequest(BaseModel):
    prompt: str
    image_base64: Optional[str] = None
    aspect_ratio: Optional[str] = "16:9"


@router.post("/veo/generate")
async def generate_video(
    data: VeoRequest, current_user: User = Depends(get_current_user)
):
    """Gera um vídeo usando Veo 3.0 via Gemini API."""
    if not genai:
        raise HTTPException(503, "SDK Google GenAI não instalado.")

    active_keys = ai_key_manager.get_all_active_keys()
    if not active_keys:
        raise HTTPException(503, "Sem chaves do Gemini disponíveis.")

    for api_key in active_keys:
        try:
            client = genai.Client(api_key=api_key)

            # Preparar o vídeo
            kwargs = {
                "model": "veo-3.0-generate-001",
                "prompt": data.prompt,
                "config": {"aspect_ratio": data.aspect_ratio},
            }

            if data.image_base64:
                # O SDK espera um objeto com image_bytes e mime_type
                kwargs["image"] = {
                    "image_bytes": data.image_base64,
                    "mime_type": "image/png",
                }

            operation = client.models.generate_videos(**kwargs)
            return {"operation_name": operation.name}

        except Exception as e:
            if "429" in str(e) or "quota" in str(e).lower():
                ai_key_manager.mark_as_exhausted(api_key)
                continue
            print(f"❌ Erro no Veo: {e}")
            raise HTTPException(500, detail="Erro ao gerar vídeo com Veo.")

    raise HTTPException(503, "Falha em todas as chaves do Gemini para o Veo.")


@router.post("/public-ask-stream")
@limiter.limit("15/minute")
async def public_ask_ai_stream(
    request: Request,
    data: ChatRequest,
    db: Session = Depends(get_db),
):
    """
    Endpoint de streaming público e simplificado para o Painel IA na Vercel.
    """
    model_choice = "gemini-2.0-flash"  # Use latest model for best search capability

    # Log usage as anonymous/public
    try:
        audit_service.log_event(
            db,
            "CHAT_MESSAGE",
            user_id="00000000-0000-0000-0000-000000000000",  # Fallback guest ID
            details=f"Model: {model_choice} (Public Streaming)",
        )
    except Exception as e:
        print(f"Skipping audit log for public user: {e}")

    return StreamingResponse(
        _ask_gemini_stream(data.question, data.history, model_choice),
        media_type="text/event-stream",
    )
