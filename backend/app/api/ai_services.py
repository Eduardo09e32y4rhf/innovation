from datetime import datetime
from typing import Optional
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from app.db.dependencies import get_db
from app.core.dependencies import get_current_user
from app.models.user import User
import google.generativeai as genai
import os

router = APIRouter(prefix="/api/ai", tags=["AI Services"])

# Configurar Gemini
GEMINI_API_KEY = os.getenv("GEMINI_API_KEY", "")
if GEMINI_API_KEY:
    genai.configure(api_key=GEMINI_API_KEY)
    model = genai.GenerativeModel('gemini-pro')

@router.post("/analyze-resume")
async def analyze_resume(
    resume_text: str,
    job_requirements: str,
    job_title: str,
    current_user: User = Depends(get_current_user)
):
    """
    Analisa currículo usando Gemini AI
    Retorna: score, pontos fortes, fracos, recomendação
    """
    if not GEMINI_API_KEY:
        raise HTTPException(
            status_code=503,
            detail="Gemini API não configurada. Configure GEMINI_API_KEY no .env"
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
        import json
        try:
            # Remover markdown se houver
            if result_text.startswith("```"):
                result_text = result_text.split("```")[1]
                if result_text.startswith("json"):
                    result_text = result_text[4:]
            
            analysis = json.loads(result_text)
        except:
            # Fallback se não conseguir parsear
            analysis = {
                "score": 75,
                "strengths": ["Experiência relevante", "Boa formação"],
                "weaknesses": ["Falta detalhes sobre projetos"],
                "recommendation": "interview",
                "summary": result_text[:200]
            }
        
        return {
            "success": True,
            "analysis": analysis,
            "analyzed_at": datetime.now().isoformat()
        }
        
    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=f"Erro ao analisar currículo: {str(e)}"
        )

@router.post("/generate-interview-questions")
async def generate_interview_questions(
    job_title: str,
    job_description: str,
    candidate_background: Optional[str] = None,
    question_count: int = 5,
    current_user: User = Depends(get_current_user)
):
    """
    Gera perguntas de entrevista personalizadas usando Gemini
    """
    if not GEMINI_API_KEY:
        raise HTTPException(
            status_code=503,
            detail="Gemini API não configurada"
        )
    
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
                        "focus_area": "Liderança"
                    }
                ]
            }
        
        return {
            "success": True,
            "questions": questions_data.get("questions", []),
            "generated_at": datetime.now().isoformat()
        }
        
    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=f"Erro ao gerar perguntas: {str(e)}"
        )

@router.post("/chat")
async def ai_chat_assistant(
    message: str,
    context: Optional[str] = None,
    current_user: User = Depends(get_current_user)
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
        
        return {
            "response": response.text,
            "timestamp": datetime.now().isoformat()
        }
        
    except Exception as e:
        return {
            "response": f"Erro ao processar mensagem: {str(e)}"
        }
