from __future__ import annotations

from datetime import date, datetime, time

from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy import func, or_, select
from sqlalchemy.orm import Session

from app.db.database import get_db
from app.models.models import BoardColumn, Tag, Task, TaskChecklistItem, TaskComment, TaskHistory, TaskReminder, TaskTag, User, UserRole
from app.schemas.schemas import (
    BoardResponse,
    BoardTaskMetadata,
    ChecklistItemRead,
    CommentRead,
    HistoryRead,
    ReminderRead,
    TagRead,
    TaskCreate,
    TaskDetailsResponse,
    TaskMove,
    TaskPatch,
    TaskRead,
)
from app.services.history import log_history
from app.services.tasks import apply_task_patch, touch_task
from app.security import ensure_task_owner_or_admin, get_current_user

router = APIRouter(prefix="/tasks", tags=["tasks"])


def _get_task_or_404(db: Session, task_id: int, user: User) -> Task:
    task = db.get(Task, task_id)
    if not task:
        raise HTTPException(status_code=404, detail="Task not found")
    ensure_task_owner_or_admin(task.owner_id, user)
    return task


DEFAULT_PAGE_SIZE = 50


def _build_task_filters(
    stmt,
    *,
    archived: bool | None,
    is_done: bool | None,
    status_filter: str | None,
    priority: str | None,
    board_column_id: int | None,
    board_column_ids: list[int] | None,
    assignee: str | None,
    date_field: str | None,
    date_from: date | None,
    date_to: date | None,
    tag_ids: list[int] | None,
    q: str | None,
):
    if archived is not None:
        stmt = stmt.where(Task.is_archived == archived)
    if is_done is not None:
        stmt = stmt.where(Task.is_done == is_done)
    if status_filter:
        stmt = stmt.where(Task.status == status_filter)
    if priority:
        stmt = stmt.where(Task.priority == priority)
    if board_column_id is not None:
        stmt = stmt.where(Task.board_column_id == board_column_id)
    if board_column_ids:
        stmt = stmt.where(Task.board_column_id.in_(board_column_ids))
    if assignee:
        assignee_like = f"%{assignee.strip()}%"
        stmt = stmt.where(
            or_(
                Task.assignee_last_name.ilike(assignee_like),
                Task.assignee_first_name.ilike(assignee_like),
                Task.assignee_middle_name.ilike(assignee_like),
                Task.assignee_email.ilike(assignee_like),
                Task.assignee_org.ilike(assignee_like),
            )
        )
    if date_field in {"deadline_at", "planned_return_at", "created_at", "updated_at", "done_at"}:
        column = getattr(Task, date_field)
        if date_from:
            stmt = stmt.where(column >= datetime.combine(date_from, time.min))
        if date_to:
            stmt = stmt.where(column <= datetime.combine(date_to, time.max))
    if tag_ids:
        tag_filter_subquery = (
            select(TaskTag.task_id)
            .where(TaskTag.tag_id.in_(tag_ids))
            .group_by(TaskTag.task_id)
            .having(func.count(func.distinct(TaskTag.tag_id)) == len(set(tag_ids)))
        )
        stmt = stmt.where(Task.id.in_(tag_filter_subquery))
    if q:
        like = f"%{q.strip()}%"
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
                Task.assignee_last_name.ilike(like),
                Task.assignee_first_name.ilike(like),
                Task.assignee_middle_name.ilike(like),
                Task.assignee_email.ilike(like),
                Task.assignee_org.ilike(like),
                Task.id.in_(select(tag_subquery.c.task_id)),
                Task.id.in_(select(comment_subquery.c.task_id)),
            )
        )
    return stmt


