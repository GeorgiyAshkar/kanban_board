from __future__ import annotations

from sqlalchemy import func, select
from sqlalchemy.orm import Session

from app.models.models import BoardColumn, TaskChecklistItem


class AutomationPolicyViolation(ValueError):
    """Raised when a workflow automation blocks a card transition."""


def validate_column_transition(db: Session, *, task_id: int, target_column: BoardColumn) -> None:
    """Apply workflow policies before a task enters a target column.

    The module is intentionally isolated from the tasks router so this workflow
    automation boundary can later be extracted into a dedicated microservice.
    """

    if target_column.canonical_status != "done":
        return

    open_checklist_items = db.scalar(
        select(func.count())
        .select_from(TaskChecklistItem)
        .where(TaskChecklistItem.task_id == task_id, TaskChecklistItem.is_done.is_(False))
    ) or 0
    if open_checklist_items > 0:
        raise AutomationPolicyViolation("Нельзя переместить карточку в «Готово», пока в чек-листе есть незавершенные пункты")
