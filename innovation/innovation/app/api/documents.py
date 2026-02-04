from fastapi import APIRouter, Depends, HTTPException
from fastapi.responses import FileResponse, RedirectResponse
from sqlalchemy.orm import Session

from app.core.config import settings
from app.db.session import get_db
from app.core.security import get_current_user
from app.core.dependencies import require_active_subscription, require_active_company
from app.core.permissions import require_feature
from app.models.document import Document
from app.models.user import User



router = APIRouter(
    prefix="/documents",
    tags=["Documents"]
)

@router.get("/history")
def list_documents(
    db: Session = Depends(get_db),
    current_user = Depends(get_current_user),
    _ = Depends(require_active_subscription),
    company_id: int = Depends(require_active_company),
):
    docs = (
        db.query(Document)
        .filter(Document.user_id == current_user.id)
        .filter(Document.company_id == company_id)
        .order_by(Document.created_at.desc())
        .all()
    )

    return [
        {
            "id": d.id,
            "name": d.name,
            "type": d.doc_type,
            "created_at": d.created_at,
        }
        for d in docs
    ]


@router.get("/{doc_id}")
def get_document(
    doc_id: int,
    db: Session = Depends(get_db),
    current_user = Depends(get_current_user),
    _ = Depends(require_active_subscription),
    company_id: int = Depends(require_active_company),
):
    if current_user.role in {"owner", "company"}:
        doc = (
            db.query(Document)
            .filter(Document.id == doc_id)
            .filter(Document.company_id == company_id)
            .first()
        )
    else:
        doc = (
            db.query(Document)
            .filter(Document.id == doc_id)
            .filter(Document.user_id == current_user.id)
            .filter(Document.company_id == company_id)
            .first()
        )

    if not doc:
        raise HTTPException(status_code=404, detail="Documento não encontrado")

    if settings.SUPABASE_URL and settings.SUPABASE_KEY:
        public_url = f"{settings.SUPABASE_URL}/storage/v1/object/public/documents/{doc.file_path}"
        return RedirectResponse(public_url)
    return FileResponse(doc.file_path, filename=doc.name)
