from fastapi import APIRouter, Depends, HTTPException, UploadFile, File
from sqlalchemy.orm import Session
from infrastructure.database.sql.dependencies import get_db
from services.rh_service import rh_service
from pydantic import BaseModel
from typing import List

router = APIRouter(prefix="/api/rh", tags=["rh"])

class LeaveCreate(BaseModel):
    start_date: str
    end_date: str
    reason: str

@router.post("/onboarding/{onboarding_id}/upload")
async def upload_doc(onboarding_id: int, file: UploadFile = File(...), db: Session = Depends(get_db)):
    content = await file.read()
    # Chama serviço de IA para processar (Mock no momento)
    return rh_service.process_document_ocr(db, onboarding_id, str(content))

@router.post("/leave-requests")
async def create_leave(data: LeaveCreate, db: Session = Depends(get_db)):
    # Lógica simplificada
    return {"status": "success", "message": "Solicitação enviada"}

@router.get("/leave-requests")
async def list_leaves(db: Session = Depends(get_db)):
    from domain.models.leave_request import LeaveRequest
    return db.query(LeaveRequest).all()

@router.post("/performance-reviews")
async def create_review(employee_id: int, reviewer_id: int, score: float, feedback: str, db: Session = Depends(get_db)):
    return rh_service.add_performance_review(db, employee_id, reviewer_id, score, feedback)

@router.get("/onboarding/{employee_id}/contract")
async def get_contract(employee_id: int, db: Session = Depends(get_db)):
    return {"contract": await rh_service.generate_contract_draft(db, employee_id)}

@router.post("/pulse")
async def pulse(score: int, comment: str = None, db: Session = Depends(get_db)):
    # Mock user_id = 1
    return rh_service.register_pulse(db, 1, score, comment)

@router.get("/employees/{employee_id}/badges")
async def get_badges(employee_id: int, db: Session = Depends(get_db)):
    from domain.models.user import User
    user = db.query(User).filter(User.id == employee_id).first()
    return {"badges": user.badges if user else "[]", "points": user.points if user else 0}
