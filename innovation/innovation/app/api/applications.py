from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from app.core.dependencies import require_active_company
from app.core.security import get_current_user
from app.db.session import get_db
from app.models.application import Application
from app.models.job import Job


router = APIRouter(prefix="/applications", tags=["Applications"])


@router.get("/me")
def list_my_applications(
    db: Session = Depends(get_db),
    current_user=Depends(get_current_user),
):
    apps = (
        db.query(Application)
        .filter(Application.candidate_user_id == current_user.id)
        .order_by(Application.id.desc())
        .all()
    )
    return [
        {
            "id": app.id,
            "job_id": app.job_id,
            "company_id": app.company_id,
            "candidate_user_id": app.candidate_user_id,
            "status": app.status,
        }
        for app in apps
    ]


@router.get("/company")
def list_company_applications(
    db: Session = Depends(get_db),
    company_id: int = Depends(require_active_company),
):
    apps = (
        db.query(Application)
        .filter(Application.company_id == company_id)
        .order_by(Application.id.desc())
        .all()
    )
    return [
        {
            "id": app.id,
            "job_id": app.job_id,
            "company_id": app.company_id,
            "candidate_user_id": app.candidate_user_id,
            "status": app.status,
        }
        for app in apps
    ]


@router.post("")
def apply_to_job(
    payload: dict,
    db: Session = Depends(get_db),
    current_user=Depends(get_current_user),
):
    job_id = payload.get("job_id")
    if not job_id:
        raise HTTPException(status_code=400, detail="job_id é obrigatório")

    job = db.query(Job).filter(Job.id == job_id, Job.status == "open").first()
    if not job:
        raise HTTPException(status_code=404, detail="Vaga não encontrada")

    existing = (
        db.query(Application)
        .filter(Application.job_id == job_id)
        .filter(Application.candidate_user_id == current_user.id)
        .first()
    )
    if existing:
        return {
            "id": existing.id,
            "job_id": existing.job_id,
            "company_id": existing.company_id,
            "candidate_user_id": existing.candidate_user_id,
            "status": existing.status,
        }

    app = Application(
        job_id=job.id,
        company_id=job.company_id,
        candidate_user_id=current_user.id,
        status="pending",
    )
    db.add(app)
    db.commit()
    db.refresh(app)
    return {
        "id": app.id,
        "job_id": app.job_id,
        "company_id": app.company_id,
        "candidate_user_id": app.candidate_user_id,
        "status": app.status,
    }


@router.patch("/{application_id}")
def update_application(
    application_id: int,
    payload: dict,
    db: Session = Depends(get_db),
    company_id: int = Depends(require_active_company),
):
    app = (
        db.query(Application)
        .filter(Application.id == application_id)
        .filter(Application.company_id == company_id)
        .first()
    )
    if not app:
        raise HTTPException(status_code=404, detail="Aplicação não encontrada")

    status_value = payload.get("status")
    if status_value:
        app.status = status_value

    db.commit()
    db.refresh(app)
    return {
        "id": app.id,
        "job_id": app.job_id,
        "company_id": app.company_id,
        "candidate_user_id": app.candidate_user_id,
        "status": app.status,
    }


@router.post("/{application_id}/documents")
def attach_document(
    application_id: int,
    payload: dict,
    db: Session = Depends(get_db),
    company_id: int = Depends(require_active_company),
):
    app = (
        db.query(Application)
        .filter(Application.id == application_id)
        .filter(Application.company_id == company_id)
        .first()
    )
    if not app:
        raise HTTPException(status_code=404, detail="Aplicação não encontrada")

    return {"ok": True, "doc_type": payload.get("doc_type", "manual")}
