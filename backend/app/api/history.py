from __future__ import annotations

from datetime import datetime

from fastapi import APIRouter, Depends
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.db.database import get_db
from app.models.models import TaskHistory
from app.schemas.schemas import HistoryRead

router = APIRouter(tags=["history"])


@router.get("/tasks/{task_id}/history", response_model=list[HistoryRead])
def task_history(task_id: int, db: Session = Depends(get_db)):
    stmt = select(TaskHistory).where(TaskHistory.task_id == task_id).order_by(TaskHistory.created_at.desc())
    return db.scalars(stmt).all()


@router.get("/history", response_model=list[HistoryRead])
def global_history(
    task_id: int | None = None,
    action_type: str | None = None,
    date_from: datetime | None = None,
    date_to: datetime | None = None,
    db: Session = Depends(get_db),
):
    stmt = select(TaskHistory)
    if task_id:
        stmt = stmt.where(TaskHistory.task_id == task_id)
    if action_type:
        stmt = stmt.where(TaskHistory.action_type == action_type)
    if date_from:
        stmt = stmt.where(TaskHistory.created_at >= date_from)
    if date_to:
        stmt = stmt.where(TaskHistory.created_at <= date_to)

    stmt = stmt.order_by(TaskHistory.created_at.desc()).limit(500)
    return db.scalars(stmt).all()
