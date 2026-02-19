"""
AI Services Endpoint — Resume Parsing, DISC Analysis, Tech Test Generator
"""
import os
import io
import base64
from fastapi import APIRouter, Depends, HTTPException, UploadFile, File
from sqlalchemy.orm import Session
from pydantic import BaseModel
from typing import Optional

from infrastructure.database.sql.dependencies import get_db
from core.dependencies import get_current_user
from domain.models.user import User

router = APIRouter(prefix="/api/ai", tags=["ai-services"])

def _get_gemini():
    import google.generativeai as genai
    api_key = os.getenv("GEMINI_API_KEY")
    if not api_key:
        raise HTTPException(status_code=503, detail="GEMINI_API_KEY não configurada")
    genai.configure(api_key=api_key)
    return genai.GenerativeModel("gemini-1.5-flash")


# ─── RESUME PARSING ────────────────────────────────────────────────────────────

@router.post("/parse-resume")
async def parse_resume(
    file: UploadFile = File(...),
    current_user: User = Depends(get_current_user),
):
    """
    Faz o parsing de um PDF ou DOCX de currículo e retorna dados estruturados.
    """
    content = await file.read()
    text = ""

    if file.filename.lower().endswith(".pdf"):
        try:
            import fitz  # PyMuPDF
            doc = fitz.open(stream=content, filetype="pdf")
            text = "\n".join(page.get_text() for page in doc)
        except ImportError:
            # Fallback: decode as text
            text = content.decode("utf-8", errors="ignore")
    else:
        text = content.decode("utf-8", errors="ignore")

    model = _get_gemini()
    prompt = f"""
Analise o currículo abaixo e retorne um JSON estruturado com os campos:
- name (string)
- email (string)
- phone (string)
- linkedin (string)
- summary (string, resumo profissional em 2 linhas)
- skills (array de strings)
- languages (array: [{{"lang": "Inglês", "level": "Fluente"}}])
- experience (array: [{{"company": str, "role": str, "duration": str, "summary": str}}])
- education (array: [{{"institution": str, "degree": str, "year": str}}])
- seniority_level (string: "Júnior/Pleno/Sênior/Especialista")

Currículo:
{text[:8000]}

Responda SOMENTE com o JSON válido, sem markdown.
"""
    try:
        response = model.generate_content(prompt)
        import json, re
        raw = response.text.strip()
        raw = re.sub(r"```json|```", "", raw).strip()
        return json.loads(raw)
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Erro ao processar currículo: {e}")


# ─── DISC / BIG5 ANALYSIS ──────────────────────────────────────────────────────

class DISCRequest(BaseModel):
    cover_letter: str
    candidate_name: Optional[str] = "Candidato"


@router.post("/disc-analysis")
async def disc_analysis(
    data: DISCRequest,
    current_user: User = Depends(get_current_user),
):
    """
    Analisa a carta de apresentação do candidato e retorna perfil DISC + Big5.
    """
    model = _get_gemini()
    prompt = f"""
Você é um especialista em psicologia organizacional. Analise o texto abaixo e retorne o perfil comportamental do candidato {data.candidate_name}.

Retorne um JSON com:
{{
  "disc": {{
    "dominance": 0-100,
    "influence": 0-100,
    "steadiness": 0-100,
    "conscientiousness": 0-100,
    "primary_style": "D|I|S|C",
    "description": "Perfil em 2 linhas"
  }},
  "big5": {{
    "openness": 0-100,
    "conscientiousness": 0-100,
    "extraversion": 0-100,
    "agreeableness": 0-100,
    "neuroticism": 0-100
  }},
  "strengths": ["lista de 3 pontos fortes"],
  "risks": ["lista de 2 pontos de atenção"],
  "ideal_roles": ["lista de 3 cargos ideais para este perfil"],
  "fit_recommendation": "Alto/Médio/Baixo",
  "fit_justification": "1 parágrafo"
}}

Carta de apresentação:
{data.cover_letter[:4000]}

Responda SOMENTE com JSON válido, sem markdown.
"""
    try:
        response = model.generate_content(prompt)
        import json, re
        raw = re.sub(r"```json|```", "", response.text.strip()).strip()
        return json.loads(raw)
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Erro na análise DISC: {e}")


# ─── TECH TEST GENERATOR ───────────────────────────────────────────────────────

class TestGenRequest(BaseModel):
    job_title: str
    tech_stack: str  # ex: "Python, FastAPI, PostgreSQL"
    seniority: str  # "Júnior" | "Pleno" | "Sênior"
    num_questions: int = 5


@router.post("/generate-test")
async def generate_tech_test(
    data: TestGenRequest,
    current_user: User = Depends(get_current_user),
):
    """
    Gera um teste técnico ÚNICO e personalizado para a vaga.
    """
    model = _get_gemini()
    prompt = f"""
Crie um teste técnico ÚNICO (nunca repetido) para uma vaga de {data.job_title} nível {data.seniority}.
Stack: {data.tech_stack}.

Gere exatamente {data.num_questions} questões. Retorne um JSON:
{{
  "title": "Teste técnico para {data.job_title} ({data.seniority})",
  "estimated_time_minutes": número,
  "instructions": "instruções gerais",
  "questions": [
    {{
      "number": 1,
      "type": "multiple_choice|open|coding",
      "question": "enunciado",
      "options": ["A) ...", "B) ...", "C) ...", "D) ..."],  // só para multiple_choice
      "expected_answer": "resposta esperada (para corrigir)",
      "points": 10
    }}
  ]
}}

Varie os tipos: inclua pelo menos 1 questão de código, 1 teórica e 1 situacional.
Responda SOMENTE com JSON válido, sem markdown.
"""
    try:
        response = model.generate_content(prompt)
        import json, re
        raw = re.sub(r"```json|```", "", response.text.strip()).strip()
        return json.loads(raw)
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Erro ao gerar teste: {e}")


# ─── KILLER QUESTIONS SUGGESTION ──────────────────────────────────────────────

class KillerSuggestRequest(BaseModel):
    job_title: str
    job_description: str


@router.post("/suggest-killer-questions")
async def suggest_killer_questions(
    data: KillerSuggestRequest,
    current_user: User = Depends(get_current_user),
):
    """
    IA sugere killer questions para uma vaga específica.
    """
    model = _get_gemini()
    prompt = f"""
Sugira 5 killer questions (perguntas eliminatórias) para a vaga de {data.job_title}.

Descrição da vaga: {data.job_description[:2000]}

Retorne um JSON assim:
{{
  "questions": [
    {{
      "question": "texto da pergunta",
      "expected_answer": "resposta ideal",
      "is_eliminatory": true/false,
      "why": "por que essa pergunta faz diferença"
    }}
  ]
}}

Responda SOMENTE com JSON válido, sem markdown.
"""
    try:
        response = model.generate_content(prompt)
        import json, re
        raw = re.sub(r"```json|```", "", response.text.strip()).strip()
        return json.loads(raw)
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Erro ao sugerir perguntas: {e}")
