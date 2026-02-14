from fastapi import Depends, HTTPException, status
from fastapi.security import OAuth2PasswordBearer
from jose import jwt, JWTError
from sqlalchemy.orm import Session

from core.config import SECRET_KEY, ALGORITHM
from core.roles import Role
from infrastructure.database.sql.dependencies import get_db
from domain.models.user import User
from domain.models.company import Company
from domain.models.subscription import Subscription

oauth2_scheme = OAuth2PasswordBearer(tokenUrl="/auth/login")


def get_current_user(
    token: str = Depends(oauth2_scheme),
    db: Session = Depends(get_db),
) -> User:
    try:
        payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
        user_id = int(payload.get("sub"))
    except (JWTError, ValueError):
        raise HTTPException(status_code=401, detail="Token inválido")

    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        raise HTTPException(status_code=401, detail="Usuário não encontrado")

    return user


def require_active_company(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> int:
    if current_user.role != Role.COMPANY.value:
        raise HTTPException(status_code=403, detail="Acesso restrito à empresa")
    company = db.query(Company).filter(Company.owner_user_id == current_user.id).first()
    if not company:
        raise HTTPException(status_code=403, detail="Empresa não cadastrada")
    return company.id


def require_role(*roles: Role):
    def _require_role(current_user: User = Depends(get_current_user)) -> User:
        allowed = {role.value for role in roles}
        if current_user.role not in allowed:
            raise HTTPException(status_code=403, detail="Permissão insuficiente")
        return current_user

    return _require_role


def require_internal_role(current_user: User = Depends(get_current_user)) -> User:
    if current_user.role not in {Role.SERVICES.value, Role.SAC.value, Role.ADM.value}:
        raise HTTPException(status_code=403, detail="Acesso interno apenas")
    return current_user


def require_services_role(current_user: User = Depends(get_current_user)) -> User:
    if current_user.role != Role.SERVICES.value:
        raise HTTPException(status_code=403, detail="Acesso exclusivo Services")
    return current_user


def require_sac_role(current_user: User = Depends(get_current_user)) -> User:
    if current_user.role != Role.SAC.value:
        raise HTTPException(status_code=403, detail="Acesso exclusivo SAC")
    return current_user


def require_admin_role(current_user: User = Depends(get_current_user)) -> User:
    if current_user.role != Role.ADM.value:
        raise HTTPException(status_code=403, detail="Acesso exclusivo ADM")
    return current_user


def require_active_subscription(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> Subscription:
    sub = (
        db.query(Subscription)
        .filter(Subscription.user_id == current_user.id)
        .order_by(Subscription.created_at.desc())
        .first()
    )
    if not sub:
        raise HTTPException(
            status_code=status.HTTP_402_PAYMENT_REQUIRED,
            detail="Nenhuma assinatura encontrada",
        )
    if sub.status not in {"authorized", "active"}:
        raise HTTPException(
            status_code=status.HTTP_402_PAYMENT_REQUIRED, detail="Assinatura inativa"
        )
    return sub


def require_company_subscription(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> Subscription:
    if current_user.role != Role.COMPANY.value:
        raise HTTPException(status_code=403, detail="Acesso restrito à empresa")
    company = db.query(Company).filter(Company.owner_user_id == current_user.id).first()
    if not company:
        raise HTTPException(status_code=403, detail="Empresa não cadastrada")
    sub = (
        db.query(Subscription)
        .filter(Subscription.company_id == company.id)
        .order_by(Subscription.created_at.desc())
        .first()
    )
    if not sub:
        raise HTTPException(
            status_code=status.HTTP_402_PAYMENT_REQUIRED,
            detail="Nenhuma assinatura encontrada",
        )
    if sub.status not in {"authorized", "active"}:
        raise HTTPException(
            status_code=status.HTTP_402_PAYMENT_REQUIRED, detail="Assinatura inativa"
        )
    return sub
