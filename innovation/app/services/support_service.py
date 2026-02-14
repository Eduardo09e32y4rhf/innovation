from sqlalchemy.orm import Session
from datetime import datetime, timedelta
from ..models.ticket import Ticket, TicketCategory
import json

class SupportService:
    @staticmethod
    def create_ticket(db: Session, title: str, description: str, requester_id: int):
        # IA Classifica a Categoria (Simulação)
        # Em produção, chamaríamos o Gemini aqui
        category = db.query(TicketCategory).first() # TI por padrão
        
        sla_hours = category.expected_sla_hours if category else 24
        deadline = datetime.utcnow() + timedelta(hours=sla_hours)
        
        ticket = Ticket(
            title=title,
            description=description,
            requester_id=requester_id,
            category_id=category.id if category else 1,
            sla_deadline=deadline
        )
        db.add(ticket)
        db.commit()
        db.refresh(ticket)
        return ticket

    @staticmethod
    def get_ai_smart_reply(ticket_id: int, description: str):
        # Simula resposta sugerida pela IA
        if "senha" in description.lower():
            return "Sugestão IA: Para resetar sua senha, acesse as configurações de segurança no seu perfil ou use o botão 'Esqueci minha senha' na tela de login."
        return "Sugestão IA: Analisando seu ticket. Um atendente N1 entrará em contato em breve."

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
