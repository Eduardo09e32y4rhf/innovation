from fastapi import FastAPI, HTTPException, Depends, Request
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy.orm import Session
from typing import List, Optional
import os
import logging
import httpx
import httpx

from database import get_db, Base, engine
import models
from schemas import (
    JobCreate,
    JobOut,
    ApplicationCreate,
    ApplicationOut,
    TransactionCreate,
    TransactionOut,
    ProjectCreate,
    ProjectOut,
    TaskCreate,
    TaskOut,
    TicketCreate,
    TicketOut,
    LeaveRequestCreate,
    LeaveRequestOut,
    PulseSurveyCreate,
    SystemAnnouncementCreate,
    SystemAnnouncementOut,
)

# Configuração de Logs
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

from jose import jwt
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from datetime import datetime, timedelta, time, timezone
from sqlalchemy import func

app = FastAPI(title="Innovation IA - Core Service")
security = HTTPBearer()
SECRET_KEY = os.getenv("SECRET_KEY")
ALGORITHM = "HS256"
AI_SERVICE_URL = os.getenv("AI_SERVICE_URL", "http://ai_service:8002")
MP_ACCESS_TOKEN = os.getenv("MP_ACCESS_TOKEN", "")
BASE_URL = os.getenv("BASE_URL", "http://localhost:8000")

# Planos SaaS
SAAS_PLANS = {
    "starter": {"name": "Starter", "price": 299.0, "currency": "BRL"},
    "growth": {"name": "Growth", "price": 799.0, "currency": "BRL"},
    "enterprise": {"name": "Enterprise", "price": 1999.0, "currency": "BRL"},
}


@app.on_event("startup")
async def startup_event():
    if not SECRET_KEY:
        raise RuntimeError("SECRET_KEY environment variable is not set")
    logger.info("🚀 Iniciando Core Service e verificando DB...")
    try:
        Base.metadata.create_all(bind=engine)
        logger.info("✅ Tabelas do Core Service verificadas/criadas com sucesso!")
    except Exception as e:
        logger.error(f"❌ Erro ao criar tabelas do Core: {e}")


async def get_current_user(
    token: HTTPAuthorizationCredentials = Depends(security),
    db: Session = Depends(get_db),
):
    try:
        payload = jwt.decode(token.credentials, SECRET_KEY, algorithms=[ALGORITHM])
        user_id: str = payload.get("sub")
        if user_id is None:
            raise HTTPException(status_code=401, detail="Invalid token")
    except Exception:
        raise HTTPException(status_code=401, detail="Invalid token")

    user = db.query(models.User).filter(models.User.id == int(user_id)).first()
    if user is None:
        raise HTTPException(status_code=401, detail="User not found")
    return user


# CORS
allowed_origins_str = os.getenv(
    "ALLOWED_ORIGINS", "http://localhost:3000,http://127.0.0.1:3000"
)
allowed_origins = [
    origin.strip() for origin in allowed_origins_str.split(",") if origin.strip()
]

app.add_middleware(
    CORSMiddleware,
    allow_origins=allowed_origins,
    allow_credentials=True,
    allow_methods=["GET", "POST", "PUT", "DELETE", "PATCH", "OPTIONS"],
    allow_headers=["*"],
)


# ─────────────────────────────────────────────────────────────────────────────
# DASHBOARD
# ─────────────────────────────────────────────────────────────────────────────


