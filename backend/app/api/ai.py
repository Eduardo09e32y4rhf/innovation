from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from typing import Optional
import os
import httpx

router = APIRouter(prefix="/api/ai", tags=["ai"])

ANTHROPIC_API_KEY = os.getenv("ANTHROPIC_API_KEY", "")

class QuestionRequest(BaseModel):
    question: str
    context: Optional[str] = None

@router.post("/ask")
async def ask_ai(data: QuestionRequest):
    """IA responde perguntas sobre recrutamento"""
    
    if not ANTHROPIC_API_KEY:
        return {
            "answer": "IA não configurada. Configure ANTHROPIC_API_KEY para usar este recurso.",
            "error": True
        }
    
    try:
        async with httpx.AsyncClient() as client:
            response = await client.post(
                "https://api.anthropic.com/v1/messages",
                headers={
                    "x-api-key": ANTHROPIC_API_KEY,
                    "anthropic-version": "2023-06-01",
                    "content-type": "application/json"
                },
                json={
                    "model": "claude-3-sonnet-20240229", # Ajustado para um modelo válido atual
                    "max_tokens": 1024,
                    "messages": [{
                        "role": "user",
                        "content": f"""Você é um assistente de recrutamento. Responda de forma concisa e útil.

Contexto: {data.context if data.context else 'Recrutamento geral'}

Pergunta: {data.question}

Responda em português brasileiro."""
                    }]
                },
                timeout=30.0
            )
            
            if response.status_code != 200:
                logger.error(f"Erro Antropic: {response.text}")
                raise HTTPException(500, "Erro ao consultar IA")
            
            result = response.json()
            answer = result["content"][0]["text"]
            
            return {
                "answer": answer,
                "error": False
            }
            
    except Exception as e:
        return {
            "answer": f"Erro: {str(e)}",
            "error": True
        }
