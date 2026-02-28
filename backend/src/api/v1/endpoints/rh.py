from fastapi import APIRouter, Depends, HTTPException, UploadFile, File
from sqlalchemy.orm import Session
from infrastructure.database.sql.dependencies import get_db
from core.dependencies import get_current_user
from domain.models.user import User
from services.rh_service import rh_service
from pydantic import BaseModel
from typing import Optional

router = APIRouter(prefix="/rh", tags=["rh"])


class LeaveCreate(BaseModel):
    start_date: str
    end_date: str
    reason: str


class PulseCreate(BaseModel):
    score: int
    comment: Optional[str] = None


@router.post("/onboarding/{onboarding_id}/upload")
async def upload_doc(
    onboarding_id: int,
    file: UploadFile = File(...),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    content = await file.read()
    return rh_service.process_document_ocr(db, onboarding_id, str(content))


@router.post("/leave-requests")
async def create_leave(
    data: LeaveCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    from domain.models.leave_request import LeaveRequest
    from datetime import datetime

    leave = LeaveRequest(
        employee_id=current_user.id,
        start_date=datetime.fromisoformat(data.start_date),
        end_date=datetime.fromisoformat(data.end_date),
        reason=data.reason,
        status="pending",
    )
    db.add(leave)
    db.commit()
    db.refresh(leave)
    return leave


@router.get("/leave-requests")
async def list_leaves(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    from domain.models.leave_request import LeaveRequest

    if current_user.role in ["admin", "company"]:
        return db.query(LeaveRequest).all()
    return (
        db.query(LeaveRequest).filter(LeaveRequest.employee_id == current_user.id).all()
    )


@router.post("/performance-reviews")
async def create_review(
    employee_id: int,
    score: float,
    feedback: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    return rh_service.add_performance_review(
        db, employee_id, current_user.id, score, feedback
    )


@router.get("/onboarding/{employee_id}/contract")
async def get_contract(
    employee_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    return {"contract": await rh_service.generate_contract_draft(db, employee_id)}


@router.post("/pulse")
async def pulse(
    data: PulseCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    return rh_service.register_pulse(db, current_user.id, data.score, data.comment)


@router.get("/employees/{employee_id}/badges")
async def get_badges(
    employee_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    user = db.query(User).filter(User.id == employee_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="Funcionário não encontrado")
    return {
        "badges": user.badges if user.badges else "[]",
        "points": user.points if user.points else 0,
    }
