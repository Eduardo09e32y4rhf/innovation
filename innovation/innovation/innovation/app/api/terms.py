from fastapi import APIRouter

router = APIRouter(prefix="/terms", tags=["terms"])

@router.post("/accept", status_code=204)
def accept_terms():
    return
