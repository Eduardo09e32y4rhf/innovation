from datetime import datetime, date
from typing import List, Optional, Any
from fastapi import APIRouter, Depends, HTTPException, Body
from sqlalchemy.orm import Session, joinedload
from sqlalchemy import extract, func
from infrastructure.database.sql.dependencies import get_db
from core.dependencies import get_current_user
from domain.models.user import User
from domain.models.interview import Interview
from domain.models.application import Application
from domain.models.job import Job
from pydantic import BaseModel

router = APIRouter(prefix="/api/interviews", tags=["Interviews"])


class InterviewCreate(BaseModel):
    application_id: int
    interviewer_id: int
    scheduled_date: datetime
    type: str
    location: str
    notes: Optional[str] = None


class InterviewUpdate(BaseModel):
    status: Optional[str] = None
    scheduled_date: Optional[datetime] = None
    notes: Optional[str] = None


class InterviewFeedback(BaseModel):
    feedback: str
    score: float
    recommendation: str


@router.get("")
async def list_interviews(
    status: Optional[str] = None,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """
    Lista todas as entrevistas, filtrando por empresa do usuário atual.
    """
    company_id = (
        current_user.active_company_id or current_user.id
    )  # Fallback if direct user

    query = (
        db.query(Interview)
        .join(Application)
        .filter(Application.company_id == company_id)
    )

    if status:
        query = query.filter(Interview.status == status)

    interviews = query.order_by(Interview.scheduled_date).all()

    result = []
    for i in interviews:
        result.append(
            {
                "id": i.id,
                "candidate_name": i.candidate.name if i.candidate else "N/A",
                "candidate_email": i.candidate.email if i.candidate else "N/A",
                "job_title": (
                    i.application.job.title
                    if i.application and i.application.job
                    else "N/A"
                ),
                "scheduled_date": i.scheduled_date,
                "interviewer": i.interviewer.name if i.interviewer else "N/A",
                "status": i.status,
                "type": i.type,
                "location": i.location,
                "score": i.score,
            }
        )

    return {"interviews": result, "total": len(result)}


@router.post("")
async def schedule_interview(
    data: InterviewCreate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """
    Agenda uma nova entrevista
    """
    app = db.query(Application).filter(Application.id == data.application_id).first()
    if not app:
        raise HTTPException(status_code=404, detail="Candidatura não encontrada")

    # Validação de permissão (se usuário pertence à empresa da vaga)
    # Ignorado para MVP/Demo, assumindo que usuário logado tem acesso

    new_interview = Interview(
        application_id=data.application_id,
        candidate_id=app.candidate_id,
        interviewer_id=data.interviewer_id,
        scheduled_date=data.scheduled_date,
        type=data.type,
        location=data.location,
        notes=data.notes,
        status="scheduled",
    )

    db.add(new_interview)
    db.commit()
    db.refresh(new_interview)

    return {
        "message": "Entrevista agendada com sucesso",
        "interview_id": new_interview.id,
    }


@router.put("/{interview_id}")
async def update_interview(
    interview_id: int,
    data: InterviewUpdate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """
    Atualiza uma entrevista existente
    """
    interview = db.query(Interview).filter(Interview.id == interview_id).first()
    if not interview:
        raise HTTPException(status_code=404, detail="Entrevista não encontrada")

    if data.status:
        interview.status = data.status
        if data.status == "completed":
            interview.completed_at = datetime.utcnow()

    if data.scheduled_date:
        interview.scheduled_date = data.scheduled_date

    if data.notes:
        interview.notes = data.notes

    db.commit()
    db.refresh(interview)

    return {
        "message": "Entrevista atualizada com sucesso",
        "interview_id": interview_id,
        "status": interview.status,
    }


@router.post("/{interview_id}/feedback")
async def add_interview_feedback(
    interview_id: int,
    data: InterviewFeedback,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """
    Adiciona feedback após a entrevista
    """
    if data.score < 0 or data.score > 10:
        raise HTTPException(status_code=400, detail="Score deve estar entre 0 e 10")

    interview = db.query(Interview).filter(Interview.id == interview_id).first()
    if not interview:
        raise HTTPException(status_code=404, detail="Entrevista não encontrada")

    interview.feedback = data.feedback
    interview.score = data.score
    interview.recommendation = data.recommendation
    interview.status = "completed"
    interview.completed_at = datetime.utcnow()

    db.commit()

    return {
        "message": "Feedback registrado com sucesso",
        "interview_id": interview_id,
        "score": data.score,
        "recommendation": data.recommendation,
    }


@router.get("/calendar")
async def get_interview_calendar(
    month: Optional[int] = None,
    year: Optional[int] = None,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """
    Retorna entrevistas organizadas por calendário
    """
    if not month:
        month = datetime.now().month
    if not year:
        year = datetime.now().year

    company_id = current_user.active_company_id or current_user.id

    # Filtrar entrevistas do mês/ano
    interviews = (
        db.query(Interview)
        .join(Application)
        .filter(
            Application.company_id == company_id,
            extract("month", Interview.scheduled_date) == month,
            extract("year", Interview.scheduled_date) == year,
        )
        .all()
    )

    calendar_data = {}

    for i in interviews:
        day_key = i.scheduled_date.strftime("%Y-%m-%d")
        if day_key not in calendar_data:
            calendar_data[day_key] = []

        calendar_data[day_key].append(
            {
                "id": i.id,
                "time": i.scheduled_date.strftime("%H:%M"),
                "candidate": i.candidate.name if i.candidate else "Candidato",
                "job": (
                    i.application.job.title
                    if i.application and i.application.job
                    else "Vaga"
                ),
                "type": i.type,
                "status": i.status,
            }
        )

    return {"month": month, "year": year, "interviews": calendar_data}
