from __future__ import annotations

from datetime import datetime

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.db.database import get_db
from app.models.models import Task, TaskReminder
from app.schemas.schemas import ReminderCreate, ReminderPatch, ReminderRead
from app.services.history import log_history

router = APIRouter(tags=["reminders"])


@router.get("/tasks/{task_id}/reminders", response_model=list[ReminderRead])
def list_reminders(task_id: int, db: Session = Depends(get_db)):
    stmt = select(TaskReminder).where(TaskReminder.task_id == task_id).order_by(TaskReminder.remind_at)
    return db.scalars(stmt).all()


@router.post("/tasks/{task_id}/reminders", response_model=ReminderRead, status_code=status.HTTP_201_CREATED)
def add_reminder(task_id: int, payload: ReminderCreate, db: Session = Depends(get_db)):
    task = db.get(Task, task_id)
    if not task:
        raise HTTPException(status_code=404, detail="Task not found")

    reminder = TaskReminder(task_id=task_id, **payload.model_dump())
    db.add(reminder)
    task.updated_at = datetime.utcnow()
    log_history(db, task_id=task_id, action_type="reminder_added", new_value=payload.remind_at.isoformat())
    db.commit()
    db.refresh(reminder)
    return reminder


@router.patch("/reminders/{reminder_id}", response_model=ReminderRead)
def patch_reminder(reminder_id: int, payload: ReminderPatch, db: Session = Depends(get_db)):
    reminder = db.get(TaskReminder, reminder_id)
    if not reminder:
        raise HTTPException(status_code=404, detail="Reminder not found")

    update_data = payload.model_dump(exclude_unset=True)
    old_snapshot = str({k: getattr(reminder, k) for k in update_data.keys()})

    for key, value in update_data.items():
        setattr(reminder, key, value)
    if reminder.is_completed and reminder.completed_at is None:
        reminder.completed_at = datetime.utcnow()

    log_history(db, task_id=reminder.task_id, action_type="reminder_updated", old_value=old_snapshot, new_value=str(update_data))
    db.commit()
    db.refresh(reminder)
    return reminder


@router.delete("/reminders/{reminder_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_reminder(reminder_id: int, db: Session = Depends(get_db)):
    reminder = db.get(TaskReminder, reminder_id)
    if not reminder:
        raise HTTPException(status_code=404, detail="Reminder not found")

    log_history(db, task_id=reminder.task_id, action_type="reminder_deleted", old_value=reminder.remind_at.isoformat())
    db.delete(reminder)
    db.commit()


@router.post("/reminders/{reminder_id}/complete", response_model=ReminderRead)
def complete_reminder(reminder_id: int, db: Session = Depends(get_db)):
    reminder = db.get(TaskReminder, reminder_id)
    if not reminder:
        raise HTTPException(status_code=404, detail="Reminder not found")

    reminder.is_completed = True
    reminder.completed_at = datetime.utcnow()
    log_history(db, task_id=reminder.task_id, action_type="reminder_completed")
    db.commit()
    db.refresh(reminder)
    return reminder
