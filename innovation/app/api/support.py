from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from ..db.dependencies import get_db
from ..services.support_service import support_service
from pydantic import BaseModel
from typing import List

router = APIRouter(prefix="/api/support", tags=["support"])

class TicketCreate(BaseModel):
    title: str
    description: str

@router.post("/tickets")
async def create_ticket(data: TicketCreate, db: Session = Depends(get_db)):
    # Mock user_id = 1
    return support_service.create_ticket(db, data.title, data.description, 1)

@router.get("/tickets")
async def list_tickets(db: Session = Depends(get_db)):
    from ..models.ticket import Ticket
    return db.query(Ticket).all()

@router.get("/tickets/{ticket_id}/smart-reply")
async def get_reply(ticket_id: int, description: str):
    return {"reply": support_service.get_ai_smart_reply(ticket_id, description)}

@router.get("/system-status")
async def get_system_status():
    return {
        "api": "online",
        "database": "online",
        "ia_service": "online",
        "integrations": {
            "sendgrid": "online",
            "whatsapp": "online"
        }
    }
