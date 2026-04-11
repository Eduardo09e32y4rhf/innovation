"""
SupportService — Suporte com IA Real
-------------------------------------
Correções:
- create_ticket: classifica categoria via Gemini ao invés de pegar sempre a primeira
- get_ai_smart_reply: gera resposta inteligente contextual via Gemini
"""

from sqlalchemy.orm import Session
from datetime import datetime, timedelta
from domain.models.ticket import Ticket, TicketCategory
import json
import os
import logging

logger = logging.getLogger(__name__)

try:
    from google import genai as google_genai
    _GENAI_AVAILABLE = True
except ImportError:
    _GENAI_AVAILABLE = False


def _get_gemini_client():
    try:
        from core.ai_key_manager import ai_key_manager
        keys = ai_key_manager.get_all_active_keys()
        api_key = keys[0] if keys else os.getenv("GEMINI_API_KEY", "")
    except Exception:
        api_key = os.getenv("GEMINI_API_KEY", "")
    if not api_key or not _GENAI_AVAILABLE:
        return None
    return google_genai.Client(api_key=api_key)


class SupportService:

    @staticmethod
    async def create_ticket(
        db: Session, title: str, description: str, requester_id: int, company_id: int
    ):
        """
        Cria ticket de suporte com classificação inteligente de categoria via Gemini.
        Fallback: pega a primeira categoria disponível se IA não estiver configurada.
        """
        categories = db.query(TicketCategory).all()
        category = None

        if categories:
            client = _get_gemini_client()
            if client:
                try:
                    cats_str = "\n".join([f"- {c.name} (SLA: {c.expected_sla_hours}h)" for c in categories])
                    prompt = (
                        f"Ticket de suporte:\nTítulo: {title}\nDescrição: {description}\n\n"
                        f"Categorias disponíveis:\n{cats_str}\n\n"
                        "Responda APENAS com o nome exato da categoria mais adequada (uma linha, sem explicação)."
                    )
                    response = client.models.generate_content(
                        model="gemini-1.5-flash",
                        contents=[{"role": "user", "parts": [{"text": prompt}]}],
                        config={"temperature": 0.1},
                    )
                    classified_name = response.text.strip().strip("- ").lower()
                    # Procura a categoria mais próxima do nome retornado
                    for c in categories:
                        if c.name.lower() in classified_name or classified_name in c.name.lower():
                            category = c
                            break
                    logger.info(f"Ticket '{title}' classificado como '{classified_name}'")
                except Exception as e:
                    logger.warning(f"Gemini falhou ao classificar ticket: {e}. Usando primeira categoria.")

            if not category:
                category = categories[0]

        sla_hours = category.expected_sla_hours if category else 24
        deadline = datetime.utcnow() + timedelta(hours=sla_hours)

        ticket = Ticket(
            title=title,
            description=description,
            requester_id=requester_id,
            category_id=category.id if category else 1,
            sla_deadline=deadline,
            company_id=company_id,
        )
        db.add(ticket)
        db.commit()
        db.refresh(ticket)
        return ticket

    @staticmethod
    async def get_ai_smart_reply(ticket_id: int, title: str, description: str) -> str:
        """
        Gera resposta sugerida pela IA para o atendente usando Gemini.
        Resposta contextual baseada no título e descrição real do ticket.
        """
        client = _get_gemini_client()
        if not client:
            # Fallback sem IA
            if "senha" in description.lower():
                return "Sugestão IA: Para resetar sua senha, acesse as configurações de segurança do seu perfil ou use 'Esqueci minha senha' na tela de login."
            return "Sugestão IA: Analisando seu ticket. Um atendente entrará em contato em breve."

        try:
            prompt = (
                "Você é um assistente de suporte técnico da Innovation.ia, uma plataforma SaaS corporativa. "
                "Gere uma resposta profissional e objetiva para o seguinte ticket de suporte:\n\n"
                f"Título: {title}\n"
                f"Descrição: {description}\n\n"
                "Regras:\n"
                "- Responda em português brasileiro\n"
                "- Seja empático e profissional\n"
                "- Forneça uma solução ou próximo passo claro\n"
                "- Máximo 3 parágrafos\n"
                "- Comece com 'Olá,' e termine com 'Atenciosamente, Suporte Innovation.ia'"
            )
            response = client.models.generate_content(
                model="gemini-1.5-flash",
                contents=[{"role": "user", "parts": [{"text": prompt}]}],
                config={"temperature": 0.5},
            )
            return response.text.strip()
        except Exception as e:
            logger.error(f"Gemini falhou ao gerar resposta para ticket {ticket_id}: {e}")
            return "Sugestão IA: Seu ticket foi recebido e nossa equipe analisará em breve. Obrigado pelo contato."

    @staticmethod
    def update_sla_status(db: Session):
        now = datetime.utcnow()
        tickets = db.query(Ticket).filter(Ticket.status != "resolved").all()
        for t in tickets:
            if t.sla_deadline and now > t.sla_deadline:
                t.sla_status = "breached"
            elif t.sla_deadline and now > (t.sla_deadline - timedelta(hours=2)):
                t.sla_status = "warning"
        db.commit()


support_service = SupportService()
