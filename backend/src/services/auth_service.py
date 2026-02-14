from __future__ import annotations

import logging
from sqlalchemy.orm import Session

from core.security import (
    create_access_token,
    create_refresh_token,
    get_password_hash,
    verify_password
)
from domain.models.company import Company
from domain.models.user import User

logger = logging.getLogger(__name__)


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
        full_name=(name or email.split("@")[0] or "Usuário").strip(),
        email=email,
        hashed_password=get_password_hash(password),
        role="company",
        phone=phone,
        company_name=company_name
    )
    db.add(user)
    db.flush()  # garante user.id

    # Define dados da empresa (placeholder se não vierem)
    rs = (razao_social or company_name or "Minha Empresa").strip()
    city = (cidade or "São Paulo").strip()
    state = (uf or "SP").strip().upper()
    
    # Valida UF (Estados brasileiros)
    valid_states = {
        'AC', 'AL', 'AP', 'AM', 'BA', 'CE', 'DF', 'ES', 'GO', 'MA',
        'MT', 'MS', 'MG', 'PA', 'PB', 'PR', 'PE', 'PI', 'RJ', 'RN',
        'RS', 'RO', 'RR', 'SC', 'SP', 'SE', 'TO'
    }
    if state not in valid_states:
        logger.warning(f"UF inválido '{state}', usando 'SP' como padrão")
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

    # user.active_company_id = company.id # REMOVED (Legacy)
    db.commit()
    db.refresh(user)
    logger.info(f"Usuário registrado: {user.email} (ID: {user.id})")
    return user


def authenticate_user(db: Session, email: str, password: str | None, *, skip_password: bool = False):
    user = db.query(User).filter(User.email == email).first()
    if not user:
        logger.warning(f"Tentativa de login com email inexistente: {email}")
        return None
    if not skip_password and (password is None or not verify_password(password, user.hashed_password)):
        logger.warning(f"Tentativa de login com senha incorreta: {email}")
        return None

    access_token = create_access_token({"sub": str(user.id)})
    refresh_token = create_refresh_token(user.id)

    logger.info(f"Autenticação bem-sucedida: {email} (ID: {user.id})")
    return access_token, refresh_token, user
