from fastapi import HTTPException, status
from app.models.subscription import Subscription

def require_feature(feature: str):
    def checker(sub: Subscription):
        if feature not in sub.plan.features:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Plano não permite esta funcionalidade"
            )
        return True
    return checker
