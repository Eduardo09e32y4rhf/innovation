from datetime import datetime
from typing import Optional
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from infrastructure.database.sql.dependencies import get_db
from core.dependencies import get_current_user
from domain.models.user import User
import google.generativeai as genai
import os
from infrastructure.cache.session_manager import cache_manager
import hashlib
import json

router = APIRouter(prefix="/api/ai", tags=["AI Services"])

# Configurar Gemini
GEMINI_API_KEY = os.getenv("GEMINI_API_KEY", "")
if GEMINI_API_KEY:
    genai.configure(api_key=GEMINI_API_KEY)
    model = genai.GenerativeModel("gemini-1.5-flash")


@router.post("/analyze-resume")
async def analyze_resume(
    resume_text: str,
    job_requirements: str,
    job_title: str,
    current_user: User = Depends(get_current_user),
):
    """
    Analisa currículo usando Gemini AI com Cache em Redis
    """
    # 1. Gerar Hash para Cache
    cache_key = hashlib.md5(
        f"{resume_text[:500]}_{job_requirements[:500]}".encode()
    ).hexdigest()

    # 2. Verificar Cache (Redis)
    try:
        cached_result = await cache_manager.redis_client.get(
            f"resume_analysis:{cache_key}"
        )
        if cached_result:
            return {
                "success": True,
                "analysis": cached_result,
                "cached": True,
                "analyzed_at": datetime.now().isoformat(),
            }
    except Exception:
        pass  # Se o Redis estiver fora, continua sem cache

    if not GEMINI_API_KEY:
        raise HTTPException(
            status_code=503,
            detail="Gemini API não configurada. Configure GEMINI_API_KEY no .env",
        )

    try:
        prompt = f"""
Você é um especialista em recrutamento e seleção. Analise o currículo abaixo em relação aos requisitos da vaga.

VAGA: {job_title}

REQUISITOS DA VAGA:
{job_requirements}

CURRÍCULO DO CANDIDATO:
{resume_text}

Forneça uma análise estruturada em JSON com:
1. score (0-100): Compatibilidade geral
2. strengths (lista): Principais pontos fortes do candidato
3. weaknesses (lista): Gaps ou pontos de atenção
4. recommendation (string): "approve", "interview", ou "reject"
5. summary (string): Resumo da análise em 2-3 frases

Responda APENAS com o JSON, sem texto adicional.
"""

        response = model.generate_content(prompt)
        result_text = response.text.strip()

        # Tentar parsear como JSON
        try:
            clean_text = result_text
            if clean_text.startswith("```"):
                clean_text = clean_text.split("```")[1]
                if clean_text.startswith("json"):
                    clean_text = clean_text[4:]

            analysis = json.loads(clean_text)
        except:
            # Fallback
            analysis = {
                "score": 75,
                "strengths": ["Experiência relevante"],
                "weaknesses": ["Gaps identificados"],
                "recommendation": "interview",
                "summary": result_text[:200],
            }

        # 4. Salvar no Cache
        try:
            await cache_manager.redis_client.set(
                f"resume_analysis:{cache_key}", analysis, expire=86400
            )
        except Exception:
            pass  # Falha no cache não impede o retorno

        return {
            "success": True,
            "analysis": analysis,
            "cached": False,
            "analyzed_at": datetime.now().isoformat(),
        }
    except Exception as e:
        raise HTTPException(
            status_code=500, detail=f"Erro ao analisar currículo: {str(e)}"
        )


@router.post("/analyze-resume-async")
async def analyze_resume_async(
    resume_text: str,
    job_requirements: str,
    job_title: str,
    current_user: User = Depends(get_current_user),
):
    """
    Inicia análise assíncrona. Retorna task_id para acompanhamento.
    """
    from ai_engine.worker import analyze_resume_task

    task = analyze_resume_task.delay(resume_text, job_requirements)

    return {
        "success": True,
        "task_id": task.id,
        "status": "processing",
        "message": "Análise enviada para o Agente Jules em background.",
    }


@router.post("/generate-interview-questions")
async def generate_interview_questions(
    job_title: str,
    job_description: str,
    candidate_background: Optional[str] = None,
    question_count: int = 5,
    current_user: User = Depends(get_current_user),
):
    """
    Gera perguntas de entrevista personalizadas usando Gemini
    """
    if not GEMINI_API_KEY:
        raise HTTPException(status_code=503, detail="Gemini API não configurada")

    try:
        prompt = f"""
Você é um especialista em entrevistas técnicas e comportamentais.

Gere {question_count} perguntas de entrevista para a vaga de {job_title}.

DESCRIÇÃO DA VAGA:
{job_description}

{"BACKGROUND DO CANDIDATO: " + candidate_background if candidate_background else ""}

Forneça perguntas que avaliem:
- Competências técnicas
- Soft skills
- Fit cultural
- Experiências relevantes

Retorne em formato JSON:
{{
  "questions": [
    {{
      "question": "texto da pergunta",
      "type": "technical" ou "behavioral",
      "focus_area": "área que a pergunta avalia"
    }}
  ]
}}
"""

        response = model.generate_content(prompt)
        result_text = response.text.strip()

        import json

        try:
            if result_text.startswith("```"):
                result_text = result_text.split("```")[1]
                if result_text.startswith("json"):
                    result_text = result_text[4:]

            questions_data = json.loads(result_text)
        except:
            # Fallback
            questions_data = {
                "questions": [
                    {
                        "question": "Descreva um projeto desafiador que você liderou",
                        "type": "behavioral",
                        "focus_area": "Liderança",
                    }
                ]
            }

        return {
            "success": True,
            "questions": questions_data.get("questions", []),
            "generated_at": datetime.now().isoformat(),
        }

    except Exception as e:
        raise HTTPException(
            status_code=500, detail=f"Erro ao gerar perguntas: {str(e)}"
        )


@router.post("/chat")
async def ai_chat_assistant(
    message: str,
    context: Optional[str] = None,
    current_user: User = Depends(get_current_user),
):
    """
    Assistente de RH via chat (Gemini)
    """
    if not GEMINI_API_KEY:
        return {
            "response": "Gemini API não configurada. Configure GEMINI_API_KEY no arquivo .env"
        }

    try:
        system_context = """
Você é um assistente especializado em Recursos Humanos e Recrutamento da Innovation.ia.
Ajude com dúvidas sobre processos seletivos, gestão de candidatos, melhores práticas de RH.
Seja profissional, objetivo e prestativo.
"""

        full_prompt = f"{system_context}\n\n"
        if context:
            full_prompt += f"CONTEXTO: {context}\n\n"
        full_prompt += f"PERGUNTA: {message}"

        response = model.generate_content(full_prompt)

        return {"response": response.text, "timestamp": datetime.now().isoformat()}

    except Exception as e:
        return {"response": f"Erro ao processar mensagem: {str(e)}"}
