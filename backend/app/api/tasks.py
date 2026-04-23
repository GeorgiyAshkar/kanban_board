from __future__ import annotations

from datetime import datetime

from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy import or_, select
from sqlalchemy.orm import Session

from app.db.database import get_db
from app.models.models import BoardColumn, Tag, Task, TaskChecklistItem, TaskComment, TaskTag
from app.schemas.schemas import BoardTaskMetadata, ChecklistItemRead, TagRead, TaskCreate, TaskMove, TaskPatch, TaskRead
from app.services.history import log_history
from app.services.tasks import apply_task_patch

router = APIRouter(prefix="/tasks", tags=["tasks"])


def _get_task_or_404(db: Session, task_id: int) -> Task:
    task = db.get(Task, task_id)
    if not task:
        raise HTTPException(status_code=404, detail="Task not found")
    return task


@router.get("", response_model=list[TaskRead])
def list_tasks(
    q: str | None = None,
    archived: bool | None = None,
    status_filter: str | None = Query(default=None, alias="status"),
    priority: str | None = None,
    limit: int | None = Query(default=None, ge=1, le=200),
    offset: int = Query(default=0, ge=0),
    db: Session = Depends(get_db),
):
    stmt = select(Task)
    if archived is not None:
        stmt = stmt.where(Task.is_archived == archived)
    if status_filter:
        stmt = stmt.where(Task.status == status_filter)
    if priority:
        stmt = stmt.where(Task.priority == priority)
    if q:
        like = f"%{q}%"
        tag_subquery = (
            select(TaskTag.task_id)
            .join(Tag, Tag.id == TaskTag.tag_id)
            .where(Tag.name.ilike(like))
            .subquery()
        )
        comment_subquery = select(TaskComment.task_id).where(TaskComment.text.ilike(like)).subquery()
        stmt = stmt.where(
            or_(
                Task.title.ilike(like),
                Task.description.ilike(like),
                Task.id.in_(select(tag_subquery.c.task_id)),
                Task.id.in_(select(comment_subquery.c.task_id)),
            )
        )

    stmt = stmt.order_by(Task.board_column_id, Task.position, Task.id)
    if limit is not None:
        stmt = stmt.limit(limit).offset(offset)
    return db.scalars(stmt).all()


@router.get("/board-metadata", response_model=list[BoardTaskMetadata])
def board_metadata(
    task_ids: list[int] = Query(default=[]),
    db: Session = Depends(get_db),
):
    ids = [task_id for task_id in task_ids if task_id > 0]
    if not ids:
        return []

    tags_stmt = (
        select(TaskTag.task_id, Tag)
        .join(Tag, Tag.id == TaskTag.tag_id)
        .where(TaskTag.task_id.in_(ids))
        .order_by(TaskTag.task_id, Tag.name)
    )
    checklist_stmt = (
        select(TaskChecklistItem)
        .where(TaskChecklistItem.task_id.in_(ids))
        .order_by(TaskChecklistItem.task_id, TaskChecklistItem.position, TaskChecklistItem.id)
    )

    tags_by_task: dict[int, list[TagRead]] = {task_id: [] for task_id in ids}
    checklist_by_task: dict[int, list[ChecklistItemRead]] = {task_id: [] for task_id in ids}

    for task_id, tag in db.execute(tags_stmt).all():
        tags_by_task.setdefault(task_id, []).append(TagRead.model_validate(tag))

    for item in db.scalars(checklist_stmt).all():
        checklist_by_task.setdefault(item.task_id, []).append(ChecklistItemRead.model_validate(item))

    return [
        BoardTaskMetadata(task_id=task_id, tags=tags_by_task.get(task_id, []), checklist=checklist_by_task.get(task_id, []))
        for task_id in ids
    ]


