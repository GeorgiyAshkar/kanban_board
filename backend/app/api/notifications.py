from __future__ import annotations

from datetime import datetime

from fastapi import APIRouter, Depends, Query
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.db.database import get_db
from app.models.models import ReminderNotification, ReminderNotificationStatus
from app.schemas.schemas import ReminderNotificationRead

router = APIRouter(prefix="/notifications", tags=["notifications"])


@router.get("/events", response_model=list[ReminderNotificationRead])
def pull_notification_events(
    after_id: int = Query(default=0, ge=0),
    limit: int = Query(default=20, ge=1, le=100),
    db: Session = Depends(get_db),
):
    stmt = (
        select(ReminderNotification)
        .where(
            ReminderNotification.status == ReminderNotificationStatus.DISPATCHED,
            ReminderNotification.id > after_id,
        )
        .order_by(ReminderNotification.id)
        .limit(limit)
    )
    return db.scalars(stmt).all()


@router.post("/events/{notification_id}/ack", response_model=ReminderNotificationRead)
def acknowledge_notification(notification_id: int, db: Session = Depends(get_db)):
    notification = db.get(ReminderNotification, notification_id)
    if notification is None:
        from fastapi import HTTPException

        raise HTTPException(status_code=404, detail="Notification not found")

    notification.status = ReminderNotificationStatus.ACKNOWLEDGED
    notification.acknowledged_at = datetime.utcnow()
    db.commit()
    db.refresh(notification)
    return notification
