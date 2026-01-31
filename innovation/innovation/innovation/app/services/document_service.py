import os
from sqlalchemy.orm import Session
from app.models.document import Document

BASE_PATH = "storage/documents"

def save_document(
    db: Session,
    user_id: int,
    filename: str,
    content: bytes,
    doc_type: str
) -> Document:

    user_dir = os.path.join(BASE_PATH, f"user_{user_id}")
    os.makedirs(user_dir, exist_ok=True)

    file_path = os.path.join(user_dir, filename)

    with open(file_path, "wb") as f:
        f.write(content)

    doc = Document(
        user_id=user_id,
        name=filename,
        file_path=file_path,
        doc_type=doc_type
    )

    db.add(doc)
    db.commit()
    db.refresh(doc)

    return doc
