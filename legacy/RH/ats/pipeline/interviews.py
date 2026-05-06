from datetime import datetime
from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from infrastructure.database.sql.dependencies import get_db
from core.dependencies import get_current_user
from domain.models.user import User
from domain.models.interview import Interview
from sqlalchemy import extract

router = APIRouter(prefix="/interviews", tags=["Interviews"])


@router.get("")
async def list_interviews(
    status: Optional[str] = None,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """
    Lista todas as entrevistas (relacionadas à empresa do usuário)
    """
    company_id = current_user.active_company_id
    if not company_id and current_user.role != "admin":
        return {"interviews": [], "total": 0}

    query = db.query(Interview)
    if company_id:
        query = query.filter(Interview.company_id == company_id)

    if status:
        query = query.filter(Interview.status == status)

    interviews = query.all()

    # Retorna num formato amigável para o frontend
    result = []
    for interview in interviews:
        result.append(
            {
                "id": interview.id,
                "application_id": interview.application_id,
                "interviewer_id": interview.interviewer_id,
                "scheduled_date": (
                    interview.scheduled_date.isoformat()
                    if interview.scheduled_date
                    else None
                ),
                "status": interview.status,
                "type": interview.type,
                "location": interview.location,
                "notes": interview.notes,
                "score": interview.score,
                "feedback": interview.feedback,
                "recommendation": getattr(interview, "recommendation", None),
            }
        )

    return {"interviews": result, "total": len(result)}


@router.post("")
async def schedule_interview(
    application_id: int,
    scheduled_date: datetime,
    interviewer_id: int,
    interview_type: str,
    location: str,
    notes: Optional[str] = None,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """
    Agenda uma nova entrevista
    """
    company_id = current_user.active_company_id

    new_interview = Interview(
        company_id=company_id,
        application_id=application_id,
        scheduled_date=scheduled_date,
        interviewer_id=interviewer_id,
        type=interview_type,
        location=location,
        notes=notes,
        status="scheduled",
    )

    db.add(new_interview)
    db.commit()
    db.refresh(new_interview)

    return {
        "message": "Entrevista agendada com sucesso",
        "interview": {
            "id": new_interview.id,
            "scheduled_date": new_interview.scheduled_date.isoformat(),
            "status": new_interview.status,
        },
    }


@router.put("/{interview_id}")
async def update_interview(
    interview_id: int,
    status: Optional[str] = None,
    scheduled_date: Optional[datetime] = None,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """
    Atualiza uma entrevista existente
    """
    interview = db.query(Interview).filter(Interview.id == interview_id).first()
    if not interview:
        raise HTTPException(status_code=404, detail="Entrevista não encontrada")

    if status:
        interview.status = status
    if scheduled_date:
        interview.scheduled_date = scheduled_date

    db.commit()
    return {
        "message": "Entrevista atualizada com sucesso",
        "interview_id": interview.id,
        "status": interview.status,
    }


@router.post("/{interview_id}/feedback")
async def add_interview_feedback(
    interview_id: int,
    feedback: str,
    score: float,
    recommendation: str,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """
    Adiciona feedback após a entrevista
    """
    if score < 0 or score > 10:
        raise HTTPException(status_code=400, detail="Score deve estar entre 0 e 10")

    interview = db.query(Interview).filter(Interview.id == interview_id).first()
    if not interview:
        raise HTTPException(status_code=404, detail="Entrevista não encontrada")

    interview.feedback = feedback
    interview.score = score
    # Usando campo notes caso recommendation não exista explicitamente no model
    if hasattr(interview, "recommendation"):
        interview.recommendation = recommendation
    else:
        if interview.notes:
            interview.notes += f"\nRecomendação: {recommendation}"
        else:
            interview.notes = f"Recomendação: {recommendation}"

    interview.status = "completed"

    db.commit()

    return {
        "message": "Feedback registrado com sucesso",
        "interview_id": interview_id,
        "score": score,
        "recommendation": recommendation,
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

    company_id = current_user.active_company_id

    query = db.query(Interview)
    if company_id:
        query = query.filter(Interview.company_id == company_id)

    interviews = query.filter(
        extract("month", Interview.scheduled_date) == month,
        extract("year", Interview.scheduled_date) == year,
    ).all()

    calendar_data = {}
    for i in interviews:
        date_str = i.scheduled_date.date().isoformat()
        if date_str not in calendar_data:
            calendar_data[date_str] = []
        calendar_data[date_str].append(
            {
                "id": i.id,
                "time": i.scheduled_date.strftime("%H:%M"),
                "candidate": f"Candidato App {i.application_id}",  # Placeholder if join is too heavy
                "job": "Vaga Relacionada",
                "type": i.type,
            }
        )

    return {"month": month, "year": year, "interviews": calendar_data}
