from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from infrastructure.database.sql.dependencies import get_db
from domain.models.job import Job
from domain.models.application import Application
from domain.models.user import User
from core.dependencies import get_current_user
from typing import List
import re

router = APIRouter(prefix="/api/matching", tags=["matching"])


def calculate_match_score(job: Job, candidate: User) -> dict:
    """Calcular score de match entre vaga e candidato"""

    score = 0
    reasons = []

    # Análise básica de keywords (simplificada)
    job_keywords = set(re.findall(r"\b\w+\b", (job.requirements or "").lower()))

    # Simular skills do candidato (em produção viriam do perfil)
    candidate_skills = set(
        re.findall(
            r"\b\w+\b",
            (candidate.skills or "python, javascript, react, sql, aws").lower(),
        )
    )

    # Calcular match
    matches = job_keywords.intersection(candidate_skills)

    if matches:
        score = min(int((len(matches) / max(len(job_keywords), 1)) * 100), 100)
        reasons.append(f"Skills em comum: {', '.join(matches)}")
    else:
        score = 30  # Score base
        reasons.append("Perfil genérico - necessária análise manual")

    # Análise de localização
    if job.type == "remoto":
        score += 10
        reasons.append("Vaga remota - sem restrição geográfica")

    analysis = "\n".join(reasons)

    return {
        "score": score,
        "analysis": analysis,
        "recommendation": (
            "Entrevistar"
            if score >= 70
            else "Revisar" if score >= 50 else "Baixa compatibilidade"
        ),
    }


@router.get("/jobs/{job_id}/candidates")
async def get_matched_candidates(
    job_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Candidatos ranqueados por match (empresa)"""

    job = db.query(Job).filter(Job.id == job_id).first()

    if not job:
        raise HTTPException(404, "Vaga não encontrada")

    if job.company_id != current_user.id:
        raise HTTPException(403, "Sem permissão")

    # Buscar candidaturas
    applications = db.query(Application).filter(Application.job_id == job_id).all()

    results = []

    for app in applications:
        candidate = db.query(User).filter(User.id == app.candidate_id).first()

        if not candidate:
            continue

        # Calcular ou pegar score
        if app.match_score is None:
            match_data = calculate_match_score(job, candidate)
            app.match_score = float(match_data["score"])
            app.ai_analysis = match_data["analysis"]
            db.commit()
        else:
            match_data = {
                "score": app.match_score,
                "analysis": app.ai_analysis or "Sem análise",
                "recommendation": "Entrevistar" if app.match_score >= 70 else "Revisar",
            }

        results.append(
            {
                "application_id": app.id,
                "candidate_id": candidate.id,
                "candidate_name": candidate.full_name,
                "candidate_email": candidate.email,
                "match_score": match_data["score"],
                "analysis": match_data["analysis"],
                "recommendation": match_data["recommendation"],
                "status": app.status,
                "created_at": app.created_at.isoformat(),
            }
        )

    # Ordenar por score
    results.sort(key=lambda x: x["match_score"], reverse=True)

    return results
