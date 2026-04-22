from __future__ import annotations

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.db.database import get_db
from app.models.models import BoardColumn
from app.schemas.schemas import ColumnCreate, ColumnPatch, ColumnRead

router = APIRouter(prefix="/columns", tags=["columns"])


@router.get("", response_model=list[ColumnRead])
def list_columns(db: Session = Depends(get_db)):
    return db.scalars(select(BoardColumn).order_by(BoardColumn.position, BoardColumn.id)).all()


@router.post("", response_model=ColumnRead, status_code=status.HTTP_201_CREATED)
def create_column(payload: ColumnCreate, db: Session = Depends(get_db)):
    column = BoardColumn(**payload.model_dump())
    db.add(column)
    db.commit()
    db.refresh(column)
    return column


@router.patch("/{column_id}", response_model=ColumnRead)
def patch_column(column_id: int, payload: ColumnPatch, db: Session = Depends(get_db)):
    column = db.get(BoardColumn, column_id)
    if not column:
        raise HTTPException(status_code=404, detail="Column not found")

    for field, value in payload.model_dump(exclude_unset=True).items():
        setattr(column, field, value)

    db.commit()
    db.refresh(column)
    return column


@router.delete("/{column_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_column(column_id: int, db: Session = Depends(get_db)):
    column = db.get(BoardColumn, column_id)
    if not column:
        raise HTTPException(status_code=404, detail="Column not found")
    if column.is_system:
        raise HTTPException(status_code=400, detail="System column cannot be deleted")
    db.delete(column)
    db.commit()
