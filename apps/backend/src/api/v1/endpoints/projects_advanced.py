"""
Projects Advanced — Workflow Triggers & Purchase Approvals
"""

from datetime import datetime
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from pydantic import BaseModel
from typing import Optional, List

from infrastructure.database.sql.dependencies import get_db
from core.dependencies import get_current_user
from domain.models.user import User
from domain.models.workflow_trigger import WorkflowTrigger
from domain.models.purchase_request import PurchaseRequest

router = APIRouter(prefix="/api/projects/v2", tags=["projects-advanced"])


# ─── WORKFLOW TRIGGERS ─────────────────────────────────────────────────────────


class WorkflowCreate(BaseModel):
    name: str
    trigger_event: str  # "task_moved_to_done" | "ticket_created" | "task_overdue"
    trigger_condition: Optional[dict] = None
    action_type: str  # "send_email" | "create_ticket" | "notify" | "slack"
    action_config: Optional[dict] = None


@router.post("/workflows")
def create_workflow(
    data: WorkflowCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    from domain.models.company import Company

    company = db.query(Company).filter(Company.owner_user_id == current_user.id).first()
    if not company:
        raise HTTPException(
            status_code=403, detail="Apenas empresas podem criar fluxos"
        )

    wf = WorkflowTrigger(
        company_id=company.id,
        name=data.name,
        trigger_event=data.trigger_event,
        trigger_condition=data.trigger_condition,
        action_type=data.action_type,
        action_config=data.action_config,
    )
    db.add(wf)
    db.commit()
    db.refresh(wf)
    return wf


@router.get("/workflows")
def list_workflows(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    from domain.models.company import Company

    company = db.query(Company).filter(Company.owner_user_id == current_user.id).first()
    if not company:
        return []
    return (
        db.query(WorkflowTrigger).filter(WorkflowTrigger.company_id == company.id).all()
    )


@router.patch("/workflows/{wf_id}/toggle")
def toggle_workflow(
    wf_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    # Validate workflow belongs to user's company
    wf = (
        db.query(WorkflowTrigger)
        .filter(
            WorkflowTrigger.id == wf_id,
            WorkflowTrigger.company_id == current_user.id,  # Assuming user is owner
        )
        .first()
    )

    if not wf:
        from domain.models.company import Company

        company = (
            db.query(Company).filter(Company.owner_user_id == current_user.id).first()
        )
        if company:
            wf = (
                db.query(WorkflowTrigger)
                .filter(
                    WorkflowTrigger.id == wf_id,
                    WorkflowTrigger.company_id == company.id,
                )
                .first()
            )

    if not wf:
        raise HTTPException(
            status_code=404, detail="Fluxo não encontrado ou acesso negado"
        )

    wf.is_active = not wf.is_active
    db.commit()
    return {"id": wf_id, "is_active": wf.is_active}


@router.post("/workflows/fire")
def fire_event(
    event: str,
    context: Optional[dict] = None,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """
    Dispara um evento e executa todos os fluxos matching.
    Retorna os fluxos executados (simulação - sem integração externa real).
    """
    from domain.models.company import Company

    company = db.query(Company).filter(Company.owner_user_id == current_user.id).first()
    if not company:
        return {"fired": 0}

    triggers = (
        db.query(WorkflowTrigger)
        .filter(
            WorkflowTrigger.company_id == company.id,
            WorkflowTrigger.trigger_event == event,
            WorkflowTrigger.is_active == True,
        )
        .all()
    )

    fired = []
    for trigger in triggers:
        # Log execution
        fired.append(
            {
                "trigger_id": trigger.id,
                "name": trigger.name,
                "action_type": trigger.action_type,
                "action_config": trigger.action_config,
                "status": "queued",
            }
        )
    return {"fired": len(fired), "executions": fired}


# ─── PURCHASE APPROVALS ────────────────────────────────────────────────────────


class PurchaseCreate(BaseModel):
    description: str
    amount: float
    category: Optional[str] = None


class PurchaseApproval(BaseModel):
    approve: bool
    note: Optional[str] = None


@router.post("/purchases")
def create_purchase_request(
    data: PurchaseCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    from domain.models.company import Company

    company = db.query(Company).filter(Company.owner_user_id == current_user.id).first()
    req = PurchaseRequest(
        requester_id=current_user.id,
        company_id=company.id if company else 0,
        description=data.description,
        amount=data.amount,
        category=data.category,
    )
    db.add(req)
    db.commit()
    db.refresh(req)
    return req


@router.get("/purchases")
def list_purchase_requests(
    status: Optional[str] = None,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    query = db.query(PurchaseRequest).filter(
        PurchaseRequest.requester_id == current_user.id
    )
    if status:
        query = query.filter(PurchaseRequest.status == status)
    return query.order_by(PurchaseRequest.id.desc()).all()


@router.get("/purchases/pending")
def list_pending_approvals(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Manager vê aprovações pendentes da empresa."""
    from domain.models.company import Company

    company = db.query(Company).filter(Company.owner_user_id == current_user.id).first()
    if not company:
        raise HTTPException(
            status_code=403, detail="Apenas gestores veem aprovações pendentes"
        )
    return (
        db.query(PurchaseRequest)
        .filter(
            PurchaseRequest.company_id == company.id,
            PurchaseRequest.status == "pending",
        )
        .order_by(PurchaseRequest.amount.desc())
        .all()
    )


@router.patch("/purchases/{req_id}/approve")
def approve_purchase(
    req_id: int,
    data: PurchaseApproval,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    # Determine user's company (ownership check)
    from domain.models.company import Company

    company = db.query(Company).filter(Company.owner_user_id == current_user.id).first()

    if not company:
        raise HTTPException(
            status_code=403, detail="Apenas donos de empresa podem aprovar compras"
        )

    # Fetch request and ensure it belongs to the company
    req = (
        db.query(PurchaseRequest)
        .filter(PurchaseRequest.id == req_id, PurchaseRequest.company_id == company.id)
        .first()
    )

    if not req:
        raise HTTPException(
            status_code=404, detail="Solicitação não encontrada para sua empresa"
        )

    req.status = "approved" if data.approve else "rejected"
    req.approver_id = current_user.id
    req.approver_note = data.note
    req.updated_at = datetime.utcnow()
    db.commit()
    db.refresh(req)
    return req
