from __future__ import annotations

from sqlalchemy.orm import Session

from app.core.security import create_access_token, get_password_hash, verify_password
from app.models.company import Company
from app.models.user import User


def _temp_cnpj_from_user_id(user_id: int) -> str:
    # 4 + 14 = 18 (<= 20). Único por user_id. Serve como placeholder até o usuário informar o CNPJ real.
    return f"TEMP{user_id:014d}"


def register_user(
    db: Session,
    email: str,
    password: str,
    *,
    name: str | None = None,
    phone: str | None = None,
    company_name: str | None = None,
    razao_social: str | None = None,
    cnpj: str | None = None,
    cidade: str | None = None,
    uf: str | None = None,
) -> User:
    if db.query(User).filter(User.email == email).first():
        raise ValueError("Email já existe")

    user = User(
        name=(name or email.split("@")[0] or "Usuário").strip(),
        email=email,
        password_hash=get_password_hash(password),
        role="COMPANY",
        phone=phone,
    )
    db.add(user)
    db.flush()  # garante user.id

    # Define dados da empresa (placeholder se não vierem)
    rs = (razao_social or company_name or "Minha Empresa").strip()
    city = (cidade or "São Paulo").strip()
    state = (uf or "SP").strip().upper()
    if len(state) != 2:
        state = "SP"

    if cnpj:
        cnpj_value = cnpj.strip()
        # Checa unicidade (constraint no banco)
        exists = db.query(Company).filter(Company.cnpj == cnpj_value).first()
        if exists:
            raise ValueError("CNPJ já cadastrado")
    else:
        cnpj_value = _temp_cnpj_from_user_id(user.id)

    company = Company(
        owner_user_id=user.id,
        razao_social=rs,
        cnpj=cnpj_value,
        cidade=city,
        uf=state,
        logo_url=None,
    )
    db.add(company)
    db.flush()

    user.active_company_id = company.id
    db.commit()
    db.refresh(user)
    return user


def authenticate_user(db: Session, email: str, password: str | None, *, skip_password: bool = False):
    user = db.query(User).filter(User.email == email).first()
    if not user:
        return None
    if not skip_password and (password is None or not verify_password(password, user.password_hash)):
        return None

    token = create_access_token({"sub": str(user.id)})
    return token, user
