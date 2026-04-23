from __future__ import annotations

import threading
import time
from datetime import datetime

from sqlalchemy import select
from sqlalchemy.orm import Session

from app.db.database import SessionLocal
from app.models.models import ReminderNotification, ReminderNotificationStatus, Task, TaskReminder


def enqueue_due_reminders(db: Session, now: datetime | None = None) -> int:
    current_time = now or datetime.utcnow()
    due_reminders = db.scalars(
        select(TaskReminder)
        .where(
            TaskReminder.is_completed.is_(False),
            TaskReminder.notification_sent_at.is_(None),
            TaskReminder.remind_at <= current_time,
        )
        .order_by(TaskReminder.remind_at, TaskReminder.id)
    ).all()

    created = 0
    for reminder in due_reminders:
        existing = db.scalar(select(ReminderNotification).where(ReminderNotification.reminder_id == reminder.id))
        if existing:
            continue
        task = db.get(Task, reminder.task_id)
        title = task.title if task else f"Task #{reminder.task_id}"
        body = reminder.message or "Пора вернуться к задаче"
        db.add(
            ReminderNotification(
                reminder_id=reminder.id,
                task_id=reminder.task_id,
                title=title,
                body=body,
                status=ReminderNotificationStatus.QUEUED,
                available_at=current_time,
            )
        )
        created += 1

    if created:
        db.flush()
    return created


def dispatch_queued_notifications(db: Session, now: datetime | None = None) -> int:
    current_time = now or datetime.utcnow()
    queued = db.scalars(
        select(ReminderNotification)
        .where(
            ReminderNotification.status == ReminderNotificationStatus.QUEUED,
            ReminderNotification.available_at <= current_time,
        )
        .order_by(ReminderNotification.available_at, ReminderNotification.id)
    ).all()

    dispatched = 0
    for item in queued:
        reminder = db.get(TaskReminder, item.reminder_id)
        if reminder is None:
            item.status = ReminderNotificationStatus.FAILED
            item.last_error = "Reminder not found"
            item.attempts += 1
            continue

        item.status = ReminderNotificationStatus.DISPATCHED
        item.dispatched_at = current_time
        item.attempts += 1
        reminder.notification_sent_at = current_time
        dispatched += 1

    if queued:
        db.flush()
    return dispatched


class ReminderNotificationWorker:
    def __init__(self, interval_seconds: int = 5):
        self.interval_seconds = interval_seconds
        self._stop_event = threading.Event()
        self._thread: threading.Thread | None = None

    def start(self) -> None:
        if self._thread and self._thread.is_alive():
            return
        self._stop_event.clear()
        self._thread = threading.Thread(target=self._run_loop, daemon=True, name="reminder-notification-worker")
        self._thread.start()

    def stop(self) -> None:
        self._stop_event.set()
        if self._thread and self._thread.is_alive():
            self._thread.join(timeout=2)

    def _run_loop(self) -> None:
        while not self._stop_event.is_set():
            db = SessionLocal()
            try:
                enqueue_due_reminders(db)
                dispatch_queued_notifications(db)
                db.commit()
            except Exception:
                db.rollback()
            finally:
                db.close()
            time.sleep(self.interval_seconds)
