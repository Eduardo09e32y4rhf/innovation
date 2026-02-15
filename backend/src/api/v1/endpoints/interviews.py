from datetime import datetime
from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from infrastructure.database.sql.dependencies import get_db
from core.dependencies import get_current_user
from domain.models.user import User

router = APIRouter(prefix="/api/interviews", tags=["Interviews"])


@router.get("")
async def list_interviews(
    status: Optional[str] = None,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """
    Lista todas as entrevistas
    """
    # Dados mockados
    interviews = [
        {
            "id": 1,
            "candidate_name": "João Silva",
            "candidate_email": "joao@email.com",
            "job_title": "Senior Python Developer",
            "scheduled_date": "2023-06-15T14:00:00",
            "interviewer": "Carlos Manager",
            "status": "scheduled",
            "type": "technical",
            "location": "Online - Google Meet",
        },
        {
            "id": 2,
            "candidate_name": "Maria Santos",
            "candidate_email": "maria@email.com",
            "job_title": "UX Designer",
            "scheduled_date": "2023-06-16T10:00:00",
            "interviewer": "Ana Lead",
            "status": "scheduled",
            "type": "portfolio_review",
            "location": "Presencial - Escritório SP",
        },
        {
            "id": 3,
            "candidate_name": "Pedro Costa",
            "candidate_email": "pedro@email.com",
            "job_title": "Data Scientist",
            "scheduled_date": "2023-06-10T15:00:00",
            "interviewer": "Carlos Manager",
            "status": "completed",
            "type": "technical",
            "location": "Online - Zoom",
            "feedback": "Excelente conhecimento técnico",
            "score": 9.5,
        },
    ]

    if status:
        interviews = [i for i in interviews if i["status"] == status]

    return {"interviews": interviews, "total": len(interviews)}


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
    # TODO: Implementar criação real no banco
    new_interview = {
        "id": 999,
        "application_id": application_id,
        "scheduled_date": scheduled_date.isoformat(),
        "interviewer_id": interviewer_id,
        "type": interview_type,
        "location": location,
        "notes": notes,
        "status": "scheduled",
        "created_at": datetime.now().isoformat(),
    }

    return {"message": "Entrevista agendada com sucesso", "interview": new_interview}


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
    # TODO: Implementar atualização real
    return {
        "message": "Entrevista atualizada com sucesso",
        "interview_id": interview_id,
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

    # TODO: Salvar feedback no banco
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

    # Dados mockados
    calendar_data = {
        "2023-06-15": [
            {
                "id": 1,
                "time": "14:00",
                "candidate": "João Silva",
                "job": "Senior Python Developer",
                "type": "technical",
            }
        ],
        "2023-06-16": [
            {
                "id": 2,
                "time": "10:00",
                "candidate": "Maria Santos",
                "job": "UX Designer",
                "type": "portfolio_review",
            }
        ],
    }

    return {"month": month, "year": year, "interviews": calendar_data}
