from __future__ import annotations

import asyncio
import json
from datetime import datetime

from fastapi import APIRouter, Depends, Query, Request
from fastapi.responses import StreamingResponse
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.db.database import SessionLocal, get_db
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


@router.get("/stream")
async def stream_notification_events(
    request: Request,
    after_id: int = Query(default=0, ge=0),
):
    last_event_id = request.headers.get("last-event-id")
    start_after_id = after_id
    if last_event_id:
        try:
            start_after_id = max(start_after_id, int(last_event_id))
        except ValueError:
            pass

    async def event_generator():
        current_after_id = start_after_id
        while True:
            if await request.is_disconnected():
                break

            db: Session = SessionLocal()
            try:
                stmt = (
                    select(ReminderNotification)
                    .where(
                        ReminderNotification.status == ReminderNotificationStatus.DISPATCHED,
                        ReminderNotification.id > current_after_id,
                    )
                    .order_by(ReminderNotification.id)
                    .limit(20)
                )
                events = db.scalars(stmt).all()
            finally:
                db.close()

            if events:
                for event in events:
                    payload = ReminderNotificationRead.from_orm(event).dict()
                    current_after_id = max(current_after_id, int(payload["id"]))
                    yield f"id: {payload['id']}\nevent: reminder\ndata: {json.dumps(payload, default=str)}\n\n"
                continue

            yield ": keep-alive\n\n"
            await asyncio.sleep(1)

    return StreamingResponse(
        event_generator(),
        media_type="text/event-stream",
        headers={"Cache-Control": "no-cache", "Connection": "keep-alive"},
    )
