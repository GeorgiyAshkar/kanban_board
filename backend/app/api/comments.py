from __future__ import annotations

from datetime import datetime

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.db.database import get_db
from app.models.models import Task, TaskComment
from app.schemas.schemas import CommentCreate, CommentPatch, CommentRead
from app.services.history import log_history

router = APIRouter(tags=["comments"])


@router.get("/tasks/{task_id}/comments", response_model=list[CommentRead])
def list_comments(task_id: int, db: Session = Depends(get_db)):
    return db.scalars(select(TaskComment).where(TaskComment.task_id == task_id).order_by(TaskComment.created_at.desc())).all()


@router.post("/tasks/{task_id}/comments", response_model=CommentRead, status_code=status.HTTP_201_CREATED)
def add_comment(task_id: int, payload: CommentCreate, db: Session = Depends(get_db)):
    task = db.get(Task, task_id)
    if not task:
        raise HTTPException(status_code=404, detail="Task not found")

    comment = TaskComment(task_id=task_id, text=payload.text, author=payload.author)
    db.add(comment)
    task.updated_at = datetime.utcnow()
    log_history(db, task_id=task_id, action_type="comment_added", comment=payload.text[:200])
    db.commit()
    db.refresh(comment)
    return comment


@router.patch("/comments/{comment_id}", response_model=CommentRead)
def patch_comment(comment_id: int, payload: CommentPatch, db: Session = Depends(get_db)):
    comment = db.get(TaskComment, comment_id)
    if not comment:
        raise HTTPException(status_code=404, detail="Comment not found")

    old_text = comment.text
    comment.text = payload.text
    comment.updated_at = datetime.utcnow()
    log_history(
        db,
        task_id=comment.task_id,
        action_type="comment_updated",
        old_value=old_text[:200],
        new_value=payload.text[:200],
    )
    db.commit()
    db.refresh(comment)
    return comment


@router.delete("/comments/{comment_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_comment(comment_id: int, db: Session = Depends(get_db)):
    comment = db.get(TaskComment, comment_id)
    if not comment:
        raise HTTPException(status_code=404, detail="Comment not found")

    log_history(db, task_id=comment.task_id, action_type="comment_deleted", old_value=comment.text[:200])
    db.delete(comment)
    db.commit()