@router.post("", response_model=TaskRead, status_code=status.HTTP_201_CREATED)
def create_task(payload: TaskCreate, db: Session = Depends(get_db)):
    task = Task(**payload.model_dump())
    task.created_at = datetime.utcnow()
    task.updated_at = task.created_at

    selected_column: BoardColumn | None = None
    if task.board_column_id is not None:
        selected_column = db.get(BoardColumn, task.board_column_id)

    if task.board_column_id is None:
        inbox = db.scalar(select(BoardColumn).where(BoardColumn.name == "Входящие"))
        if inbox:
            task.board_column_id = inbox.id
            selected_column = inbox

    if selected_column and ("status" not in payload.model_fields_set or not task.status):
        task.status = selected_column.canonical_status

    db.add(task)
    db.flush()
    log_history(db, task_id=task.id, action_type="task_created", new_value=task.title)
    db.commit()
    db.refresh(task)
    return task


@router.get("/{task_id}", response_model=TaskRead)
def get_task(task_id: int, db: Session = Depends(get_db)):
    return _get_task_or_404(db, task_id)


@router.patch("/{task_id}", response_model=TaskRead)
def patch_task(task_id: int, payload: TaskPatch, db: Session = Depends(get_db)):
    task = _get_task_or_404(db, task_id)
    patch_data = payload.model_dump(exclude_unset=True)
    if not patch_data:
        return task

    apply_task_patch(db, task, patch_data)
    db.commit()
    db.refresh(task)
    return task


@router.delete("/{task_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_task(task_id: int, db: Session = Depends(get_db)):
    task = _get_task_or_404(db, task_id)
    log_history(db, task_id=task.id, action_type="task_deleted", old_value=task.title)
    db.delete(task)
    db.commit()


@router.post("/{task_id}/archive", response_model=TaskRead)
def archive_task(task_id: int, db: Session = Depends(get_db)):
    task = _get_task_or_404(db, task_id)
    task.is_archived = True
    task.updated_at = datetime.utcnow()
    log_history(db, task_id=task.id, action_type="task_archived")
    db.commit()
    db.refresh(task)
    return task


@router.post("/{task_id}/restore", response_model=TaskRead)
def restore_task(task_id: int, db: Session = Depends(get_db)):
    task = _get_task_or_404(db, task_id)
    task.is_archived = False
    task.updated_at = datetime.utcnow()
    log_history(db, task_id=task.id, action_type="task_restored")
    db.commit()
    db.refresh(task)
    return task


@router.post("/{task_id}/complete", response_model=TaskRead)
def complete_task(task_id: int, db: Session = Depends(get_db)):
    task = _get_task_or_404(db, task_id)

    done_column = db.scalar(select(BoardColumn).where(BoardColumn.name == "Готово"))
    if done_column:
        task.board_column_id = done_column.id
        task.status = done_column.canonical_status

    task.is_done = True
    task.done_at = datetime.utcnow()
    task.updated_at = task.done_at
    log_history(db, task_id=task.id, action_type="task_completed")
    db.commit()
    db.refresh(task)
    return task


@router.post("/{task_id}/move", response_model=TaskRead)
def move_task(task_id: int, payload: TaskMove, db: Session = Depends(get_db)):
    task = _get_task_or_404(db, task_id)
    target_column = db.get(BoardColumn, payload.board_column_id)
    if not target_column:
        raise HTTPException(status_code=404, detail="Column not found")

    old_column_id = task.board_column_id
    old_status = task.status

    task.board_column_id = payload.board_column_id
    if payload.position is not None:
        task.position = payload.position
    task.status = target_column.canonical_status

    task.updated_at = datetime.utcnow()

    if old_column_id != task.board_column_id:
        log_history(
            db,
            task_id=task.id,
            action_type="column_changed",
            field_name="board_column_id",
            old_value=str(old_column_id) if old_column_id is not None else None,
            new_value=str(task.board_column_id),
        )
    if old_status != task.status:
        log_history(
            db,
            task_id=task.id,
            action_type="status_changed",
            field_name="status",
            old_value=old_status,
            new_value=task.status,
        )

    db.commit()
    db.refresh(task)
    return task
