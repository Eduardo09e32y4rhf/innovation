from fastapi import FastAPI, HTTPException, Depends
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy.orm import Session
from typing import List
import os

from database import get_db, Base, engine
from models import Job, Transaction, Ticket
from schemas import JobCreate, JobOut, TransactionOut, TicketOut

# Criar tabelas se não existirem (apenas para teste rápido, o ideal é Alembic)
Base.metadata.create_all(bind=engine)

from jose import jwt
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from datetime import datetime, timedelta, time, timezone
from sqlalchemy import func

app = FastAPI(title="Innovation IA - Core Service")
security = HTTPBearer()
SECRET_KEY = os.getenv("SECRET_KEY", "innovation_v2_premium_dark")
ALGORITHM = "HS256"

async def get_current_user(token: HTTPAuthorizationCredentials = Depends(security), db: Session = Depends(get_db)):
    try:
        payload = jwt.decode(token.credentials, SECRET_KEY, algorithms=[ALGORITHM])
        user_id: str = payload.get("sub")
        if user_id is None:
            raise HTTPException(status_code=401, detail="Invalid token")
    except Exception:
        raise HTTPException(status_code=401, detail="Invalid token")
    
    from models import User
    user = db.query(User).filter(User.id == int(user_id)).first()
    if user is None:
        raise HTTPException(status_code=401, detail="User not found")
    return user

# CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# --- Dashboard Endpoints ---

@app.get("/dashboard/metrics")
async def get_dashboard_metrics(current_user: Session = Depends(get_current_user), db: Session = Depends(get_db)):
    from models import Transaction, Job, Application, Project
    
    def get_sum(filters):
        query = db.query(func.sum(Transaction.amount)).filter(
            Transaction.user_id == current_user.id,
            Transaction.status == "paid",
            *filters,
        )
        result = query.scalar()
        return float(result) if result else 0.0

    today = datetime.now()
    this_month_start = today.replace(day=1, hour=0, minute=0, second=0, microsecond=0)
    
    current_revenue = get_sum([Transaction.type == "income", Transaction.created_at >= this_month_start])
    current_costs = get_sum([Transaction.type == "expense", Transaction.created_at >= this_month_start])
    current_profit = current_revenue - current_costs

    active_jobs = db.query(Job).filter(Job.company_id == current_user.id, Job.status == "active").count()
    total_applications = db.query(Application).join(Job).filter(Job.company_id == current_user.id).count()
    total_projects = db.query(Project).filter(Project.company_id == current_user.id).count()
    
    user_points = current_user.points or 0
    level = (user_points // 500) + 1

    return {
        "user": {"points": user_points, "level": level},
        "revenue": {"current": current_revenue},
        "projects": total_projects,
        "candidates": total_applications,
        "active_jobs": active_jobs,
        "profit": {"current": current_profit}
    }

@app.get("/dashboard/heatmap")
async def get_activity_heatmap(current_user: Session = Depends(get_current_user), db: Session = Depends(get_db)):
    from models import AuditLog
    twelve_weeks_ago = datetime.now() - timedelta(weeks=12)
    activity_counts = db.query(
        func.date(AuditLog.created_at).label('date'),
        func.count(AuditLog.id).label('count')
    ).filter(
        AuditLog.user_id == current_user.id,
        AuditLog.created_at >= twelve_weeks_ago
    ).group_by(func.date(AuditLog.created_at)).all()
    return {str(row.date): row.count for row in activity_counts}

@app.get("/dashboard/missions")
async def get_missions(current_user: Session = Depends(get_current_user), db: Session = Depends(get_db)):
    from models import Mission, UserMission
    all_missions = db.query(Mission).filter(Mission.is_active == True).all()
    today_start = datetime.combine(datetime.now(timezone.utc).date(), time.min)
    done_ids = [um.mission_id for um in db.query(UserMission).filter(UserMission.user_id == current_user.id, UserMission.completed_at >= today_start).all()]
    return [{"id": m.id, "title": m.title, "description": m.description, "xp_reward": m.xp_reward, "done": m.id in done_ids} for m in all_missions]

# --- ATS Endpoints ---

@app.get("/jobs", response_model=List[JobOut])
async def list_jobs(db: Session = Depends(get_db)):
    from models import Job
    return db.query(Job).filter(Job.status == "active").all()

@app.post("/jobs", response_model=JobOut)
async def create_job(data: JobCreate, current_user: Session = Depends(get_current_user), db: Session = Depends(get_db)):
    from models import Job
    job = Job(**data.dict(), company_id=current_user.id) 
    db.add(job)
    db.commit()
    db.refresh(job)
    return job

# --- Finance Endpoints ---

@app.get("/finance/transactions", response_model=List[TransactionOut])
async def list_transactions(db: Session = Depends(get_db)):
    from models import Transaction
    return db.query(Transaction).all()

# --- Ticket Endpoints ---

@app.get("/tickets", response_model=List[TicketOut])
async def list_tickets(db: Session = Depends(get_db)):
    from models import Ticket
    return db.query(Ticket).all()

@app.get("/health")
async def health_check():
    return {"status": "healthy", "service": "core-service"}

if __name__ == "__main__":
    import uvicorn
    uvicorn.run("main:app", host="0.0.0.0", port=8003, reload=True)
