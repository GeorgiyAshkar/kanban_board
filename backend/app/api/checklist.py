from __future__ import annotations

from datetime import datetime

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.db.database import get_db
from app.models.models import Task, TaskChecklistItem
from app.schemas.schemas import ChecklistItemCreate, ChecklistItemPatch, ChecklistItemRead
from app.services.history import log_history

router = APIRouter(tags=["checklist"])


@router.get("/tasks/{task_id}/checklist", response_model=list[ChecklistItemRead])
def list_checklist(task_id: int, db: Session = Depends(get_db)):
    stmt = select(TaskChecklistItem).where(TaskChecklistItem.task_id == task_id).order_by(TaskChecklistItem.position, TaskChecklistItem.id)
    return db.scalars(stmt).all()


@router.post("/tasks/{task_id}/checklist", response_model=ChecklistItemRead, status_code=status.HTTP_201_CREATED)
def add_checklist_item(task_id: int, payload: ChecklistItemCreate, db: Session = Depends(get_db)):
    task = db.get(Task, task_id)
    if not task:
        raise HTTPException(status_code=404, detail="Task not found")

    item = TaskChecklistItem(task_id=task_id, **payload.model_dump())
    db.add(item)
    task.updated_at = datetime.utcnow()
    log_history(db, task_id=task_id, action_type="checklist_item_added", new_value=payload.title)
    db.commit()
    db.refresh(item)
    return item


@router.patch("/checklist/{item_id}", response_model=ChecklistItemRead)
def patch_checklist_item(item_id: int, payload: ChecklistItemPatch, db: Session = Depends(get_db)):
    item = db.get(TaskChecklistItem, item_id)
    if not item:
        raise HTTPException(status_code=404, detail="Checklist item not found")

    update_data = payload.model_dump(exclude_unset=True)
    for field, value in update_data.items():
        setattr(item, field, value)

    if item.is_done and item.done_at is None:
        item.done_at = datetime.utcnow()
        log_history(db, task_id=item.task_id, action_type="checklist_item_checked", new_value=item.title)
    elif not item.is_done:
        item.done_at = None

    if "title" in update_data:
        log_history(db, task_id=item.task_id, action_type="checklist_item_updated", new_value=item.title)

    db.commit()
    db.refresh(item)
    return item


@router.delete("/checklist/{item_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_checklist_item(item_id: int, db: Session = Depends(get_db)):
    item = db.get(TaskChecklistItem, item_id)
    if not item:
        raise HTTPException(status_code=404, detail="Checklist item not found")

    log_history(db, task_id=item.task_id, action_type="checklist_item_deleted", old_value=item.title)
    db.delete(item)
    db.commit()
