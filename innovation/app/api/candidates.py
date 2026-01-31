from __future__ import annotations

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from app.core.dependencies import get_current_user
from app.db.dependencies import get_db
from app.models.candidate import Candidate
from app.services.audit_service import log_event


router = APIRouter(prefix="/candidates", tags=["Candidates"])


@router.get("/me")
def get_my_candidate_profile(
    db: Session = Depends(get_db),
    current_user=Depends(get_current_user),
):
    candidate = db.query(Candidate).filter(Candidate.user_id == current_user.id).first()
    if not candidate:
        raise HTTPException(status_code=404, detail="Perfil de candidato não encontrado")
    return {
        "id": candidate.id,
        "user_id": candidate.user_id,
        "resume_url": candidate.resume_url,
        "resume_text": candidate.resume_text,
    }


@router.post("")
def upsert_candidate_profile(
    payload: dict,
    db: Session = Depends(get_db),
    current_user=Depends(get_current_user),
):
    candidate = db.query(Candidate).filter(Candidate.user_id == current_user.id).first()
    if not candidate:
        candidate = Candidate(user_id=current_user.id)
        db.add(candidate)

    candidate.resume_url = payload.get("resume_url")
    candidate.resume_text = payload.get("resume_text")
    db.commit()
    db.refresh(candidate)

    log_event(
        db,
        "candidate_profile_updated",
        user_id=current_user.id,
        entity_type="candidate",
        entity_id=candidate.id,
    )
    return {
        "id": candidate.id,
        "user_id": candidate.user_id,
        "resume_url": candidate.resume_url,
        "resume_text": candidate.resume_text,
    }
