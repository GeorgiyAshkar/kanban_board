from __future__ import annotations

from datetime import datetime

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.db.database import get_db
from app.models.models import Task, TaskReminder, User
from app.schemas.schemas import ReminderCreate, ReminderPatch, ReminderRead
from app.services.history import log_history
from app.services.tasks import touch_task
from app.security import ensure_task_owner_or_admin, get_current_user

router = APIRouter(tags=["reminders"])


@router.get("/tasks/{task_id}/reminders", response_model=list[ReminderRead])
def list_reminders(task_id: int, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    task = db.get(Task, task_id)
    if not task:
        raise HTTPException(status_code=404, detail="Task not found")
    ensure_task_owner_or_admin(task.owner_id, current_user)
    stmt = select(TaskReminder).where(TaskReminder.task_id == task_id).order_by(TaskReminder.remind_at)
    return db.scalars(stmt).all()


@router.post("/tasks/{task_id}/reminders", response_model=ReminderRead, status_code=status.HTTP_201_CREATED)
def add_reminder(task_id: int, payload: ReminderCreate, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    task = db.get(Task, task_id)
    if not task:
        raise HTTPException(status_code=404, detail="Task not found")
    ensure_task_owner_or_admin(task.owner_id, current_user)

    reminder = TaskReminder(task_id=task_id, **payload.model_dump())
    db.add(reminder)
    touch_task(task)
    log_history(db, task_id=task_id, action_type="reminder_added", new_value=payload.remind_at.isoformat())
    db.commit()
    db.refresh(reminder)
    return reminder


@router.patch("/reminders/{reminder_id}", response_model=ReminderRead)
def patch_reminder(reminder_id: int, payload: ReminderPatch, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    reminder = db.get(TaskReminder, reminder_id)
    if not reminder:
        raise HTTPException(status_code=404, detail="Reminder not found")
    task = db.get(Task, reminder.task_id)
    ensure_task_owner_or_admin(task.owner_id if task else None, current_user)

    update_data = payload.model_dump(exclude_unset=True)
    old_snapshot = str({k: getattr(reminder, k) for k in update_data.keys()})

    for key, value in update_data.items():
        setattr(reminder, key, value)
    if reminder.is_completed and reminder.completed_at is None:
        reminder.completed_at = datetime.utcnow()

    task = db.get(Task, reminder.task_id)
    if task:
        touch_task(task)

    log_history(db, task_id=reminder.task_id, action_type="reminder_updated", old_value=old_snapshot, new_value=str(update_data))
    db.commit()
    db.refresh(reminder)
    return reminder


@router.delete("/reminders/{reminder_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_reminder(reminder_id: int, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    reminder = db.get(TaskReminder, reminder_id)
    if not reminder:
        raise HTTPException(status_code=404, detail="Reminder not found")
    task = db.get(Task, reminder.task_id)
    ensure_task_owner_or_admin(task.owner_id if task else None, current_user)

    log_history(db, task_id=reminder.task_id, action_type="reminder_deleted", old_value=reminder.remind_at.isoformat())
    task = db.get(Task, reminder.task_id)
    if task:
        touch_task(task)
    db.delete(reminder)
    db.commit()


@router.post("/reminders/{reminder_id}/complete", response_model=ReminderRead)
def complete_reminder(reminder_id: int, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    reminder = db.get(TaskReminder, reminder_id)
    if not reminder:
        raise HTTPException(status_code=404, detail="Reminder not found")
    task = db.get(Task, reminder.task_id)
    ensure_task_owner_or_admin(task.owner_id if task else None, current_user)

    reminder.is_completed = True
    reminder.completed_at = datetime.utcnow()
    task = db.get(Task, reminder.task_id)
    if task:
        touch_task(task)
    log_history(db, task_id=reminder.task_id, action_type="reminder_completed")
    db.commit()
    db.refresh(reminder)
    return reminder
