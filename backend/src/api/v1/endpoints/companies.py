from __future__ import annotations

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from core.dependencies import get_current_user, require_role
from core.roles import Role
from infrastructure.database.sql.dependencies import get_db
from domain.models.company import Company

router = APIRouter(prefix="/companies", tags=["Companies"])


@router.get("/me")
def get_my_company(
    db: Session = Depends(get_db),
    current_user=Depends(require_role(Role.COMPANY)),
):
    company = db.query(Company).filter(Company.owner_user_id == current_user.id).first()
    if not company:
        raise HTTPException(status_code=404, detail="Empresa não cadastrada")
    return {
        "id": company.id,
        "owner_user_id": company.owner_user_id,
        "razao_social": company.razao_social,
        "cnpj": company.cnpj,
        "cidade": company.cidade,
        "uf": company.uf,
        "logo_url": company.logo_url,
        "plan_id": company.plan_id,
        "status": company.status,
    }


@router.post("")
def create_company(
    payload: dict,
    db: Session = Depends(get_db),
    current_user=Depends(require_role(Role.COMPANY)),
):
    required_fields = ["razao_social", "cnpj", "cidade", "uf"]
    missing = [field for field in required_fields if not payload.get(field)]
    if missing:
        raise HTTPException(
            status_code=400, detail=f"Campos obrigatórios: {', '.join(missing)}"
        )

    existing = (
        db.query(Company).filter(Company.owner_user_id == current_user.id).first()
    )
    if existing:
        raise HTTPException(status_code=409, detail="Empresa já cadastrada")

    company = Company(
        owner_user_id=current_user.id,
        razao_social=payload["razao_social"],
        cnpj=payload["cnpj"],
        cidade=payload["cidade"],
        uf=payload["uf"],
        logo_url=payload.get("logo_url"),
        plan_id=payload.get("plan_id"),
        status=payload.get("status", "active"),
    )
    db.add(company)
    db.commit()
    db.refresh(company)
    return {
        "id": company.id,
        "owner_user_id": company.owner_user_id,
        "razao_social": company.razao_social,
        "cnpj": company.cnpj,
        "cidade": company.cidade,
        "uf": company.uf,
        "logo_url": company.logo_url,
        "plan_id": company.plan_id,
        "status": company.status,
    }
