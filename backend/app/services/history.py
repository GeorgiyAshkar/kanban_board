from __future__ import annotations

from typing import Any

from sqlalchemy.orm import Session

from app.models.models import TaskHistory


def log_history(
    db: Session,
    *,
    task_id: int,
    action_type: str,
    field_name: str | None = None,
    old_value: str | None = None,
    new_value: str | None = None,
    comment: str | None = None,
    author: str = "local_user",
    meta_json: dict[str, Any] | None = None,
) -> TaskHistory:
    item = TaskHistory(
        task_id=task_id,
        action_type=action_type,
        field_name=field_name,
        old_value=old_value,
        new_value=new_value,
        comment=comment,
        author=author,
        meta_json=meta_json,
    )
    db.add(item)
    return item
