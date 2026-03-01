from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from infrastructure.database.sql.dependencies import get_db
from core.dependencies import get_current_user
from domain.models.user import User
from domain.models.notification import Notification
from pydantic import BaseModel
from datetime import datetime

router = APIRouter(prefix="/api/notifications", tags=["Notifications"])

class NotificationSchema(BaseModel):
    id: int
    type: str
    title: str
    message: str
    read: bool
    link: Optional[str]
    created_at: datetime

    class Config:
        from_attributes = True

@router.get("/", response_model=List[NotificationSchema])
async def get_notifications(
    unread_only: bool = False,
    limit: int = 20,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    query = db.query(Notification).filter(Notification.user_id == current_user.id)
    if unread_only:
        query = query.filter(Notification.read == False)
    
    return query.order_by(Notification.created_at.desc()).limit(limit).all()

@router.patch("/{notification_id}/read")
async def mark_as_read(
    notification_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    notif = db.query(Notification).filter(
        Notification.id == notification_id, 
        Notification.user_id == current_user.id
    ).first()
    
    if not notif:
        raise HTTPException(status_code=404, detail="Notification not found")
    
    notif.read = True
    db.commit()
    return {"status": "success"}

@router.post("/read-all")
async def mark_all_as_read(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    db.query(Notification).filter(
        Notification.user_id == current_user.id,
        Notification.read == False
    ).update({"read": True})
    db.commit()
    return {"status": "success"}

@router.delete("/")
async def clear_notifications(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    db.query(Notification).filter(Notification.user_id == current_user.id).delete()
    db.commit()
    return {"status": "success"}

# Helper to create notifications (to be used by other services)
def create_notification(
    db: Session, 
    user_id: int, 
    title: str, 
    message: str, 
    type: str = "info",
    link: str = None
):
    notif = Notification(
        user_id=user_id,
        title=title,
        message=message,
        type=type,
        link=link
    )
    db.add(notif)
    db.commit()
    db.refresh(notif)
    return notif