@router.get("", response_model=list[TaskRead])
def list_tasks(
    q: str | None = None,
    archived: bool | None = None,
    is_done: bool | None = None,
    status_filter: str | None = Query(default=None, alias="status"),
    priority: str | None = None,
    board_column_id: int | None = None,
    board_column_ids: list[int] = Query(default=[]),
    assignee: str | None = None,
    date_field: str | None = Query(default=None, pattern="^(deadline_at|planned_return_at|created_at|updated_at|done_at)$"),
    date_from: date | None = None,
    date_to: date | None = None,
    tag_ids: list[int] = Query(default=[]),
    limit: int = Query(default=DEFAULT_PAGE_SIZE, ge=1, le=200),
    offset: int = Query(default=0, ge=0),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    stmt = select(Task)
    if current_user.role != UserRole.ADMIN:
        stmt = stmt.where(Task.owner_id == current_user.id)
    stmt = _build_task_filters(
        stmt,
        archived=archived,
        is_done=is_done,
        status_filter=status_filter,
        priority=priority,
        board_column_id=board_column_id,
        board_column_ids=board_column_ids,
        assignee=assignee,
        date_field=date_field,
        date_from=date_from,
        date_to=date_to,
        tag_ids=tag_ids,
        q=q,
    )
    stmt = stmt.order_by(Task.board_column_id, Task.position, Task.id)
    stmt = stmt.limit(limit).offset(offset)
    return db.scalars(stmt).all()


@router.get("/board", response_model=BoardResponse)
def board_view(
    q: str | None = None,
    archived: bool | None = False,
    is_done: bool | None = None,
    status_filter: str | None = Query(default=None, alias="status"),
    priority: str | None = None,
    board_column_id: int | None = None,
    board_column_ids: list[int] = Query(default=[]),
    assignee: str | None = None,
    date_field: str | None = Query(default=None, pattern="^(deadline_at|planned_return_at|created_at|updated_at|done_at)$"),
    date_from: date | None = None,
    date_to: date | None = None,
    tag_ids: list[int] = Query(default=[]),
    limit: int = Query(default=DEFAULT_PAGE_SIZE, ge=1, le=200),
    offset: int = Query(default=0, ge=0),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    base_stmt = _build_task_filters(
        select(Task),
        archived=archived,
        is_done=is_done,
        status_filter=status_filter,
        priority=priority,
        board_column_id=board_column_id,
        board_column_ids=board_column_ids,
        assignee=assignee,
        date_field=date_field,
        date_from=date_from,
        date_to=date_to,
        tag_ids=tag_ids,
        q=q,
    )
    if current_user.role != UserRole.ADMIN:
        base_stmt = base_stmt.where(Task.owner_id == current_user.id)
    total = db.scalar(select(func.count()).select_from(base_stmt.subquery())) or 0
    tasks = db.scalars(base_stmt.order_by(Task.board_column_id, Task.position, Task.id).limit(limit).offset(offset)).all()
    task_ids = [task.id for task in tasks]
    metadata = board_metadata(task_ids=task_ids, db=db)
    columns = db.scalars(select(BoardColumn).order_by(BoardColumn.position, BoardColumn.id)).all()
    return BoardResponse(tasks=tasks, columns=columns, metadata=metadata, total=total, limit=limit, offset=offset)


@router.get("/board-metadata", response_model=list[BoardTaskMetadata])
def board_metadata(
    task_ids: list[int] = Query(default=[]),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    ids = [task_id for task_id in task_ids if task_id > 0]
    if not ids:
        return []

    visible_tasks_subquery = select(Task.id).where(Task.id.in_(ids))
    if current_user.role != UserRole.ADMIN:
        visible_tasks_subquery = visible_tasks_subquery.where(Task.owner_id == current_user.id)
    visible_task_ids = [row[0] for row in db.execute(visible_tasks_subquery).all()]
    if not visible_task_ids:
        return []

    tags_stmt = (
        select(TaskTag.task_id, Tag)
        .join(Tag, Tag.id == TaskTag.tag_id)
        .where(TaskTag.task_id.in_(visible_task_ids))
        .order_by(TaskTag.task_id, Tag.name)
    )
    checklist_stmt = (
        select(TaskChecklistItem)
        .where(TaskChecklistItem.task_id.in_(visible_task_ids))
        .order_by(TaskChecklistItem.task_id, TaskChecklistItem.position, TaskChecklistItem.id)
    )

    tags_by_task: dict[int, list[TagRead]] = {task_id: [] for task_id in visible_task_ids}
    checklist_by_task: dict[int, list[ChecklistItemRead]] = {task_id: [] for task_id in visible_task_ids}

    for task_id, tag in db.execute(tags_stmt).all():
        tags_by_task.setdefault(task_id, []).append(TagRead.model_validate(tag))

    for item in db.scalars(checklist_stmt).all():
        checklist_by_task.setdefault(item.task_id, []).append(ChecklistItemRead.model_validate(item))

    return [
        BoardTaskMetadata(task_id=task_id, tags=tags_by_task.get(task_id, []), checklist=checklist_by_task.get(task_id, []))
        for task_id in visible_task_ids
    ]


@router.post("", response_model=TaskRead, status_code=status.HTTP_201_CREATED)
def create_task(payload: TaskCreate, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    task = Task(**payload.model_dump())
    task.created_at = datetime.utcnow()
    task.updated_at = task.created_at
    task.row_version = 1
    task.owner_id = current_user.id

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
def get_task(task_id: int, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    return _get_task_or_404(db, task_id, current_user)


@router.get("/{task_id}/details", response_model=TaskDetailsResponse)
def get_task_details(task_id: int, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    _get_task_or_404(db, task_id, current_user)
    comments = db.scalars(select(TaskComment).where(TaskComment.task_id == task_id).order_by(TaskComment.created_at, TaskComment.id)).all()
    reminders = db.scalars(select(TaskReminder).where(TaskReminder.task_id == task_id).order_by(TaskReminder.remind_at, TaskReminder.id)).all()
    checklist = db.scalars(
        select(TaskChecklistItem).where(TaskChecklistItem.task_id == task_id).order_by(TaskChecklistItem.position, TaskChecklistItem.id)
    ).all()
    history = db.scalars(select(TaskHistory).where(TaskHistory.task_id == task_id).order_by(TaskHistory.created_at.desc(), TaskHistory.id.desc())).all()
    tags_stmt = (
        select(Tag)
        .join(TaskTag, TaskTag.tag_id == Tag.id)
        .where(TaskTag.task_id == task_id)
        .order_by(Tag.name, Tag.id)
    )
    tags = db.scalars(tags_stmt).all()
    return TaskDetailsResponse(
        comments=[CommentRead.model_validate(item) for item in comments],
        reminders=[ReminderRead.model_validate(item) for item in reminders],
        checklist=[ChecklistItemRead.model_validate(item) for item in checklist],
        history=[HistoryRead.model_validate(item) for item in history],
        tags=[TagRead.model_validate(item) for item in tags],
    )


@router.patch("/{task_id}", response_model=TaskRead)
def patch_task(task_id: int, payload: TaskPatch, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    task = _get_task_or_404(db, task_id, current_user)
    patch_data = payload.model_dump(exclude_unset=True)
    if not patch_data:
        return task

    expected_row_version = patch_data.pop("row_version", None)
    if expected_row_version is None:
        raise HTTPException(status_code=428, detail="row_version is required for optimistic locking")
    if expected_row_version != task.row_version:
        raise HTTPException(
            status_code=409,
            detail={
                "message": "Task has been modified by another operation",
                "current_row_version": task.row_version,
            },
        )
    if not patch_data:
        return task

    apply_task_patch(db, task, patch_data)
    db.commit()
    db.refresh(task)
    return task


@router.delete("/{task_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_task(task_id: int, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    task = _get_task_or_404(db, task_id, current_user)
    log_history(db, task_id=task.id, action_type="task_deleted", old_value=task.title)
    db.delete(task)
    db.commit()


@router.post("/{task_id}/archive", response_model=TaskRead)
def archive_task(task_id: int, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    task = _get_task_or_404(db, task_id, current_user)
    task.is_archived = True
    touch_task(task)
    log_history(db, task_id=task.id, action_type="task_archived")
    db.commit()
    db.refresh(task)
    return task


@router.post("/{task_id}/restore", response_model=TaskRead)
def restore_task(task_id: int, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    task = _get_task_or_404(db, task_id, current_user)
    task.is_archived = False
    touch_task(task)
    log_history(db, task_id=task.id, action_type="task_restored")
    db.commit()
    db.refresh(task)
    return task


@router.post("/{task_id}/complete", response_model=TaskRead)
def complete_task(task_id: int, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    task = _get_task_or_404(db, task_id, current_user)

    done_column = db.scalar(select(BoardColumn).where(BoardColumn.name == "Готово"))
    if done_column:
        task.board_column_id = done_column.id
        task.status = done_column.canonical_status

    task.is_done = True
    task.done_at = datetime.utcnow()
    touch_task(task, at=task.done_at)
    log_history(db, task_id=task.id, action_type="task_completed")
    db.commit()
    db.refresh(task)
    return task


@router.post("/{task_id}/move", response_model=TaskRead)
def move_task(task_id: int, payload: TaskMove, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    task = _get_task_or_404(db, task_id, current_user)
    target_column = db.get(BoardColumn, payload.board_column_id)
    if not target_column:
        raise HTTPException(status_code=404, detail="Column not found")

    old_column_id = task.board_column_id
    old_status = task.status

    task.board_column_id = payload.board_column_id
    if payload.position is not None:
        task.position = payload.position
    task.status = target_column.canonical_status

    touch_task(task)

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
