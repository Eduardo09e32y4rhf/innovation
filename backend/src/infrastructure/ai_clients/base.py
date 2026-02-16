from abc import ABC, abstractmethod
from typing import Dict, List, Any


class AIProvider(ABC):
    """
    Interface base para provedores de IA (Gemini, OpenAI, Anthropic).
    Garante que todos os serviços sigam o mesmo contrato.
    """

    @abstractmethod
    async def analyze_resume(self, resume_text: str, job_description: str) -> Dict:
        """Analisa currículo vs vaga."""
        pass

    @abstractmethod
    async def chat_recruiter(self, message: str, context: str = "") -> str:
        """Chat com recrutador virtual."""
        pass

    @abstractmethod
    async def financial_insights(self, transactions: List[Dict]) -> Dict:
        """Gera insights financeiros."""
        pass

    @abstractmethod
    async def project_insights(self, tasks: List[Dict]) -> Dict:
        """Gera insights de projetos."""
        pass
