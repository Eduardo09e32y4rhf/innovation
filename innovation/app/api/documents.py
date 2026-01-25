from fastapi import APIRouter, Depends, HTTPException
from fastapi.responses import FileResponse
from sqlalchemy.orm import Session

from app.db.session import get_db
from app.core.security import get_current_user
from app.core.dependencies import require_active_subscription
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
    current_user: User = Depends(get_current_user),
    _sub = Depends(require_active_subscription),
    _feature = Depends(require_feature("history"))
):
    documents = (
        db.query(Document)
        .filter(Document.user_id == current_user.id)
        .order_by(Document.created_at.desc())
        .all()
    )

    return [
        {
            "id": doc.id,
            "name": doc.name,
            "type": doc.doc_type,
            "created_at": doc.created_at
        }
        for doc in documents
    ]


@router.get("/{doc_id}/download")
def download_document(
    doc_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
    _sub = Depends(require_active_subscription),
    _feature = Depends(require_feature("history"))
):
    document = (
        db.query(Document)
        .filter(
            Document.id == doc_id,
            Document.user_id == current_user.id
        )
        .first()
    )

    if not document:
        raise HTTPException(status_code=404, detail="Documento não encontrado")

    return FileResponse(
        path=document.file_path,
        filename=document.name,
        media_type="application/pdf"
    )