@app.get("/api/core/dashboard/metrics")
async def get_dashboard_metrics(
    current_user: models.User = Depends(get_current_user), db: Session = Depends(get_db)
):
    def get_sum(filters):
        result = (
            db.query(func.sum(models.Transaction.amount))
            .filter(
                models.Transaction.user_id == current_user.id,
                models.Transaction.status == "paid",
                *filters,
            )
            .scalar()
        )
        return float(result) if result else 0.0

    today = datetime.now()
    this_month_start = today.replace(day=1, hour=0, minute=0, second=0, microsecond=0)

    current_revenue = get_sum(
        [
            models.Transaction.type == "income",
            models.Transaction.created_at >= this_month_start,
        ]
    )
    current_costs = get_sum(
        [
            models.Transaction.type == "expense",
            models.Transaction.created_at >= this_month_start,
        ]
    )
    current_profit = current_revenue - current_costs

    active_jobs = (
        db.query(models.Job)
        .filter(models.Job.company_id == current_user.id, models.Job.status == "active")
        .count()
    )
    total_applications = (
        db.query(models.Application)
        .join(models.Job)
        .filter(models.Job.company_id == current_user.id)
        .count()
    )
    total_projects = (
        db.query(models.Project)
        .filter(models.Project.company_id == current_user.id)
        .count()
    )

    user_points = current_user.points or 0
    level = (user_points // 500) + 1

    return {
        "user": {
            "name": current_user.full_name,
            "points": user_points,
            "level": level,
            "xp_in_level": user_points % 500,
            "next_level_xp": 500,
        },
        "revenue": {
            "current": current_revenue,
            "change_percent": 0.0,
            "chart_data": [],
        },
        "projects": {
            "current": total_projects,
            "change_percent": 0.0,
            "chart_data": [],
        },
        "candidates": {
            "current": total_applications,
            "change_percent": 0.0,
            "chart_data": [],
        },
        "active_jobs": active_jobs,
        "profit": {"current": current_profit, "change_percent": 0.0},
    }


@app.get("/api/core/dashboard/heatmap")
async def get_activity_heatmap(
    current_user: models.User = Depends(get_current_user), db: Session = Depends(get_db)
):
    twelve_weeks_ago = datetime.now() - timedelta(weeks=12)
    activity_counts = (
        db.query(
            func.date(models.AuditLog.created_at).label("date"),
            func.count(models.AuditLog.id).label("count"),
        )
        .filter(
            models.AuditLog.user_id == current_user.id,
            models.AuditLog.created_at >= twelve_weeks_ago,
        )
        .group_by(func.date(models.AuditLog.created_at))
        .all()
    )
    return {str(row.date): row.count for row in activity_counts}


@app.get("/api/core/dashboard/missions")
async def get_missions(
    current_user: models.User = Depends(get_current_user), db: Session = Depends(get_db)
):
    all_missions = (
        db.query(models.Mission).filter(models.Mission.is_active == True).all()
    )
    today_start = datetime.combine(datetime.now(timezone.utc).date(), time.min)
    done_ids = [
        um.mission_id
        for um in db.query(models.UserMission)
        .filter(
            models.UserMission.user_id == current_user.id,
            models.UserMission.completed_at >= today_start,
        )
        .all()
    ]
    return [
        {
            "id": m.id,
            "title": m.title,
            "description": m.description,
            "xp_reward": m.xp_reward,
            "done": m.id in done_ids,
        }
        for m in all_missions
    ]


@app.get("/api/core/dashboard/recent-activity")
async def get_recent_activity(
    current_user: models.User = Depends(get_current_user), db: Session = Depends(get_db)
):
    logs = (
        db.query(models.AuditLog)
        .filter(models.AuditLog.user_id == current_user.id)
        .order_by(models.AuditLog.created_at.desc())
        .limit(20)
        .all()
    )
    return {
        "activities": [
            {
                "id": l.id,
                "message": l.action,
                "candidate_name": "Sistema",
                "entity_type": l.entity_type,
                "timestamp": l.created_at.isoformat() if l.created_at else None,
            }
            for l in logs
        ],
        "metadata": {
            "message": "Feed de atividade carregado",
            "updated_at": datetime.now(timezone.utc).isoformat(),
        },
    }


@app.get("/api/core/dashboard/kanban")
async def get_kanban(
    current_user: models.User = Depends(get_current_user), db: Session = Depends(get_db)
):
    tasks = db.query(models.Task).filter(models.Task.user_id == current_user.id).all()
    columns = {"todo": [], "in_progress": [], "done": []}
    for t in tasks:
        status = t.status if t.status in columns else "todo"
        columns[status].append(
            {
                "id": t.id,
                "title": t.title,
                "description": t.description,
                "priority": t.priority,
                "due_date": t.due_date,
            }
        )
    return columns


# ─────────────────────────────────────────────────────────────────────────────
# JOBS / ATS
# ─────────────────────────────────────────────────────────────────────────────


@app.get("/api/core/jobs", response_model=List[JobOut])
async def list_jobs(db: Session = Depends(get_db)):
    return db.query(models.Job).filter(models.Job.status == "active").all()


@app.get("/api/core/jobs/company", response_model=List[JobOut])
async def list_company_jobs(
    current_user: models.User = Depends(get_current_user), db: Session = Depends(get_db)
):
    return db.query(models.Job).filter(models.Job.company_id == current_user.id).all()


@app.post("/api/core/jobs", response_model=JobOut)
async def create_job(
    data: JobCreate,
    current_user: models.User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    job = models.Job(**data.dict(), company_id=current_user.id)
    db.add(job)
    db.commit()
    db.refresh(job)
    return job


@app.patch("/api/core/jobs/{job_id}", response_model=JobOut)
async def update_job(
    job_id: int,
    data: dict,
    current_user: models.User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    job = (
        db.query(models.Job)
        .filter(models.Job.id == job_id, models.Job.company_id == current_user.id)
        .first()
    )
    if not job:
        raise HTTPException(status_code=404, detail="Job not found")
    for k, v in data.items():
        setattr(job, k, v)
    db.commit()
    db.refresh(job)
    return job


@app.delete("/api/core/jobs/{job_id}")
async def delete_job(
    job_id: int,
    current_user: models.User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    job = (
        db.query(models.Job)
        .filter(models.Job.id == job_id, models.Job.company_id == current_user.id)
        .first()
    )
    if not job:
        raise HTTPException(status_code=404, detail="Job not found")
    db.delete(job)
    db.commit()
    return {"ok": True}


@app.get("/api/core/jobs/{job_id}/applications", response_model=List[ApplicationOut])
async def get_job_applications(
    job_id: int,
    current_user: models.User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    return (
        db.query(models.Application).filter(models.Application.job_id == job_id).all()
    )


@app.post("/api/core/applications", response_model=ApplicationOut)
async def apply_to_job(
    data: ApplicationCreate,
    current_user: models.User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    existing = (
        db.query(models.Application)
        .filter(
            models.Application.job_id == data.job_id,
            models.Application.candidate_id == current_user.id,
        )
        .first()
    )
    if existing:
        raise HTTPException(status_code=400, detail="Candidatura já enviada")
    app_obj = models.Application(job_id=data.job_id, candidate_id=current_user.id)
    db.add(app_obj)
    db.commit()
    db.refresh(app_obj)
    return app_obj


# ─────────────────────────────────────────────────────────────────────────────
# FINANCE
# ─────────────────────────────────────────────────────────────────────────────


@app.get("/api/core/finance/summary")
async def get_finance_summary(
    current_user: models.User = Depends(get_current_user), db: Session = Depends(get_db)
):
    def get_sum(type_filter):
        result = (
            db.query(func.sum(models.Transaction.amount))
            .filter(
                models.Transaction.user_id == current_user.id,
                models.Transaction.type == type_filter,
            )
            .scalar()
        )
        return float(result) if result else 0.0

    total_income = get_sum("income")
    total_expense = get_sum("expense")
    return {
        "total_income": total_income,
        "total_expense": total_expense,
        "balance": total_income - total_expense,
        "currency": "BRL",
    }


@app.get("/api/core/finance/transactions", response_model=List[TransactionOut])
async def get_transactions(
    current_user: models.User = Depends(get_current_user), db: Session = Depends(get_db)
):
    return (
        db.query(models.Transaction)
        .filter(models.Transaction.user_id == current_user.id)
        .order_by(models.Transaction.created_at.desc())
        .limit(100)
        .all()
    )


@app.post("/api/core/finance/transactions", response_model=TransactionOut)
async def create_transaction(
    data: TransactionCreate,
    current_user: models.User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    tx = models.Transaction(
        user_id=current_user.id,
        amount=data.amount,
        type=data.type,
        category=data.category,
        description=data.description,
        status="paid",
    )
    db.add(tx)
    db.commit()
    db.refresh(tx)
    return tx


@app.get("/api/core/finance/prediction")
async def get_finance_prediction(current_user: models.User = Depends(get_current_user)):
    return {"prediction": [], "message": "Dados insuficientes para previsão"}


@app.get("/api/core/finance/anomalies")
async def get_finance_anomalies(current_user: models.User = Depends(get_current_user)):
    return {"anomalies": []}


@app.get("/api/core/finance/logs")
async def get_finance_logs(
    current_user: models.User = Depends(get_current_user), db: Session = Depends(get_db)
):
    logs = (
        db.query(models.AuditLog)
        .filter(
            models.AuditLog.user_id == current_user.id,
            models.AuditLog.entity_type == "transaction",
        )
        .order_by(models.AuditLog.created_at.desc())
        .limit(50)
        .all()
    )
    return [
        {
            "id": l.id,
            "action": l.action,
            "details": l.details,
            "created_at": l.created_at,
        }
        for l in logs
    ]


# ─────────────────────────────────────────────────────────────────────────────
# PROJECTS
# ─────────────────────────────────────────────────────────────────────────────


@app.get("/api/core/projects/", response_model=List[ProjectOut])
async def list_projects(
    current_user: models.User = Depends(get_current_user), db: Session = Depends(get_db)
):
    return (
        db.query(models.Project)
        .filter(models.Project.company_id == current_user.id)
        .all()
    )


@app.post("/api/core/projects/", response_model=ProjectOut)
async def create_project(
    data: ProjectCreate,
    current_user: models.User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    proj = models.Project(**data.dict(), company_id=current_user.id)
    db.add(proj)
    db.commit()
    db.refresh(proj)
    return proj


@app.delete("/api/core/projects/{project_id}")
async def delete_project(
    project_id: int,
    current_user: models.User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    proj = (
        db.query(models.Project)
        .filter(
            models.Project.id == project_id,
            models.Project.company_id == current_user.id,
        )
        .first()
    )
    if not proj:
        raise HTTPException(status_code=404, detail="Project not found")
    db.delete(proj)
    db.commit()
    return {"ok": True}


@app.get("/api/core/projects/{project_id}/stats")
async def get_project_stats(
    project_id: int,
    current_user: models.User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    total = db.query(models.Task).filter(models.Task.project_id == project_id).count()
    done = (
        db.query(models.Task)
        .filter(models.Task.project_id == project_id, models.Task.status == "done")
        .count()
    )
    return {
        "total_tasks": total,
        "done_tasks": done,
        "progress": (done / total * 100) if total else 0,
    }


@app.get("/api/core/projects/all-tasks", response_model=List[TaskOut])
async def get_all_tasks(
    current_user: models.User = Depends(get_current_user), db: Session = Depends(get_db)
):
    return db.query(models.Task).filter(models.Task.user_id == current_user.id).all()


@app.post("/api/core/projects/tasks", response_model=TaskOut)
async def create_task(
    data: TaskCreate,
    current_user: models.User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    task = models.Task(**data.dict(), user_id=current_user.id)
    db.add(task)
    db.commit()
    db.refresh(task)
    return task


@app.patch("/api/core/projects/tasks/{task_id}", response_model=TaskOut)
async def update_task(
    task_id: int,
    data: dict,
    current_user: models.User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    task = (
        db.query(models.Task)
        .filter(models.Task.id == task_id, models.Task.user_id == current_user.id)
        .first()
    )
    if not task:
        raise HTTPException(status_code=404, detail="Task not found")
    for k, v in data.items():
        setattr(task, k, v)
    db.commit()
    db.refresh(task)
    return task


@app.post("/api/core/projects/tasks/{task_id}/start")
async def start_time_tracking(
    task_id: int,
    current_user: models.User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    entry = models.TimeEntry(task_id=task_id, user_id=current_user.id)
    db.add(entry)
    db.commit()
    db.refresh(entry)
    return {"id": entry.id, "task_id": task_id, "started_at": entry.started_at}


@app.post("/api/core/projects/time-entries/{entry_id}/stop")
async def stop_time_tracking(
    entry_id: int,
    current_user: models.User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    entry = (
        db.query(models.TimeEntry)
        .filter(
            models.TimeEntry.id == entry_id, models.TimeEntry.user_id == current_user.id
        )
        .first()
    )
    if not entry:
        raise HTTPException(status_code=404, detail="Time entry not found")
    entry.ended_at = datetime.now(timezone.utc)
    db.commit()
    duration = (entry.ended_at - entry.started_at).seconds if entry.started_at else 0
    return {"id": entry.id, "ended_at": entry.ended_at, "duration_seconds": duration}


# ─────────────────────────────────────────────────────────────────────────────
# SUPPORT
# ─────────────────────────────────────────────────────────────────────────────


@app.get("/api/core/support/tickets", response_model=List[TicketOut])
async def get_tickets(
    current_user: models.User = Depends(get_current_user), db: Session = Depends(get_db)
):
    return (
        db.query(models.Ticket).filter(models.Ticket.user_id == current_user.id).all()
    )


@app.post("/api/core/support/tickets", response_model=TicketOut)
async def create_ticket(
    data: TicketCreate,
    current_user: models.User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    subject = data.subject or data.title or "Sem título"
    ticket = models.Ticket(
        user_id=current_user.id,
        subject=subject,
        description=data.description,
        priority=data.priority or "medium",
    )
    db.add(ticket)
    db.commit()
    db.refresh(ticket)
    return ticket


@app.get("/api/core/support/system-status")
async def get_system_status():
    return {
        "services": [
            {"name": "Auth Service", "status": "operational"},
            {"name": "AI Service", "status": "operational"},
            {"name": "Core Service", "status": "operational"},
            {"name": "Gateway (Kong)", "status": "operational"},
            {"name": "Database", "status": "operational"},
        ],
        "overall": "operational",
        "updated_at": datetime.now(timezone.utc).isoformat(),
    }


@app.get("/api/core/support/tickets/{ticket_id}/smart-reply")
async def get_smart_reply(
    ticket_id: int,
    description: Optional[str] = None,
    current_user: models.User = Depends(get_current_user),
):
    return {
        "reply": f"Obrigado por entrar em contato! Nossa equipe analisará seu ticket #{ticket_id} em breve."
    }


# ─────────────────────────────────────────────────────────────────────────────
# RH
# ─────────────────────────────────────────────────────────────────────────────


@app.get("/api/core/rh/leave-requests", response_model=List[LeaveRequestOut])
async def get_leave_requests(
    current_user: models.User = Depends(get_current_user), db: Session = Depends(get_db)
):
    return (
        db.query(models.LeaveRequest)
        .filter(models.LeaveRequest.user_id == current_user.id)
        .all()
    )


@app.post("/api/core/rh/leave-requests", response_model=LeaveRequestOut)
async def create_leave_request(
    data: LeaveRequestCreate,
    current_user: models.User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    from datetime import date

    req = models.LeaveRequest(
        user_id=current_user.id,
        start_date=datetime.fromisoformat(data.start_date),
        end_date=datetime.fromisoformat(data.end_date),
        reason=data.reason,
    )
    db.add(req)
    db.commit()
    db.refresh(req)
    return req


@app.post("/api/core/rh/pulse")
async def submit_pulse(
    data: PulseSurveyCreate,
    current_user: models.User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    pulse = models.PulseSurvey(
        user_id=current_user.id, score=data.score, comment=data.comment
    )
    db.add(pulse)
    db.commit()
    return {"message": "Resposta registrada com sucesso!", "score": data.score}


@app.get("/api/core/rh/employees/{employee_id}/badges")
async def get_employee_badges(
    employee_id: int, current_user: models.User = Depends(get_current_user)
):
    return {"badges": [], "employee_id": employee_id}


# ─────────────────────────────────────────────────────────────────────────────
# PAYMENTS — MERCADO PAGO REAL
# ─────────────────────────────────────────────────────────────────────────────


@app.post("/api/core/payments/checkout")
async def create_checkout(
    data: dict, current_user: models.User = Depends(get_current_user)
):
    plan_id = data.get("plan", "starter")
    return {
        "checkout_url": f"/pricing?plan={plan_id}&success=demo",
        "init_point": None,
        "plan": plan_id,
        "message": "Pagamentos integrados via Asaas no backend principal.",
    }


@app.post("/api/core/payments/webhook")
async def payment_webhook(request: Request, db: Session = Depends(get_db)):
    """Webhook movido para o serviço principal usando Asaas."""
    return {"status": "ok"}


@app.get("/api/core/payments/plans")
async def list_plans():
    """Lista os planos SaaS disponíveis."""
    return {"plans": [{"id": k, **v} for k, v in SAAS_PLANS.items()]}


# ─────────────────────────────────────────────────────────────────────────────
# ENTERPRISE
# ─────────────────────────────────────────────────────────────────────────────


@app.get("/api/core/enterprise/analytics/realtime")
async def get_realtime_analytics(current_user: models.User = Depends(get_current_user)):
    return {
        "active_users": 0,
        "requests_per_minute": 0,
        "error_rate": 0.0,
        "avg_response_time_ms": 0,
        "updated_at": datetime.now(timezone.utc).isoformat(),
    }


@app.post("/api/core/enterprise/support/chat")
async def enterprise_support_chat(
    data: dict, current_user: models.User = Depends(get_current_user)
):
    message = data.get("message", "")
    return {
        "reply": f"Suporte Enterprise recebeu sua mensagem. Em breve um especialista responderá.",
        "ticket_id": None,
    }


# ─────────────────────────────────────────────────────────────────────────────
# SYSTEM ANNOUNCEMENTS
# ─────────────────────────────────────────────────────────────────────────────


@app.get("/api/core/system/announcements", response_model=List[SystemAnnouncementOut])
async def list_announcements(db: Session = Depends(get_db)):
    now = datetime.now(timezone.utc)
    return (
        db.query(models.SystemAnnouncement)
        .filter(
            models.SystemAnnouncement.is_active == True,
            models.SystemAnnouncement.start_at <= now,
            (models.SystemAnnouncement.end_at == None)
            | (models.SystemAnnouncement.end_at >= now),
        )
        .all()
    )


@app.post("/api/core/system/announcements", response_model=SystemAnnouncementOut)
async def create_announcement(
    data: SystemAnnouncementCreate,
    current_user: models.User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    if current_user.role != "admin":
        raise HTTPException(
            status_code=403, detail="Apenas admins podem criar anúncios"
        )
    announcement = models.SystemAnnouncement(**data.dict())
    db.add(announcement)
    db.commit()
    db.refresh(announcement)
    return announcement


# ─────────────────────────────────────────────────────────────────────────────
# HEALTH
# ─────────────────────────────────────────────────────────────────────────────


@app.get("/api/core/health")
async def health_check():
    return {"status": "healthy", "service": "core-service"}


if __name__ == "__main__":
    import uvicorn

    uvicorn.run("main:app", host="0.0.0.0", port=8003, reload=True)
