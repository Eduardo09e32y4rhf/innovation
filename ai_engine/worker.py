from celery import Celery
import os
from core.config import settings

# Configuração do Celery usando o Redis como broker e backend
celery_app = Celery(
    "innovation_agents",
    broker=getattr(settings, "REDIS_URL", "redis://localhost:6379/0"),
    backend=getattr(settings, "REDIS_URL", "redis://localhost:6379/0")
)

celery_app.conf.update(
    task_serializer="json",
    accept_content=["json"],
    result_serializer="json",
    timezone="America/Sao_Paulo",
    enable_utc=True,
)

# Importar tarefas para registro
from ai_engine.agents.recruiter_agent import recruiter_agent
import asyncio

@celery_app.task(name="analyze_resume_task")
def analyze_resume_task(resume_text: str, job_description: str):
    """
    Wrapper para rodar a tarefa asíncrona do Agente no Celery (que é síncrono por padrão na execução da task)
    """
    loop = asyncio.get_event_loop()
    return loop.run_until_complete(recruiter_agent.process_resume_analysis(resume_text, job_description))
