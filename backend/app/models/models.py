from __future__ import annotations

from datetime import datetime
from enum import Enum

from sqlalchemy import (
    JSON,
    Boolean,
    Column,
    DateTime,
    Enum as SAEnum,
    ForeignKey,
    Integer,
    String,
    Text,
    UniqueConstraint,
)
from sqlalchemy.orm import relationship

from app.db.database import Base


class TaskPriority(str, Enum):
    LOW = "low"
    NORMAL = "normal"
    HIGH = "high"
    CRITICAL = "critical"


class TaskStatus(str, Enum):
    INBOX = "inbox"
    TODO = "todo"
    IN_PROGRESS = "in_progress"
    PAUSED = "paused"
    DONE = "done"


class ReminderRepeatType(str, Enum):
    NONE = "none"
    DAILY = "daily"
    WEEKLY = "weekly"
    MONTHLY = "monthly"
    CUSTOM = "custom"


class Task(Base):
    __tablename__ = "tasks"

    id = Column(Integer, primary_key=True, index=True)
    title = Column(String(255), nullable=False, index=True)
    description = Column(Text, default="")
    status = Column(SAEnum(TaskStatus), default=TaskStatus.INBOX, index=True)
    priority = Column(SAEnum(TaskPriority), default=TaskPriority.NORMAL)
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)
    updated_at = Column(DateTime, default=datetime.utcnow, nullable=False)
    deadline_at = Column(DateTime, nullable=True)
    planned_return_at = Column(DateTime, nullable=True)
    is_archived = Column(Boolean, default=False, nullable=False)
    is_done = Column(Boolean, default=False, nullable=False)
    done_at = Column(DateTime, nullable=True)
    position = Column(Integer, default=0, nullable=False)
    board_column_id = Column(Integer, ForeignKey("board_columns.id"), nullable=True)
    project_id = Column(String(128), nullable=True)
    color_mark = Column(String(32), nullable=True)
    estimate_minutes = Column(Integer, nullable=True)
    spent_minutes = Column(Integer, nullable=True)

    history = relationship("TaskHistory", back_populates="task", cascade="all, delete-orphan")
    comments = relationship("TaskComment", back_populates="task", cascade="all, delete-orphan")
    reminders = relationship("TaskReminder", back_populates="task", cascade="all, delete-orphan")
    checklist_items = relationship("TaskChecklistItem", back_populates="task", cascade="all, delete-orphan")
    tags = relationship("TaskTag", back_populates="task", cascade="all, delete-orphan")


class TaskHistory(Base):
    __tablename__ = "task_history"

    id = Column(Integer, primary_key=True, index=True)
    task_id = Column(Integer, ForeignKey("tasks.id"), nullable=False, index=True)
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False, index=True)
    action_type = Column(String(64), nullable=False, index=True)
    field_name = Column(String(64), nullable=True)
    old_value = Column(Text, nullable=True)
    new_value = Column(Text, nullable=True)
    comment = Column(Text, nullable=True)
    author = Column(String(128), default="local_user", nullable=False)
    meta_json = Column(JSON, nullable=True)

    task = relationship("Task", back_populates="history")


class TaskComment(Base):
    __tablename__ = "task_comments"

    id = Column(Integer, primary_key=True, index=True)
    task_id = Column(Integer, ForeignKey("tasks.id"), nullable=False, index=True)
    text = Column(Text, nullable=False)
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)
    updated_at = Column(DateTime, default=datetime.utcnow, nullable=False)
    author = Column(String(128), default="local_user", nullable=False)

    task = relationship("Task", back_populates="comments")


class TaskReminder(Base):
    __tablename__ = "task_reminders"

    id = Column(Integer, primary_key=True, index=True)
    task_id = Column(Integer, ForeignKey("tasks.id"), nullable=False, index=True)
    remind_at = Column(DateTime, nullable=False, index=True)
    message = Column(Text, nullable=True)
    repeat_type = Column(SAEnum(ReminderRepeatType), default=ReminderRepeatType.NONE)
    is_completed = Column(Boolean, default=False, nullable=False)
    completed_at = Column(DateTime, nullable=True)
    notification_sent_at = Column(DateTime, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)

    task = relationship("Task", back_populates="reminders")


class Tag(Base):
    __tablename__ = "tags"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String(64), unique=True, nullable=False, index=True)
    color = Column(String(32), default="#64748b")
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)

    tasks = relationship("TaskTag", back_populates="tag", cascade="all, delete-orphan")


class TaskTag(Base):
    __tablename__ = "task_tags"
    __table_args__ = (UniqueConstraint("task_id", "tag_id", name="uq_task_tag"),)

    id = Column(Integer, primary_key=True, index=True)
    task_id = Column(Integer, ForeignKey("tasks.id"), nullable=False, index=True)
    tag_id = Column(Integer, ForeignKey("tags.id"), nullable=False, index=True)

    task = relationship("Task", back_populates="tags")
    tag = relationship("Tag", back_populates="tasks")


class TaskChecklistItem(Base):
    __tablename__ = "task_checklist_items"

    id = Column(Integer, primary_key=True, index=True)
    task_id = Column(Integer, ForeignKey("tasks.id"), nullable=False, index=True)
    title = Column(String(255), nullable=False)
    position = Column(Integer, default=0, nullable=False)
    is_done = Column(Boolean, default=False, nullable=False)
    done_at = Column(DateTime, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)

    task = relationship("Task", back_populates="checklist_items")


class BoardColumn(Base):
    __tablename__ = "board_columns"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String(128), nullable=False, unique=True)
    system_key = Column(String(64), nullable=True, unique=True)
    position = Column(Integer, default=0, nullable=False)
    color = Column(String(32), default="#e2e8f0")
    is_system = Column(Boolean, default=True, nullable=False)
