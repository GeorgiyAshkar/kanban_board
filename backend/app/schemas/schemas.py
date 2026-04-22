from __future__ import annotations

from datetime import datetime
from typing import Any, Optional

from pydantic import BaseModel, Field, field_validator

from app.models.models import ReminderRepeatType, TaskPriority, TaskStatus


class TaskBase(BaseModel):
    title: str = Field(min_length=1, max_length=255)
    description: str = ""
    status: TaskStatus = TaskStatus.INBOX
    priority: TaskPriority = TaskPriority.NORMAL
    deadline_at: Optional[datetime] = None
    planned_return_at: Optional[datetime] = None
    position: int = 0
    board_column_id: Optional[int] = None
    project_id: Optional[str] = None
    color_mark: Optional[str] = None
    estimate_minutes: Optional[int] = None
    spent_minutes: Optional[int] = None


class TaskCreate(TaskBase):
    pass


class TaskPatch(BaseModel):
    title: Optional[str] = None
    description: Optional[str] = None
    status: Optional[TaskStatus] = None
    priority: Optional[TaskPriority] = None
    deadline_at: Optional[datetime] = None
    planned_return_at: Optional[datetime] = None
    position: Optional[int] = None
    board_column_id: Optional[int] = None
    project_id: Optional[str] = None
    color_mark: Optional[str] = None
    estimate_minutes: Optional[int] = None
    spent_minutes: Optional[int] = None
    is_done: Optional[bool] = None


class TaskRead(TaskBase):
    id: int
    is_archived: bool
    is_done: bool
    created_at: datetime
    updated_at: datetime
    done_at: Optional[datetime] = None

    class Config:
        from_attributes = True


class TaskMove(BaseModel):
    board_column_id: int
    status: Optional[TaskStatus] = None
    position: Optional[int] = None


class HistoryRead(BaseModel):
    id: int
    task_id: int
    created_at: datetime
    action_type: str
    field_name: Optional[str]
    old_value: Optional[str]
    new_value: Optional[str]
    comment: Optional[str]
    author: str
    meta_json: Optional[dict[str, Any]]

    class Config:
        from_attributes = True


class CommentCreate(BaseModel):
    text: str = Field(min_length=1)
    author: str = "local_user"


class CommentPatch(BaseModel):
    text: str = Field(min_length=1)


class CommentRead(BaseModel):
    id: int
    task_id: int
    text: str
    created_at: datetime
    updated_at: datetime
    author: str

    class Config:
        from_attributes = True


class ReminderCreate(BaseModel):
    remind_at: datetime
    message: Optional[str] = None
    repeat_type: ReminderRepeatType = ReminderRepeatType.NONE


class ReminderPatch(BaseModel):
    remind_at: Optional[datetime] = None
    message: Optional[str] = None
    repeat_type: Optional[ReminderRepeatType] = None
    is_completed: Optional[bool] = None


class ReminderRead(BaseModel):
    id: int
    task_id: int
    remind_at: datetime
    message: Optional[str]
    repeat_type: ReminderRepeatType
    is_completed: bool
    completed_at: Optional[datetime]
    notification_sent_at: Optional[datetime]
    created_at: datetime

    class Config:
        from_attributes = True


class TagCreate(BaseModel):
    name: str
    color: str = "#64748b"

    @field_validator("color")
    @classmethod
    def validate_color(cls, value: str) -> str:
        if not value or len(value) not in (4, 7) or not value.startswith("#"):
            raise ValueError("Color must be a valid hex value like #64748b")
        hex_part = value[1:]
        if not all(c in "0123456789abcdefABCDEF" for c in hex_part):
            raise ValueError("Color must be a valid hex value like #64748b")
        return value


class TagPatch(BaseModel):
    name: Optional[str] = None
    color: Optional[str] = None

    @field_validator("color")
    @classmethod
    def validate_color(cls, value: Optional[str]) -> Optional[str]:
        if value is None:
            return value
        if len(value) not in (4, 7) or not value.startswith("#"):
            raise ValueError("Color must be a valid hex value like #64748b")
        hex_part = value[1:]
        if not all(c in "0123456789abcdefABCDEF" for c in hex_part):
            raise ValueError("Color must be a valid hex value like #64748b")
        return value


class TagRead(BaseModel):
    id: int
    name: str
    color: str
    created_at: datetime

    class Config:
        from_attributes = True


class ColumnCreate(BaseModel):
    name: str
    position: int = 0
    color: str = "#e2e8f0"
    is_system: bool = False
    system_key: Optional[TaskStatus] = None


class ColumnPatch(BaseModel):
    name: Optional[str] = None
    position: Optional[int] = None
    color: Optional[str] = None
    system_key: Optional[TaskStatus] = None


class ColumnRead(BaseModel):
    id: int
    name: str
    position: int
    color: str
    is_system: bool
    system_key: Optional[TaskStatus]

    class Config:
        from_attributes = True


class TodayResponse(BaseModel):
    overdue: list[TaskRead]
    due_today: list[TaskRead]
    return_today: list[TaskRead]
    reminders_today: list[ReminderRead]
    stalled: list[TaskRead]


class ChecklistItemCreate(BaseModel):
    title: str = Field(min_length=1, max_length=255)
    position: int = 0


class ChecklistItemPatch(BaseModel):
    title: Optional[str] = None
    position: Optional[int] = None
    is_done: Optional[bool] = None


class ChecklistItemRead(BaseModel):
    id: int
    task_id: int
    title: str
    position: int
    is_done: bool
    done_at: Optional[datetime]
    created_at: datetime

    class Config:
        from_attributes = True


class TaskTagLinkCreate(BaseModel):
    tag_id: int


class BoardTaskMetadata(BaseModel):
    task_id: int
    tags: list[TagRead]
    checklist: list[ChecklistItemRead]
