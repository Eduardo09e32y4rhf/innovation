from typing import Any

from fastapi import FastAPI
from pydantic import BaseModel, Field

app = FastAPI(title="Innovation IA AI Service", version="1.0.0")


class GenerateMessageRequest(BaseModel):
    companyId: str
    prompt: str
    context: dict[str, Any] | None = None


class SummarizeConversationRequest(BaseModel):
    companyId: str
    conversationId: str
    messages: list[dict[str, Any]] = Field(default_factory=list)


class AnalyzeCandidateRequest(BaseModel):
    companyId: str
    candidate: dict[str, Any] | None = None


@app.get("/health")
def health() -> dict[str, str]:
    return {"status": "ok"}


@app.post("/generate-message")
def generate_message(payload: GenerateMessageRequest) -> dict[str, Any]:
    return {
        "message": f"Mensagem sugerida: {payload.prompt}",
        "companyId": payload.companyId,
    }


@app.post("/summarize-conversation")
def summarize_conversation(payload: SummarizeConversationRequest) -> dict[str, Any]:
    texts = [
        str(message.get("body", ""))
        for message in payload.messages
        if message.get("body")
    ]
    summary = " ".join(texts[:5])[:500]
    return {
        "conversationId": payload.conversationId,
        "summary": summary or "Sem mensagens suficientes para resumir.",
    }


@app.post("/analyze-candidate")
def analyze_candidate(payload: AnalyzeCandidateRequest) -> dict[str, Any]:
    candidate = payload.candidate or {}
    return {
        "candidateId": candidate.get("id"),
        "score": 50,
        "strengths": [],
        "risks": [],
        "recommendation": "Análise inicial gerada pelo serviço Python.",
    }
