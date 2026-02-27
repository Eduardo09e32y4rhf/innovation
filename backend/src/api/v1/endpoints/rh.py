from fastapi import APIRouter, Depends, HTTPException, UploadFile, File
from sqlalchemy.orm import Session
from infrastructure.database.sql.dependencies import get_db
from core.dependencies import get_current_user
from domain.models.user import User
from services.rh_service import rh_service
from pydantic import BaseModel
from typing import Optional

router = APIRouter(prefix="/api/rh", tags=["rh"])


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


# ─── ATTENDANCE (PONTO) ────────────────────────────────────────────────────────


class AttendanceCreate(BaseModel):
    record_type: str = "normal"  # normal, absence, sick_leave


class AttendanceOut(BaseModel):
    id: int
    user_id: int
    date: str
    entry_time: Optional[str] = None
    exit_time: Optional[str] = None
    record_type: str

    class Config:
        from_attributes = True


@router.post("/attendance/clock-in")
def clock_in(
    data: AttendanceCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    from domain.models.attendance import Attendance
    from datetime import datetime, time

    today = datetime.utcnow().date()
    now_time = datetime.utcnow().time()

    # Check if already clocked in today
    record = (
        db.query(Attendance)
        .filter(Attendance.user_id == current_user.id, Attendance.date == today)
        .first()
    )

    if record:
        if record.entry_time:
            raise HTTPException(status_code=400, detail="Entrada já registrada hoje")
        record.entry_time = now_time
    else:
        record = Attendance(
            user_id=current_user.id,
            date=today,
            entry_time=now_time,
            record_type=data.record_type,
        )
        db.add(record)

    db.commit()
    db.refresh(record)

    # Format times for response
    return {
        "id": record.id,
        "date": record.date.isoformat(),
        "entry_time": record.entry_time.isoformat() if record.entry_time else None,
        "status": "Entrada registrada",
    }


@router.post("/attendance/clock-out")
def clock_out(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    from domain.models.attendance import Attendance
    from datetime import datetime

    today = datetime.utcnow().date()
    now_time = datetime.utcnow().time()

    record = (
        db.query(Attendance)
        .filter(Attendance.user_id == current_user.id, Attendance.date == today)
        .first()
    )

    if not record:
        raise HTTPException(
            status_code=400, detail="Nenhuma entrada registrada para hoje"
        )

    if record.exit_time:
        raise HTTPException(status_code=400, detail="Saída já registrada hoje")

    record.exit_time = now_time
    db.commit()
    db.refresh(record)

    return {
        "id": record.id,
        "date": record.date.isoformat(),
        "exit_time": record.exit_time.isoformat(),
        "status": "Saída registrada",
    }


@router.get("/attendance/history")
def get_attendance_history(
    limit: int = 30,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    from domain.models.attendance import Attendance

    records = (
        db.query(Attendance)
        .filter(Attendance.user_id == current_user.id)
        .order_by(Attendance.date.desc())
        .limit(limit)
        .all()
    )

    return records


# ─── RH TICKETS (CHAMADOS) ─────────────────────────────────────────────────────


class RHTicketCreate(BaseModel):
    ticket_type: str  # VT, VR, salary, other
    description: str
    receipt_url: Optional[str] = None


class RHTicketUpdate(BaseModel):
    status: str  # open, analyzing, closed


class RHTicketOut(BaseModel):
    id: int
    user_id: int
    ticket_type: str
    status: str
    description: str
    receipt_url: Optional[str]
    created_at: datetime

    class Config:
        from_attributes = True


@router.post("/tickets", response_model=RHTicketOut)
def create_rh_ticket(
    data: RHTicketCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    from domain.models.rh_ticket import RHTicket

    ticket = RHTicket(
        user_id=current_user.id,
        ticket_type=data.ticket_type,
        description=data.description,
        receipt_url=data.receipt_url,
        status="open",
    )
    db.add(ticket)
    db.commit()
    db.refresh(ticket)
    return ticket


@router.get("/tickets")
def list_rh_tickets(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    from domain.models.rh_ticket import RHTicket

    if current_user.role in ["admin", "company"]:
        return db.query(RHTicket).order_by(RHTicket.created_at.desc()).all()

    return (
        db.query(RHTicket)
        .filter(RHTicket.user_id == current_user.id)
        .order_by(RHTicket.created_at.desc())
        .all()
    )


@router.patch("/tickets/{ticket_id}/status")
def update_rh_ticket_status(
    ticket_id: int,
    data: RHTicketUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    from domain.models.rh_ticket import RHTicket

    if current_user.role not in ["admin", "company"]:
        raise HTTPException(
            status_code=403, detail="Apenas RH/Admin pode atualizar tickets"
        )

    ticket = db.query(RHTicket).filter(RHTicket.id == ticket_id).first()
    if not ticket:
        raise HTTPException(status_code=404, detail="Chamado não encontrado")

    ticket.status = data.status
    db.commit()
    db.refresh(ticket)
    return ticket
