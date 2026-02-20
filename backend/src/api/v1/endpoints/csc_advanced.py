"""
CSC/Service Desk Advanced — Queues, SLA, KB, CSAT, Spike Detection, Webhooks
"""

import os
import json
import hmac
import hashlib
import httpx
from datetime import datetime, timedelta
from fastapi import APIRouter, Depends, HTTPException, BackgroundTasks
from sqlalchemy.orm import Session
from pydantic import BaseModel
from typing import Optional, List

from infrastructure.database.sql.dependencies import get_db
from core.dependencies import get_current_user
from domain.models.user import User
from domain.models.ticket import Ticket
from domain.models.csm_models import KBArticle, TicketRating, WebhookSubscription

router = APIRouter(prefix="/api/support/v2", tags=["csc-advanced"])


# ─── TICKET QUEUES ─────────────────────────────────────────────────────────────

QUEUES = ["N1", "N2", "DEV", "BKO", "RET", "COB", "CONT"]

SLA_HOURS = {
    "N1": 2,
    "N2": 8,
    "DEV": 48,
    "BKO": 24,
    "RET": 1,
    "COB": 4,
    "CONT": 12,
}


@router.get("/queues")
def list_queues(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Lista tickets agrupados por fila."""
    from domain.models.company import Company

    company = db.query(Company).filter(Company.owner_user_id == current_user.id).first()
    company_id = company.id if company else None

    if not company_id:
        # Fallback for non-owners: only own tickets? Or empty?
        # Let's return empty/filtered for safety
        return {
            q: {"count": 0, "sla_hours": SLA_HOURS.get(q, 24), "tickets": []}
            for q in QUEUES
        }

    result = {}
    for queue in QUEUES:
        tickets = (
            db.query(Ticket)
            .filter(
                Ticket.company_id == company_id,
                Ticket.queue == queue,
                Ticket.status != "closed",
            )
            .order_by(Ticket.created_at.asc())
            .all()
        )
        result[queue] = {
            "count": len(tickets),
            "sla_hours": SLA_HOURS.get(queue, 24),
            "tickets": [
                {
                    "id": t.id,
                    "title": t.title,
                    "status": t.status,
                    "priority": getattr(t, "priority", "normal"),
                    "created_at": str(t.created_at),
                    "sla_deadline": (
                        str(t.created_at + timedelta(hours=SLA_HOURS.get(queue, 24)))
                        if t.created_at
                        else None
                    ),
                    "sla_breached": (
                        (
                            datetime.utcnow()
                            > t.created_at + timedelta(hours=SLA_HOURS.get(queue, 24))
                        )
                        if t.created_at
                        else False
                    ),
                }
                for t in tickets
            ],
        }
    return result


@router.patch("/tickets/{ticket_id}/assign-queue")
def assign_queue(
    ticket_id: int,
    queue: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    if queue not in QUEUES:
        raise HTTPException(status_code=400, detail=f"Fila inválida. Válidas: {QUEUES}")

    from domain.models.company import Company

    company = db.query(Company).filter(Company.owner_user_id == current_user.id).first()
    company_id = company.id if company else None

    ticket = (
        db.query(Ticket)
        .filter(
            Ticket.id == ticket_id,
            (
                Ticket.company_id == company_id if company_id else True
            ),  # Fail safe? No, should be strict
        )
        .first()
    )

    if not ticket or (company_id and ticket.company_id != company_id):
        raise HTTPException(
            status_code=404, detail="Ticket não encontrado ou acesso negado"
        )

    ticket.queue = queue
    db.commit()
    db.refresh(ticket)
    return {"ok": True, "ticket_id": ticket_id, "queue": queue}


# ─── SLA ───────────────────────────────────────────────────────────────────────


@router.get("/tickets/{ticket_id}/sla")
def get_ticket_sla(
    ticket_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    ticket = db.query(Ticket).filter(Ticket.id == ticket_id).first()
    if not ticket:
        raise HTTPException(status_code=404, detail="Ticket não encontrado")

    queue = getattr(ticket, "queue", "N1") or "N1"
    sla_hours = SLA_HOURS.get(queue, 24)
    deadline = (
        ticket.created_at + timedelta(hours=sla_hours) if ticket.created_at else None
    )
    now = datetime.utcnow()
    remaining = (deadline - now).total_seconds() if deadline else 0
    breached = remaining < 0

    return {
        "ticket_id": ticket_id,
        "queue": queue,
        "sla_hours": sla_hours,
        "deadline": str(deadline),
        "remaining_seconds": max(0, remaining),
        "remaining_human": (
            f"{int(remaining // 3600)}h {int((remaining % 3600) // 60)}m"
            if remaining > 0
            else "VENCIDO"
        ),
        "sla_status": (
            "red" if breached else ("yellow" if remaining < 3600 else "green")
        ),
        "breached": breached,
    }


@router.post("/escalate-breached")
def escalate_breached_tickets(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Verifica tickets com SLA vencido e escala."""
    # Only verify for current company if user triggers it manually?
    # Or optimize to run background job?
    # Assuming manual trigger by admin/company owner for their own tickets.
    from domain.models.company import Company

    company = db.query(Company).filter(Company.owner_user_id == current_user.id).first()
    if not company:
        return {"escalated_count": 0, "ticket_ids": []}

    escalated = []
    open_tickets = (
        db.query(Ticket)
        .filter(
            Ticket.company_id == company.id, Ticket.status.in_(["open", "in_progress"])
        )
        .all()
    )

    now = datetime.utcnow()
    for ticket in open_tickets:
        queue = getattr(ticket, "queue", "N1") or "N1"
        sla_hours = SLA_HOURS.get(queue, 24)
        if ticket.created_at:
            deadline = ticket.created_at + timedelta(hours=sla_hours)
            if now > deadline and getattr(ticket, "escalated", False) is False:
                ticket.priority = "urgent"
                if hasattr(ticket, "escalated"):
                    ticket.escalated = True
                escalated.append(ticket.id)
    db.commit()
    return {"escalated_count": len(escalated), "ticket_ids": escalated}


# ─── KNOWLEDGE BASE ────────────────────────────────────────────────────────────


class KBArticleCreate(BaseModel):
    title: str
    content: str
    category: Optional[str] = None
    tags: Optional[str] = None


@router.post("/kb")
def create_kb_article(
    data: KBArticleCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    from domain.models.company import Company

    company = db.query(Company).filter(Company.owner_user_id == current_user.id).first()
    article = KBArticle(
        company_id=company.id if company else None,
        **data.model_dump(),
    )
    db.add(article)
    db.commit()
    db.refresh(article)
    return article


@router.get("/kb")
def list_kb_articles(
    q: Optional[str] = None,
    category: Optional[str] = None,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),  # Add user to filter by company
):
    from domain.models.company import Company

    company = db.query(Company).filter(Company.owner_user_id == current_user.id).first()

    query = db.query(KBArticle).filter(KBArticle.is_published == True)

    if company:
        # Filter by company OR public (if implementing public KB later)
        # For now, isolate by company
        query = query.filter(KBArticle.company_id == company.id)
    else:
        # If not company owner, what? Return none?
        return []

    if q:
        query = query.filter(
            (KBArticle.title.ilike(f"%{q}%")) | (KBArticle.content.ilike(f"%{q}%"))
        )
    if category:
        query = query.filter(KBArticle.category == category)
    return query.order_by(KBArticle.views.desc()).limit(20).all()


@router.get("/kb/suggest")
def suggest_kb_articles(
    ticket_title: str,
    db: Session = Depends(get_db),
):
    """Sugere artigos da KB antes de abrir chamado (reduz N1)."""
    words = ticket_title.lower().split()
    results = []
    for word in words[:3]:
        articles = (
            db.query(KBArticle)
            .filter(
                KBArticle.is_published == True,
                KBArticle.title.ilike(f"%{word}%"),
            )
            .limit(3)
            .all()
        )
        results.extend(articles)
    seen = set()
    unique = [a for a in results if a.id not in seen and not seen.add(a.id)]
    return unique[:5]


@router.post("/kb/{article_id}/view")
def mark_kb_view(article_id: int, db: Session = Depends(get_db)):
    article = db.query(KBArticle).filter(KBArticle.id == article_id).first()
    if article:
        article.views += 1
        db.commit()
    return {"ok": True}


# ─── CSAT ──────────────────────────────────────────────────────────────────────


class CSATCreate(BaseModel):
    score: int  # 1-5
    comment: Optional[str] = None


@router.post("/tickets/{ticket_id}/rate")
def rate_ticket(
    ticket_id: int,
    data: CSATCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    if not 1 <= data.score <= 5:
        raise HTTPException(status_code=400, detail="Score deve ser entre 1 e 5")
    existing = (
        db.query(TicketRating)
        .filter(
            TicketRating.ticket_id == ticket_id,
            TicketRating.user_id == current_user.id,
        )
        .first()
    )
    if existing:
        existing.score = data.score
        existing.comment = data.comment
        db.commit()
        return existing
    rating = TicketRating(
        ticket_id=ticket_id, user_id=current_user.id, **data.model_dump()
    )
    db.add(rating)
    db.commit()
    db.refresh(rating)
    return rating


@router.get("/csat/summary")
def csat_summary(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    from domain.models.company import Company

    company = db.query(Company).filter(Company.owner_user_id == current_user.id).first()
    if not company:
        return {"average": 0, "total": 0, "distribution": {}}

    ratings = (
        db.query(TicketRating)
        .join(Ticket)
        .filter(Ticket.company_id == company.id)
        .all()
    )

    if not ratings:
        return {"average": 0, "total": 0, "distribution": {}}
    avg = sum(r.score for r in ratings) / len(ratings)
    dist = {str(i): sum(1 for r in ratings if r.score == i) for i in range(1, 6)}
    return {"average": round(avg, 2), "total": len(ratings), "distribution": dist}


# ─── SPIKE DETECTION ───────────────────────────────────────────────────────────


@router.get("/analytics/spikes")
def detect_spikes(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Detecta spikes de tickets na última hora vs média das últimas 24h."""
    from domain.models.company import Company

    company = db.query(Company).filter(Company.owner_user_id == current_user.id).first()
    if not company:
        return {"is_spike": False, "severity": "normal"}

    now = datetime.utcnow()
    last_hour = now - timedelta(hours=1)
    last_24h = now - timedelta(hours=24)

    base_query = db.query(Ticket).filter(Ticket.company_id == company.id)

    hour_count = base_query.filter(Ticket.created_at >= last_hour).count()
    day_count = base_query.filter(Ticket.created_at >= last_24h).count()
    hourly_avg = day_count / 24 if day_count else 0
    spike_ratio = hour_count / hourly_avg if hourly_avg > 0 else 0

    # Top categories in last hour
    recent_tickets = base_query.filter(Ticket.created_at >= last_hour).all()
    categories: dict = {}
    for t in recent_tickets:
        cat = getattr(t, "category", "Geral") or "Geral"
        categories[cat] = categories.get(cat, 0) + 1

    top_offenders = sorted(categories.items(), key=lambda x: x[1], reverse=True)[:3]

    return {
        "tickets_last_hour": hour_count,
        "hourly_average_24h": round(hourly_avg, 1),
        "spike_ratio": round(spike_ratio, 2),
        "is_spike": spike_ratio > 2.5,
        "severity": (
            "critical"
            if spike_ratio > 5
            else ("warning" if spike_ratio > 2.5 else "normal")
        ),
        "top_offenders": [{"category": k, "count": v} for k, v in top_offenders],
    }


# ─── WEBHOOKS ──────────────────────────────────────────────────────────────────


class WebhookCreate(BaseModel):
    url: str
    events: List[str]  # ["ticket.created", "ticket.updated"]
    secret: Optional[str] = None


@router.post("/webhooks")
def create_webhook(
    data: WebhookCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    from domain.models.company import Company

    company = db.query(Company).filter(Company.owner_user_id == current_user.id).first()
    if not company:
        raise HTTPException(
            status_code=403, detail="Apenas empresas podem criar webhooks"
        )
    wh = WebhookSubscription(
        company_id=company.id,
        url=data.url,
        events=",".join(data.events),
        secret=data.secret,
    )
    db.add(wh)
    db.commit()
    db.refresh(wh)
    return wh


@router.get("/webhooks")
def list_webhooks(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    from domain.models.company import Company

    company = db.query(Company).filter(Company.owner_user_id == current_user.id).first()
    if not company:
        return []
    return (
        db.query(WebhookSubscription)
        .filter(WebhookSubscription.company_id == company.id)
        .all()
    )


@router.delete("/webhooks/{wh_id}", status_code=204)
def delete_webhook(
    wh_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    from domain.models.company import Company

    company = db.query(Company).filter(Company.owner_user_id == current_user.id).first()
    if not company:
        raise HTTPException(status_code=403, detail="Acesso negado")

    wh = (
        db.query(WebhookSubscription)
        .filter(
            WebhookSubscription.id == wh_id,
            WebhookSubscription.company_id == company.id,
        )
        .first()
    )

    if not wh:
        raise HTTPException(
            status_code=404, detail="Webhook não encontrado ou acesso negado"
        )
    db.delete(wh)
    db.commit()
