from __future__ import annotations

from datetime import datetime, timedelta

from fastapi import APIRouter, Depends
from sqlalchemy import and_, select
from sqlalchemy.orm import Session

from app.db.database import get_db
from app.models.models import Task, TaskReminder, User, UserRole
from app.schemas.schemas import TodayResponse
from app.security import get_current_user

router = APIRouter(tags=["today"])


@router.get("/today", response_model=TodayResponse)
def today_dashboard(db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    now = datetime.utcnow()
    start = datetime(now.year, now.month, now.day)
    end = start + timedelta(days=1)

    task_scope = []
    if current_user.role != UserRole.ADMIN:
        task_scope.append(Task.owner_id == current_user.id)

    overdue = db.scalars(select(Task).where(Task.deadline_at < now, Task.is_done.is_(False), Task.is_archived.is_(False), *task_scope)).all()
    due_today = db.scalars(select(Task).where(and_(Task.deadline_at >= start, Task.deadline_at < end), Task.is_archived.is_(False), *task_scope)).all()
    return_today = db.scalars(
        select(Task).where(and_(Task.planned_return_at >= start, Task.planned_return_at < end), Task.is_archived.is_(False), *task_scope)
    ).all()
    reminder_scope = []
    if current_user.role != UserRole.ADMIN:
        reminder_scope.append(Task.owner_id == current_user.id)
    reminders_today = db.scalars(
        select(TaskReminder)
        .join(Task, Task.id == TaskReminder.task_id)
        .where(and_(TaskReminder.remind_at >= start, TaskReminder.remind_at < end), TaskReminder.is_completed.is_(False), *reminder_scope)
    ).all()
    stalled_cutoff = now - timedelta(days=14)
    stalled = db.scalars(
        select(Task).where(Task.updated_at < stalled_cutoff, Task.is_archived.is_(False), Task.is_done.is_(False), *task_scope)
    ).all()

    return {
        "overdue": overdue,
        "due_today": due_today,
        "return_today": return_today,
        "reminders_today": reminders_today,
        "stalled": stalled,
    }
