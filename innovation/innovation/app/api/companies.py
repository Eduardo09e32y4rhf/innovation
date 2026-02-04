from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from app.core.security import get_current_user
from app.db.session import get_db
from app.models.company import Company


router = APIRouter(prefix="/companies", tags=["Companies"])


@router.get("/me")
def get_my_company(
    db: Session = Depends(get_db),
    current_user=Depends(get_current_user),
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
    }


@router.post("")
def create_company(
    payload: dict,
    db: Session = Depends(get_db),
    current_user=Depends(get_current_user),
):
    required_fields = ["razao_social", "cnpj", "cidade", "uf"]
    missing = [field for field in required_fields if not payload.get(field)]
    if missing:
        raise HTTPException(status_code=400, detail=f"Campos obrigatórios: {', '.join(missing)}")

    existing = db.query(Company).filter(Company.owner_user_id == current_user.id).first()
    if existing:
        raise HTTPException(status_code=409, detail="Empresa já cadastrada")

    company = Company(
        owner_user_id=current_user.id,
        razao_social=payload["razao_social"],
        cnpj=payload["cnpj"],
        cidade=payload["cidade"],
        uf=payload["uf"],
        logo_url=payload.get("logo_url"),
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
    }
