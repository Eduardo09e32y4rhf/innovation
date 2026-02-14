from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from typing import List
from infrastructure.database.sql.dependencies import get_db
from domain.models.project import Project
from domain.models.task import Task
from services.project_service import project_service
from pydantic import BaseModel
from datetime import datetime

router = APIRouter(prefix="/api/projects", tags=["projects"])


class ProjectCreate(BaseModel):
    name: str
    description: str = None


class TaskCreate(BaseModel):
    title: str
    description: str = None
    project_id: int
    estimated_hours: float = 0.0
    cost_per_hour: float = 0.0


@router.post("/")
async def create_project(data: ProjectCreate, db: Session = Depends(get_db)):
    # Mock company_id por enquanto (deve vir do token)
    project = Project(name=data.name, description=data.description, company_id=1)
    db.add(project)
    db.commit()
    db.refresh(project)
    return project


@router.get("/")
async def list_projects(db: Session = Depends(get_db)):
    return db.query(Project).all()


@router.post("/tasks")
async def create_task(data: TaskCreate, db: Session = Depends(get_db)):
    task = Task(
        title=data.title,
        description=data.description,
        project_id=data.project_id,
        estimated_hours=data.estimated_hours,
        cost_per_hour=data.cost_per_hour,
    )
    db.add(task)
    db.commit()
    db.refresh(task)
    return task


@router.post("/tasks/{task_id}/start")
async def start_task(task_id: int, db: Session = Depends(get_db)):
    # Mock user_id = 1
    return project_service.start_time_tracking(db, task_id, 1)


@router.post("/time-entries/{entry_id}/stop")
async def stop_task(entry_id: int, db: Session = Depends(get_db)):
    return project_service.stop_time_tracking(db, entry_id)


@router.get("/{project_id}/stats")
async def project_stats(project_id: int, db: Session = Depends(get_db)):
    return project_service.calculate_project_costs(db, project_id)


@router.get("/all-tasks")
async def list_all_tasks(db: Session = Depends(get_db)):
    # Em produção, filtrar por user/company
    # return db.query(Task).join(Project).filter(Project.company_id == current_user.company_id).all()
    return db.query(Task).all()
