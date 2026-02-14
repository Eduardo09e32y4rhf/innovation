from sqlalchemy.orm import Session
from datetime import datetime
from domain.models.project import Project
from domain.models.task import Task
from domain.models.time_entry import TimeEntry
from typing import Optional, List


class ProjectService:
    @staticmethod
    def start_time_tracking(db: Session, task_id: int, user_id: int):
        # Para qualquer rastreamento ativo para este usuário
        active_entries = (
            db.query(TimeEntry)
            .filter(TimeEntry.user_id == user_id, TimeEntry.end_time == None)
            .all()
        )
        for entry in active_entries:
            ProjectService.stop_time_tracking(db, entry.id)

        new_entry = TimeEntry(
            task_id=task_id, user_id=user_id, start_time=datetime.utcnow()
        )
        db.add(new_entry)

        # Atualiza status da tarefa para in_progress
        task = db.query(Task).filter(Task.id == task_id).first()
        if task:
            task.status = "in_progress"

        db.commit()
        db.refresh(new_entry)
        return new_entry

    @staticmethod
    def stop_time_tracking(db: Session, entry_id: int):
        entry = db.query(TimeEntry).filter(TimeEntry.id == entry_id).first()
        if not entry:
            return None

        entry.end_time = datetime.utcnow()
        duration = (entry.end_time - entry.start_time).total_seconds() / 60
        entry.duration_minutes = duration

        # Atualiza a tarefa com as horas reais
        task = entry.task
        task.actual_hours += duration / 60

        # Calcula custo total se houver custo por hora
        if task.cost_per_hour:
            task.total_cost = task.actual_hours * task.cost_per_hour

        db.commit()
        db.refresh(entry)
        return entry

    @staticmethod
    def calculate_project_costs(db: Session, project_id: int):
        tasks = db.query(Task).filter(Task.project_id == project_id).all()
        total_cost = sum(task.total_cost for task in tasks)
        total_hours = sum(task.actual_hours for task in tasks)
        return {
            "total_cost": total_cost,
            "total_hours": total_hours,
            "task_count": len(tasks),
        }


project_service = ProjectService()
