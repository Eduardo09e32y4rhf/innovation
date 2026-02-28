from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from infrastructure.database.sql.dependencies import get_db
from core.dependencies import get_current_user
from domain.models.user import User
from services.support_service import support_service
from pydantic import BaseModel

router = APIRouter(prefix="/support", tags=["support"])


class TicketCreate(BaseModel):
    title: str
    description: str


@router.post("/tickets")
async def create_ticket(
    data: TicketCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    from domain.models.company import Company

    company = db.query(Company).filter(Company.owner_user_id == current_user.id).first()
    company_id = company.id if company else None

    from services.audit_service import log_event

    ticket = support_service.create_ticket(
        db, data.title, data.description, current_user.id, company_id
    )

    log_event(
        db,
        "TICKET_CREATE",
        user_id=current_user.id,
        company_id=company_id,
        entity_type="ticket",
        entity_id=ticket.id,
        details=f"Criou ticket de suporte: {ticket.title}",
    )

    return ticket


@router.get("/tickets")
async def list_tickets(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    from domain.models.ticket import Ticket

    return db.query(Ticket).filter(Ticket.user_id == current_user.id).all()


@router.get("/tickets/all")
async def list_all_tickets(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Admin: lista todos os tickets"""
    from core.roles import Role

    if current_user.role not in [Role.ADM.value, Role.COMPANY.value]:
        raise HTTPException(status_code=403, detail="Acesso negado")
    from domain.models.ticket import Ticket
    from domain.models.company import Company

    if current_user.role == "admin":
        return db.query(Ticket).order_by(Ticket.id.desc()).all()

    company = db.query(Company).filter(Company.owner_user_id == current_user.id).first()
    if not company:
        # If not company owner, only see own tickets (fallback) or error?
        # Let's return own tickets to be safe
        return db.query(Ticket).filter(Ticket.requester_id == current_user.id).all()

    return (
        db.query(Ticket)
        .filter(Ticket.company_id == company.id)
        .order_by(Ticket.id.desc())
        .all()
    )


@router.get("/tickets/{ticket_id}/smart-reply")
async def get_reply(
    ticket_id: int,
    description: str,
    current_user: User = Depends(get_current_user),
):
    # Sanitização básica contra Prompt Injection
    clean_description = (
        description[:1000]
        .replace("ignore previous instructions", "")
        .replace("system prompt", "")
    )
    return {"reply": support_service.get_ai_smart_reply(ticket_id, clean_description)}


@router.get("/system-status")
async def get_system_status():
    return {
        "api": "online",
        "database": "online",
        "ia_service": "online",
        "integrations": {"sendgrid": "online", "whatsapp": "online"},
    }
