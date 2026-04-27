from __future__ import annotations

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import and_, select
from sqlalchemy.orm import Session

from app.db.database import get_db
from app.models.models import Tag, Task, TaskTag, User
from app.schemas.schemas import TagRead, TaskTagLinkCreate
from app.services.history import log_history
from app.security import ensure_task_owner_or_admin, get_current_user

router = APIRouter(tags=["task-tags"])


@router.get("/tasks/{task_id}/tags", response_model=list[TagRead])
def list_task_tags(task_id: int, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    task = db.get(Task, task_id)
    if not task:
        raise HTTPException(status_code=404, detail="Task not found")
    ensure_task_owner_or_admin(task.owner_id, current_user)
    stmt = (
        select(Tag)
        .join(TaskTag, Tag.id == TaskTag.tag_id)
        .where(TaskTag.task_id == task_id)
        .order_by(Tag.name)
    )
    return db.scalars(stmt).all()


@router.post("/tasks/{task_id}/tags", response_model=TagRead, status_code=status.HTTP_201_CREATED)
def add_task_tag(task_id: int, payload: TaskTagLinkCreate, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    task = db.get(Task, task_id)
    if not task:
        raise HTTPException(status_code=404, detail="Task not found")
    ensure_task_owner_or_admin(task.owner_id, current_user)

    tag = db.get(Tag, payload.tag_id)
    if not tag:
        raise HTTPException(status_code=404, detail="Tag not found")

    existing = db.scalar(select(TaskTag).where(and_(TaskTag.task_id == task_id, TaskTag.tag_id == payload.tag_id)))
    if existing:
        return tag

    link = TaskTag(task_id=task_id, tag_id=payload.tag_id)
    db.add(link)
    log_history(db, task_id=task_id, action_type="tag_added", new_value=tag.name)
    db.commit()
    return tag


@router.delete("/tasks/{task_id}/tags/{tag_id}", status_code=status.HTTP_204_NO_CONTENT)
def remove_task_tag(task_id: int, tag_id: int, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    task = db.get(Task, task_id)
    if not task:
        raise HTTPException(status_code=404, detail="Task not found")
    ensure_task_owner_or_admin(task.owner_id, current_user)
    link = db.scalar(select(TaskTag).where(and_(TaskTag.task_id == task_id, TaskTag.tag_id == tag_id)))
    if not link:
        raise HTTPException(status_code=404, detail="Task-tag link not found")

    tag = db.get(Tag, tag_id)
    if tag:
        log_history(db, task_id=task_id, action_type="tag_removed", old_value=tag.name)

    db.delete(link)
    db.commit()
