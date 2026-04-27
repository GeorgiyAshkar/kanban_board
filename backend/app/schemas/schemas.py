from __future__ import annotations

from datetime import datetime
from typing import Any, Optional

from pydantic import BaseModel, Field

from app.models.models import ReminderNotificationStatus, ReminderRepeatType, TaskPriority


class TaskBase(BaseModel):
    title: str = Field(min_length=1, max_length=255)
    description: str = ""
    status: str = "inbox"
    priority: TaskPriority = TaskPriority.NORMAL
    deadline_at: Optional[datetime] = None
    planned_return_at: Optional[datetime] = None
    position: int = 0
    board_column_id: Optional[int] = None
    project_id: Optional[str] = None
    color_mark: Optional[str] = None
    estimate_minutes: Optional[int] = None
    spent_minutes: Optional[int] = None
    assignee_last_name: Optional[str] = None
    assignee_first_name: Optional[str] = None
    assignee_middle_name: Optional[str] = None
    assignee_phone: Optional[str] = None
    assignee_email: Optional[str] = None
    assignee_org: Optional[str] = None
    emoji: Optional[str] = None


class TaskCreate(TaskBase):
    pass


class TaskPatch(BaseModel):
    row_version: Optional[int] = Field(default=None, ge=1)
    title: Optional[str] = None
    description: Optional[str] = None
    status: Optional[str] = None
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
    assignee_last_name: Optional[str] = None
    assignee_first_name: Optional[str] = None
    assignee_middle_name: Optional[str] = None
    assignee_phone: Optional[str] = None
    assignee_email: Optional[str] = None
    assignee_org: Optional[str] = None
    emoji: Optional[str] = None


class TaskRead(TaskBase):
    id: int
    row_version: int
    is_archived: bool
    is_done: bool
    created_at: datetime
    updated_at: datetime
    done_at: Optional[datetime] = None

    class Config:
        from_attributes = True


class TaskMove(BaseModel):
    board_column_id: int
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


class TagPatch(BaseModel):
    name: Optional[str] = None
    color: Optional[str] = None


class TagRead(BaseModel):
    id: int
    name: str
    color: str
    created_at: datetime

    class Config:
        from_attributes = True


class ColumnCreate(BaseModel):
    name: str
    canonical_status: str = "inbox"
    position: int = 0
    color: str = "#e2e8f0"
    wip_limit: Optional[int] = Field(default=None, ge=1, le=999)
    sla_hours: Optional[int] = Field(default=None, ge=1, le=720)
    is_system: bool = False


class ColumnPatch(BaseModel):
    name: Optional[str] = None
    canonical_status: Optional[str] = None
    position: Optional[int] = None
    color: Optional[str] = None
    wip_limit: Optional[int] = Field(default=None, ge=1, le=999)
    sla_hours: Optional[int] = Field(default=None, ge=1, le=720)


class ColumnRead(BaseModel):
    id: int
    name: str
    canonical_status: str
    position: int
    color: str
    wip_limit: Optional[int] = None
    sla_hours: Optional[int] = None
    is_system: bool

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


class TaskDetailsResponse(BaseModel):
    comments: list[CommentRead]
    reminders: list[ReminderRead]
    checklist: list[ChecklistItemRead]
    history: list[HistoryRead]
    tags: list[TagRead]


class BoardResponse(BaseModel):
    tasks: list[TaskRead]
    columns: list[ColumnRead]
    metadata: list[BoardTaskMetadata]
    total: int
    limit: int
    offset: int


class ReminderNotificationRead(BaseModel):
    id: int
    reminder_id: int
    task_id: int
    title: str
    body: Optional[str] = None
    status: ReminderNotificationStatus
    created_at: datetime
    dispatched_at: Optional[datetime] = None

    class Config:
        from_attributes = True


class AnalyticsTrendPoint(BaseModel):
    period_start: datetime
    period_end: datetime
    completed_tasks: int
    created_tasks: int
    overdue_open_tasks: int
    wip_open_tasks: int
    burnup_completed_cumulative: int
    burnup_scope_cumulative: int
    burndown_remaining: int
    avg_lead_time_hours: float | None = None
    avg_cycle_time_hours: float | None = None


class AgingWipBreakdown(BaseModel):
    less_than_1d: int
    d1_to_3: int
    d4_to_7: int
    d8_to_14: int
    greater_than_14d: int


class ThroughputVariability(BaseModel):
    mean_completed_per_period: float
    stddev_completed_per_period: float
    coeff_var_completed_per_period: float | None = None


class AnalyticsSummary(BaseModel):
    window_start: datetime
    window_end: datetime
    total_tasks: int
    created_tasks: int
    completed_tasks: int
    overdue_open_tasks: int
    wip_open_tasks: int
    velocity_per_period: float
    avg_lead_time_hours: float | None = None
    avg_cycle_time_hours: float | None = None
    aging_wip: AgingWipBreakdown
    throughput_variability: ThroughputVariability


class AnalyticsReportResponse(BaseModel):
    summary: AnalyticsSummary
    trend: list[AnalyticsTrendPoint]
