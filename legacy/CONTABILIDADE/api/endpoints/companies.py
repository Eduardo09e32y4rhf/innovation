from __future__ import annotations

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from core.dependencies import get_current_user, require_role
from core.roles import Role
from infrastructure.database.sql.dependencies import get_db
from domain.models.company import Company
from domain.schemas.company import CompanyCreate, CompanyResponse

router = APIRouter(prefix="/companies", tags=["Companies"])


@router.get("/me", response_model=CompanyResponse)
def get_my_company(
    db: Session = Depends(get_db),
    current_user=Depends(require_role(Role.COMPANY)),
):
    company = db.query(Company).filter(Company.owner_user_id == current_user.id).first()
    if not company:
        raise HTTPException(status_code=404, detail="Empresa não cadastrada")
    return company


@router.post("", response_model=CompanyResponse)
def create_company(
    payload: CompanyCreate,
    db: Session = Depends(get_db),
    current_user=Depends(require_role(Role.COMPANY)),
):
    existing = (
        db.query(Company).filter(Company.owner_user_id == current_user.id).first()
    )
    if existing:
        raise HTTPException(status_code=409, detail="Empresa já cadastrada")

    company = Company(
        owner_user_id=current_user.id,
        razao_social=payload.razao_social,
        cnpj=payload.cnpj,
        cidade=payload.cidade,
        uf=payload.uf,
        logo_url=payload.logo_url,
        plan_id=payload.plan_id,
        status=payload.status,
    )
    db.add(company)
    db.commit()
    db.refresh(company)
    return company
