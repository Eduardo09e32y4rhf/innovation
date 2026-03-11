from fastapi import APIRouter
from typing import Dict, Any
from pathlib import Path
import json

router = APIRouter(prefix="/innovation-ia", tags=["Innovation IA - VPS Sync"])

KNOWLEDGE_FILE = (
    Path(__file__).parent.parent.parent.parent / "innovation_knowledge.json"
)


@router.post("/sync-knowledge")
async def sync_knowledge(data: Dict[str, Any]):
    """
    Recebe aprendizados vindos da Vercel (Innovation Brain) e alimenta o banco local na VPS.
    """
    try:
        current_knowledge = {}
        if KNOWLEDGE_FILE.exists():
            with open(KNOWLEDGE_FILE, "r", encoding="utf-8") as f:
                current_knowledge = json.load(f)

        # Adiciona a nova experiência
        if "experiencias" not in current_knowledge:
            current_knowledge["experiencias"] = []

        current_knowledge["experiencias"].append(
            {
                "query": data.get("message"),
                "answer": data.get("answer"),
                "source": data.get("source", "external"),
                "timestamp": "auto-sync",
            }
        )

        with open(KNOWLEDGE_FILE, "w", encoding="utf-8") as f:
            json.dump(current_knowledge, f, indent=4, ensure_ascii=False)

        return {"status": "Knowledge synchronized on VPS"}
    except Exception as e:
        import logging
        logger = logging.getLogger(__name__)
        logger.error(f"Erro ao sincronizar conhecimento: {str(e)}")
        return {"status": "error", "detail": "Erro interno ao processar sincronização"}
