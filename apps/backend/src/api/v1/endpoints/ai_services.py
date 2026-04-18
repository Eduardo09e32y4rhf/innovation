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
import logging

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/api/ai", tags=["ai-services"])


from core.ai_key_manager import ai_key_manager


async def _gemini_generate_with_retry(
    model, contents, config=None, system_instruction=None
):
    import google.genai as genai

    active_keys = ai_key_manager.get_all_active_keys()
    last_error = None

    for api_key in active_keys:
        try:
            client = genai.Client(api_key=api_key)

            # Ajustar config para incluir system_instruction se fornecida
            final_config = config or {}
            if system_instruction:
                final_config["system_instruction"] = system_instruction

            response = client.models.generate_content(
                model=model, contents=contents, config=final_config
            )
            return response.text
        except Exception as e:
            if (
                "429" in str(e)
                or "quota" in str(e).lower()
                or "API_KEY_INVALID" in str(e)
            ):
                print(f"⚠️ Chave falhou nos serviços ({api_key[:10]}...): {e}")
                ai_key_manager.mark_as_exhausted(api_key)
                last_error = e
                continue
            raise e

    raise HTTPException(
        503, f"Todas as chaves falharam nos serviços de IA. {str(last_error)}"
    )


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

    # The original prompt is kept for the fallback mechanism
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
        # Tenta 2.0 primeiro com retry de chaves
        response_text = await _gemini_generate_with_retry(
            model="gemini-2.0-flash",
            contents=text[:16000],
            system_instruction="Você é um especialista em parsing de currículos. Extraia os dados e retorne SOMENTE um JSON válido.",
            config={"response_mime_type": "application/json"},
        )
        import json, re

        raw = response_text.strip()
        raw = re.sub(r"```json|```", "", raw).strip()
        return json.loads(raw)
    except Exception as e:
        # Fallback para 1.5 se o 2.0 falhar geral ou se persistir erro após rotação
        try:
            response_text = await _gemini_generate_with_retry(
                model="gemini-1.5-flash", contents=prompt
            )
            raw = re.sub(r"```json|```", "", response_text.strip()).strip()
            return json.loads(raw)
        except:
            logger.error(f"Erro CV: {e}")
            raise HTTPException(
                status_code=500, detail="Erro interno ao processar currículo"
            )


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
    # The original prompt is kept for the fallback mechanism
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
        response_text = await _gemini_generate_with_retry(
            model="gemini-2.0-flash",
            contents=f"Analise este texto: {data.cover_letter[:8000]}",
            system_instruction=f"""Você é um especialista em psicologia organizacional. Analise o texto e retorne o perfil comportamental do candidato {data.candidate_name} em JSON.
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
}}""",
            config={"response_mime_type": "application/json"},
        )
        import json, re

        raw = re.sub(r"```json|```", "", response_text.strip()).strip()
        return json.loads(raw)
    except Exception as e:
        try:
            response_text = await _gemini_generate_with_retry(
                model="gemini-1.5-flash", contents=prompt
            )
            raw = re.sub(r"```json|```", "", response_text.strip()).strip()
            return json.loads(raw)
        except:
            logger.error(f"Erro DISC: {e}")
            raise HTTPException(
                status_code=500, detail="Erro interno na análise DISC"
            )


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
    # The original prompt is kept for the fallback mechanism
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
        response_text = await _gemini_generate_with_retry(
            model="gemini-2.0-flash",
            contents=f"Vaga: {data.job_title}, Stack: {data.tech_stack}, Nível: {data.seniority}, Número de questões: {data.num_questions}",
            system_instruction=f"""Crie um teste técnico ÚNICO (nunca repetido) e personalizado para uma vaga de {data.job_title} nível {data.seniority}, com a stack: {data.tech_stack}.
Gere exatamente {data.num_questions} questões. Varie os tipos: inclua pelo menos 1 questão de código, 1 teórica e 1 situacional.
Retorne SOMENTE um JSON válido com a seguinte estrutura:
{{
  "title": "Teste técnico para {data.job_title} ({data.seniority})",
  "estimated_time_minutes": número,
  "instructions": "instruções gerais",
  "questions": [
    {{
      "number": 1,
      "type": "multiple_choice|open|coding",
      "question": "enunciado",
      "options": ["A) ...", "B) ...", "C) ...", "D) ..."],
      "expected_answer": "resposta esperada",
      "points": 10
    }}
  ]
}}""",
            config={"response_mime_type": "application/json"},
        )
        import json, re

        raw = re.sub(r"```json|```", "", response_text.strip()).strip()
        return json.loads(raw)
    except Exception as e:
        # Fallback para 1.5
        try:
            response_text = await _gemini_generate_with_retry(
                model="gemini-1.5-flash", contents=prompt
            )
            raw = re.sub(r"```json|```", "", response_text.strip()).strip()
            return json.loads(raw)
        except:
            logger.error(f"Erro Teste: {e}")
            raise HTTPException(
                status_code=500, detail="Erro interno ao gerar teste"
            )


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
        response_text = await _gemini_generate_with_retry(
            model="gemini-1.5-flash", contents=prompt
        )
        import json, re

        raw = re.sub(r"```json|```", "", response_text.strip()).strip()
        return json.loads(raw)
    except Exception as e:
        logger.error(f"Erro Perguntas: {e}")
        raise HTTPException(
            status_code=500, detail="Erro interno ao sugerir perguntas"
        )


# ─── RECEIPT OCR (ZERO PAPEL) ──────────────────────────────────────────────────


@router.post("/parse-receipt")
async def parse_receipt(
    file: UploadFile = File(...),
    current_user: User = Depends(get_current_user),
):
    """
    Usa Gemini 2.0 Flash (Vision) para extrair dados de um cupom fiscal/recibo.
    """
    import base64

    content = await file.read()
    base64_image = base64.b64encode(content).decode("utf-8")

    contents = [
        {"mime_type": file.content_type or "image/jpeg", "data": base64_image},
        "Extraia os dados deste recibo/cupom fiscal.",
    ]

    system_instruction = """Você é um especialista em contabilidade e OCR. 
Extraia os seguintes campos do recibo e retorne APENAS um JSON válido:
- supplier (nome do estabelecimento/posto)
- amount (valor total numérico, use ponto para decimas)
- date (data no formato ISO YYYY-MM-DD, se encontrar)
- category (estime a categoria: Combustível, Alimentação, Viagem, etc.)
- currency (moeda, ex: BRL)
- items (lista de itens detectados, ex: [{"desc": "Gasolina", "qty": 20, "price": 100}])
"""

    try:
        response_text = await _gemini_generate_with_retry(
            model="gemini-2.0-flash",
            contents=contents,
            system_instruction=system_instruction,
            config={"response_mime_type": "application/json"},
        )
        import json, re

        raw = re.sub(r"```json|```", "", response_text.strip()).strip()
        data = json.loads(raw)

        # Log event for audit and gamification
        db = next(get_db())
        from services.audit_service import log_event

        log_event(
            db,
            "receipt_scanned",
            user_id=current_user.id,
            details=f"Supplier: {data.get('supplier')}, Amount: {data.get('amount')}",
        )

        return data
    except Exception as e:
        logger.error(f"Erro recibo: {e}")
        raise HTTPException(
            status_code=500, detail="Erro interno ao processar recibo"
        )
