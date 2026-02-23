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

app = FastAPI(title="Innovation IA - Core Service")

# CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# --- ATS Endpoints ---

@app.get("/api/jobs", response_model=List[JobOut])
async def list_jobs(db: Session = Depends(get_db)):
    return db.query(Job).filter(Job.status == "active").all()

@app.post("/api/jobs", response_model=JobOut)
async def create_job(data: JobCreate, db: Session = Depends(get_db)):
    # Placeholder: Em produção, pegaríamos o company_id do token
    job = Job(**data.dict(), company_id=1) 
    db.add(job)
    db.commit()
    db.refresh(job)
    return job

# --- Finance Endpoints ---

@app.get("/api/finance/transactions", response_model=List[TransactionOut])
async def list_transactions(db: Session = Depends(get_db)):
    return db.query(Transaction).all()

# --- Ticket Endpoints ---

@app.get("/api/tickets", response_model=List[TicketOut])
async def list_tickets(db: Session = Depends(get_db)):
    return db.query(Ticket).all()

@app.get("/health")
async def health_check():
    return {"status": "healthy", "service": "core-service"}

if __name__ == "__main__":
    import uvicorn
    uvicorn.run("main:app", host="0.0.0.0", port=8003, reload=True)
