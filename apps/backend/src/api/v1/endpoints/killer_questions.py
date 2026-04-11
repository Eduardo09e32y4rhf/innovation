"""
Killer Questions endpoint — per-job dynamic screening questions
"""

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from pydantic import BaseModel
from typing import Optional, List

from infrastructure.database.sql.dependencies import get_db
from core.dependencies import get_current_user, require_active_company, require_role
from core.roles import Role
from domain.models.user import User
from domain.models.killer_question import KillerQuestion

router = APIRouter(prefix="/api/jobs", tags=["killer-questions"])


class KillerQuestionCreate(BaseModel):
    question: str
    expected_answer: Optional[str] = None
    is_eliminatory: bool = False
    order: int = 0


@router.get("/{job_id}/questions")
def list_questions(job_id: int, db: Session = Depends(get_db)):
    return (
        db.query(KillerQuestion)
        .filter(KillerQuestion.job_id == job_id)
        .order_by(KillerQuestion.order)
        .all()
    )


@router.post("/{job_id}/questions")
def create_question(
    job_id: int,
    data: KillerQuestionCreate,
    db: Session = Depends(get_db),
    company_id: int = Depends(require_active_company),
    current_user: User = Depends(require_role(Role.COMPANY)),
):
    # Verifica se a vaga pertence à empresa
    from domain.models.job import Job

    job = db.query(Job).filter(Job.id == job_id, Job.company_id == company_id).first()
    if not job:
        raise HTTPException(status_code=403, detail="Vaga não pertence à sua empresa")

    q = KillerQuestion(job_id=job_id, **data.model_dump())
    db.add(q)
    db.commit()
    db.refresh(q)
    return q


@router.delete("/{job_id}/questions/{question_id}", status_code=204)
def delete_question(
    job_id: int,
    question_id: int,
    db: Session = Depends(get_db),
    company_id: int = Depends(require_active_company),
    current_user: User = Depends(require_role(Role.COMPANY)),
):
    # Verifica se a vaga pertence à empresa
    from domain.models.job import Job

    job = db.query(Job).filter(Job.id == job_id, Job.company_id == company_id).first()
    if not job:
        raise HTTPException(status_code=403, detail="Acesso negado")

    q = (
        db.query(KillerQuestion)
        .filter(KillerQuestion.id == question_id, KillerQuestion.job_id == job_id)
        .first()
    )
    if not q:
        raise HTTPException(status_code=404, detail="Pergunta não encontrada")
    db.delete(q)
    db.commit()
