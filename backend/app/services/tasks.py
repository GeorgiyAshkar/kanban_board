from __future__ import annotations

from datetime import datetime

from sqlalchemy.orm import Session

from app.models.models import Task
from app.services.history import log_history

FIELD_TO_ACTION = {
    "title": "title_changed",
    "description": "description_changed",
    "status": "status_changed",
    "priority": "priority_changed",
    "deadline_at": "deadline_changed",
    "planned_return_at": "planned_return_changed",
    "board_column_id": "column_changed",
    "is_done": "task_completed",
}


def apply_task_patch(db: Session, task: Task, patch_data: dict) -> Task:
    for field, new_value in patch_data.items():
        old_value = getattr(task, field)
        if old_value == new_value:
            continue

        setattr(task, field, new_value)
        action_type = FIELD_TO_ACTION.get(field, f"{field}_changed")
        log_history(
            db,
            task_id=task.id,
            action_type=action_type,
            field_name=field,
            old_value=str(old_value) if old_value is not None else None,
            new_value=str(new_value) if new_value is not None else None,
        )

    if patch_data.get("is_done") is True and task.done_at is None:
        task.done_at = datetime.utcnow()
    if patch_data.get("is_done") is False:
        task.done_at = None

    task.updated_at = datetime.utcnow()
    db.add(task)
    return task
