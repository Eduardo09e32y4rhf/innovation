import os
from datetime import datetime, timedelta

from sqlalchemy.orm import Session
from supabase import create_client

from app.core.config import settings
from app.models.document import Document

BASE_PATH = "storage/documents"
SUPABASE_BUCKET = "documents"


def _get_supabase_client():
    if not settings.SUPABASE_URL or not settings.SUPABASE_KEY:
        return None
    return create_client(settings.SUPABASE_URL, settings.SUPABASE_KEY)

def _compute_expiration(doc_type: str) -> datetime | None:
    normalized = (doc_type or "").lower()
    if normalized == "contrato":
        return datetime.utcnow() + timedelta(days=180)
    if normalized == "manual":
        return datetime.utcnow() + timedelta(days=365)
    return datetime.utcnow() + timedelta(days=30)


def save_document(
    db: Session,
    user_id: int,
    company_id: int,
    filename: str,
    content: bytes,
    doc_type: str,
    application_id: int | None = None,
) -> Document:
    storage_path = f"tenant_{company_id}/user_{user_id}/{filename}"
    file_path = os.path.join(BASE_PATH, storage_path)

    client = _get_supabase_client()
    if client:
        client.storage.from_(SUPABASE_BUCKET).upload(storage_path, content, {"content-type": "application/pdf"})
    else:
        user_dir = os.path.join(BASE_PATH, f"tenant_{company_id}", f"user_{user_id}")
        os.makedirs(user_dir, exist_ok=True)
        with open(file_path, "wb") as f:
            f.write(content)

    doc = Document(
        user_id=user_id,
        company_id=company_id,
        name=filename,
        file_path=storage_path,
        doc_type=doc_type,
        application_id=application_id,
        expires_at=_compute_expiration(doc_type),
    )

    db.add(doc)
    db.commit()
    db.refresh(doc)

    return doc
