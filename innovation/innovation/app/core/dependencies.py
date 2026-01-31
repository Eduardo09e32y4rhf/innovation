from fastapi import Depends, HTTPException, status
from sqlalchemy.orm import Session

from app.db.session import get_db
from app.core.security import get_current_user
from app.models.subscription import Subscription
from app.models.company import Company


def require_active_subscription(
    db: Session = Depends(get_db),
    user=Depends(get_current_user),
):
    sub = (
        db.query(Subscription)
        .filter(Subscription.user_id == user.id)
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
            status_code=status.HTTP_402_PAYMENT_REQUIRED,
            detail="Assinatura inativa ou inadimplente",
        )

    return sub


def require_active_company(
    db: Session = Depends(get_db),
    user=Depends(get_current_user),
):
    company = db.query(Company).filter(Company.owner_user_id == user.id).first()
    if not company:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Empresa não cadastrada",
        )
    return company.id
