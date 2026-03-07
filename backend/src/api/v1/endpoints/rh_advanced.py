"""
Expanded RH endpoint — 360° Reviews, PDI, Time Bank, Payslips
Complementa o rh.py existente com os novos módulos.
"""

from fastapi import APIRouter, Depends, HTTPException, UploadFile, File
from sqlalchemy.orm import Session
from sqlalchemy import func
from pydantic import BaseModel
from typing import Optional, List
from datetime import datetime

from infrastructure.database.sql.dependencies import get_db
from core.dependencies import get_current_user
from domain.models.user import User
from domain.models.review_360 import Review360
from domain.models.pdi_goal import PDIGoal
from domain.models.time_bank import TimeBank
from domain.models.payslip import Payslip

router = APIRouter(prefix="/api/rh/v2", tags=["rh-advanced"])


# ─── 360° REVIEWS ──────────────────────────────────────────────────────────────


class Review360Create(BaseModel):
    subject_user_id: int
    relationship: str  # peer | manager | subordinate
    score: float
    feedback: Optional[str] = None
    period: str  # Q1-2026
    skills: Optional[dict] = None


@router.post("/reviews-360")
def create_review_360(
    data: Review360Create,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    review = Review360(
        reviewer_user_id=current_user.id,
        **data.model_dump(),
    )
    db.add(review)
    db.commit()
    db.refresh(review)
    return review


@router.get("/reviews-360/{user_id}")
def get_reviews_360(
    user_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    reviews = db.query(Review360).filter(Review360.subject_user_id == user_id).all()
    if not reviews:
        return {"reviews": [], "average_score": 0, "by_relationship": {}}

    avg = sum(r.score for r in reviews) / len(reviews)
    by_rel: dict = {}
    for r in reviews:
        if r.relationship not in by_rel:
            by_rel[r.relationship] = []
        by_rel[r.relationship].append(r.score)
    avg_by_rel = {k: round(sum(v) / len(v), 1) for k, v in by_rel.items()}

    return {
        "reviews": reviews,
        "average_score": round(avg, 1),
        "by_relationship": avg_by_rel,
    }


# ─── PDI ───────────────────────────────────────────────────────────────────────


class PDIGoalCreate(BaseModel):
    title: str
    description: Optional[str] = None
    quarter: str
    due_date: Optional[str] = None


@router.post("/pdi")
def create_pdi_goal(
    data: PDIGoalCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    # Get company_id from user
    from domain.models.company import Company

    company = db.query(Company).filter(Company.owner_user_id == current_user.id).first()
    company_id = company.id if company else current_user.id

    goal = PDIGoal(
        user_id=current_user.id,
        company_id=company_id,
        title=data.title,
        description=data.description,
        quarter=data.quarter,
        due_date=datetime.fromisoformat(data.due_date) if data.due_date else None,
    )
    db.add(goal)
    db.commit()
    db.refresh(goal)
    return goal


@router.get("/pdi")
def list_pdi_goals(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    return db.query(PDIGoal).filter(PDIGoal.user_id == current_user.id).all()


@router.patch("/pdi/{goal_id}/progress")
def update_pdi_progress(
    goal_id: int,
    progress: float,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    goal = (
        db.query(PDIGoal)
        .filter(PDIGoal.id == goal_id, PDIGoal.user_id == current_user.id)
        .first()
    )
    if not goal:
        raise HTTPException(status_code=404, detail="Meta não encontrada")
    goal.progress = min(100.0, max(0.0, progress))
    goal.completed = goal.progress >= 100.0
    db.commit()
    db.refresh(goal)
    return goal


# ─── TIME BANK ─────────────────────────────────────────────────────────────────


class TimeBankEntry(BaseModel):
    type: str  # credit | debit
    hours: float
    reason: Optional[str] = None
    created_at: Optional[str] = None


@router.post("/time-bank")
def add_time_bank_entry(
    data: TimeBankEntry,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    from domain.models.company import Company

    company = db.query(Company).filter(Company.owner_user_id == current_user.id).first()
    company_id = company.id if company else 0

    entry = TimeBank(
        user_id=current_user.id,
        company_id=company_id,
        type=data.type,
        hours=data.hours,
        reason=data.reason,
    )
    if data.created_at:
        try:
            from datetime import timezone

            # Convert string to datetime, handling Z or timezone offsets
            dt = datetime.fromisoformat(data.created_at.replace("Z", "+00:00"))
            entry.created_at = dt.astimezone(timezone.utc).replace(tzinfo=None)
        except ValueError:
            pass

    db.add(entry)
    db.commit()
    db.refresh(entry)
    return entry


@router.get("/time-bank/balance")
def get_time_bank_balance(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    entries = (
        db.query(TimeBank)
        .filter(
            TimeBank.user_id == current_user.id,
            TimeBank.status == "approved",
        )
        .all()
    )
    credits = sum(e.hours for e in entries if e.type == "credit")
    debits = sum(e.hours for e in entries if e.type == "debit")
    return {
        "total_credit_hours": credits,
        "total_debit_hours": debits,
        "balance_hours": credits - debits,
        "entries": entries,
    }


@router.patch("/time-bank/{entry_id}/approve")
def approve_time_bank(
    entry_id: int,
    approve: bool = True,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    entry = db.query(TimeBank).filter(TimeBank.id == entry_id).first()
    if not entry:
        raise HTTPException(status_code=404, detail="Lançamento não encontrado")
    entry.status = "approved" if approve else "rejected"
    entry.approved_by = current_user.id
    db.commit()
    db.refresh(entry)
    return entry


# ─── PAYSLIPS (HOLERITE) ───────────────────────────────────────────────────────


class PayslipCreate(BaseModel):
    user_id: int
    reference_month: str  # "2026-02"
    gross_salary: float
    net_salary: float
    deductions: float = 0.0


@router.post("/payslips")
def upload_payslip(
    data: PayslipCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Contador/Admin faz upload do holerite"""
    # Check if target user exists
    target_user = db.query(User).filter(User.id == data.user_id).first()
    if not target_user:
        raise HTTPException(status_code=404, detail="Funcionário não encontrado")

    from domain.models.company import Company

    company = db.query(Company).filter(Company.owner_user_id == current_user.id).first()
    company_id = company.id if company else 0

    slip = Payslip(
        user_id=data.user_id,
        company_id=company_id,
        reference_month=data.reference_month,
        gross_salary=data.gross_salary,
        net_salary=data.net_salary,
        deductions=data.deductions,
    )
    db.add(slip)
    db.commit()
    db.refresh(slip)
    return slip


@router.get("/payslips/me")
def list_my_payslips(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    return (
        db.query(Payslip)
        .filter(Payslip.user_id == current_user.id)
        .order_by(Payslip.reference_month.desc())
        .all()
    )


@router.get("/payslips/team")
def list_team_payslips(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Manager/Admin vê holerites da equipe"""
    from domain.models.company import Company

    company = db.query(Company).filter(Company.owner_user_id == current_user.id).first()
    if not company:
        raise HTTPException(
            status_code=403, detail="Apenas empresas podem ver holerites da equipe"
        )
    return (
        db.query(Payslip)
        .filter(Payslip.company_id == company.id)
        .order_by(Payslip.reference_month.desc())
        .all()
    )


# ─── STRATEGIC HR (PAINEL DIRETOR) ───────────────────────────────────────────


@router.get("/employees")
def get_employees_list(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Lista todos os funcionários e calcula risco de turnover (mock-ia)"""
    # Em um cenário real, filtraríamos pela empresa do current_user
    users = db.query(User).filter(User.role != "admin").all()

    # ⚡ Bolt: Eagerly load all approved TimeBank hours grouped by user and type in a single query to eliminate O(N) queries loop
    # Why: Previously executed N separate database queries for each user's time bank balance inside a loop.
    # Impact: Reduces N+1 queries to O(1), significantly improving the employees list response time.
    balances_query = (
        db.query(
            TimeBank.user_id,
            TimeBank.type,
            func.sum(TimeBank.hours).label("total_hours"),
        )
        .filter(TimeBank.status == "approved")
        .group_by(TimeBank.user_id, TimeBank.type)
        .all()
    )

    balances_map = {}
    for user_id, type_, hours in balances_query:
        if user_id not in balances_map:
            balances_map[user_id] = {"credit": 0.0, "debit": 0.0}
        balances_map[user_id][type_] = float(hours or 0)

    # Lógica de IA Simplificada: Análise de Risco
    results = []
    for u in users:
        # Pega saldo do banco de horas do mapa (O(1))
        user_balance = balances_map.get(u.id, {"credit": 0.0, "debit": 0.0})
        credits = user_balance.get("credit", 0.0)
        debits = user_balance.get("debit", 0.0)
        balance = credits - debits

        # Define risco baseado no saldo ( burn-rate )
        risk = "stable"
        if balance > 30:
            risk = "attention"
        if balance > 60:
            risk = "critical"

        results.append(
            {
                "id": u.id,
                "name": u.name,
                "role": u.role,
                "department": "Geral",
                "status": "active",
                "risk": risk,
                "time_balance": balance,
            }
        )
    return results


@router.get("/employees/{user_id}/timeline")
def get_employee_timeline(
    user_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Gera a timeline histórica do colaborador"""
    # Mock de histórico para demonstração
    return [
        {
            "id": 1,
            "type": "promotion",
            "date": "2025-12-10",
            "title": "Promoção para Senior",
            "description": "Performance excepcional no Q4.",
        },
        {
            "id": 2,
            "type": "document",
            "date": "2025-11-05",
            "title": "Atestado Médico",
            "description": "Validado por IA Gemini.",
        },
        {
            "id": 3,
            "type": "hiring",
            "date": "2024-03-15",
            "title": "Admissão",
            "description": "Início da jornada na Innovation.ia.",
        },
    ]


@router.get("/turnover-alerts")
def get_turnover_alerts(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """IA detecta funcionários com alto risco de saída"""
    # Retorna apenas quem está em estado Crítico ou Atenção
    all_emps = get_employees_list(db, current_user)
    return [e for e in all_emps if e["risk"] != "stable"]


@router.post("/admission")
def start_admission(
    data: dict,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Inicia fluxo de admissão digital"""
    email = data.get("email")
    if not email:
        raise HTTPException(status_code=400, detail="Email é obrigatório")
    # Aqui dispararíamos o e-mail via SES/SendGrid/n8n
    return {"message": f"Convite enviado para {email}", "token": "adm_987654"}


@router.post("/documents/upload")
def upload_hr_document(
    id: int,
    file: UploadFile = File(...),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Upload de documentos com OCR Cognitivo (Gemini)"""
    # Em um cenário real, salvaríamos no S3/Supabase Storage
    # E chamaríamos o Gemini Vision para extrair dados
    return {
        "id": 123,
        "status": "verified",
        "extracted_data": {
            "name": "João Silva",
            "doc_type": "RG",
            "valid_until": "2030-01-01",
        },
        "message": "Documento validado pela IA com 98% de confiança",
    }
