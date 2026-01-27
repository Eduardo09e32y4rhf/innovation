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
    current_user = Depends(get_current_user),
    _ = Depends(require_active_subscription),
):
    docs = (
        db.query(Document)
        .filter(Document.user_id == current_user.id)
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
