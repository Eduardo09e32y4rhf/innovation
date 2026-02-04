from fastapi import APIRouter, Depends

from app.core.dependencies import require_role
from app.core.roles import Role

router = APIRouter(prefix="/terms", tags=["terms"])

@router.post("/accept", status_code=204)
def accept_terms(_company_user=Depends(require_role(Role.COMPANY))):
    return
