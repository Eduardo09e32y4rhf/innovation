from __future__ import annotations

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from core.dependencies import require_services_role
from core.plans import PlanFeature
from infrastructure.database.sql.dependencies import get_db
from domain.models.company import Company
from domain.models.job import Job
from domain.models.subscription import Subscription
from services.plan_service import get_subscription_plan, has_plan_feature


router = APIRouter(prefix="/services/full", tags=["Services Full"])


def _company_has_full_service(db: Session, company_id: int) -> bool:
    sub = (
        db.query(Subscription)
        .filter(Subscription.company_id == company_id)
        .order_by(Subscription.created_at.desc())
        .first()
    )
    plan = get_subscription_plan(db, sub)
    return has_plan_feature(plan, PlanFeature.SERVICES_FULL)


@router.get("/companies")
def list_full_service_companies(
    db: Session = Depends(get_db),
    _user=Depends(require_services_role),
):
    companies = db.query(Company).order_by(Company.id.asc()).all()
    return [
        {
            "id": company.id,
            "razao_social": company.razao_social,
            "cnpj": company.cnpj,
            "cidade": company.cidade,
            "uf": company.uf,
        }
        for company in companies
        if _company_has_full_service(db, company.id)
    ]


@router.get("/companies/{company_id}/jobs")
def list_full_service_jobs(
    company_id: int,
    db: Session = Depends(get_db),
    _user=Depends(require_services_role),
):
    company = db.query(Company).filter(Company.id == company_id).first()
    if not company:
        raise HTTPException(status_code=404, detail="Empresa não encontrada")
    if not _company_has_full_service(db, company_id):
        raise HTTPException(status_code=403, detail="Empresa sem full service")

    jobs = db.query(Job).filter(Job.company_id == company_id).order_by(Job.id.desc()).all()
    return [
        {
            "id": job.id,
            "company_id": job.company_id,
            "title": job.title,
            "description": job.description,
            "location": job.location,
            "status": job.status,
        }
        for job in jobs
    ]
