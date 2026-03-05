from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from infrastructure.database.sql.dependencies import get_db
from core.dependencies import get_current_user
from domain.models.user import User
from domain.schemas.user import UserOut, UserUpdate, UserXPOut, UserAddXPIn
import logging

router = APIRouter(prefix="/users", tags=["Users"])
logger = logging.getLogger(__name__)


@router.get("/me", response_model=UserOut)
def read_users_me(current_user: User = Depends(get_current_user)):
    return current_user


@router.patch("/me", response_model=UserOut)
def update_user_me(
    user_data: UserUpdate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    try:
        user = current_user
        update_data = user_data.dict(exclude_unset=True)
        for field, value in update_data.items():
            setattr(user, field, value)

        db.add(user)
        db.commit()
        db.refresh(user)
        return user
    except Exception as e:
        db.rollback()
        logger.error(f"Erro interno ao atualizar usuário {current_user.id}: {str(e)}")
        raise HTTPException(status_code=500, detail="Erro interno ao atualizar usuário")


@router.get("/me/xp", response_model=UserXPOut)
def get_user_xp(current_user: User = Depends(get_current_user)):
    user_level = current_user.level or 1
    xp_in_level = current_user.current_xp or 0
    next_level_xp = user_level * 1000

    return UserXPOut(
        level=user_level,
        current_xp=xp_in_level,
        next_level_xp=next_level_xp
    )


@router.post("/add-xp", response_model=UserXPOut)
def add_user_xp(
    xp_data: UserAddXPIn,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    try:
        # Initial values
        current_user.current_xp = (current_user.current_xp or 0) + xp_data.xp
        current_user.points = (current_user.points or 0) + xp_data.xp # Sync points
        current_user.level = current_user.level or 1

        next_level_xp = current_user.level * 1000

        while current_user.current_xp >= next_level_xp:
            current_user.current_xp -= next_level_xp
            current_user.level += 1
            next_level_xp = current_user.level * 1000

        db.add(current_user)
        db.commit()
        db.refresh(current_user)

        return UserXPOut(
            level=current_user.level,
            current_xp=current_user.current_xp,
            next_level_xp=next_level_xp
        )
    except Exception as e:
        db.rollback()
        logger.error(f"Erro interno ao adicionar XP para usuário {current_user.id}: {str(e)}")
        raise HTTPException(status_code=500, detail="Erro interno ao adicionar XP")
