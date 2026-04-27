from __future__ import annotations

from datetime import datetime, timedelta
import math

from fastapi import APIRouter, Depends, Query
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.db.database import get_db
from app.models.models import Task, TaskHistory
from app.schemas.schemas import (
    AgingWipBreakdown,
    AnalyticsReportResponse,
    AnalyticsSummary,
    AnalyticsTrendPoint,
    ThroughputVariability,
)

router = APIRouter(prefix="/analytics", tags=["analytics"])


def _hours_between(start: datetime | None, end: datetime | None) -> float | None:
    if not start or not end:
        return None
    diff = (end - start).total_seconds() / 3600
    return diff if diff >= 0 else None


def _aging_wip(open_tasks: list[Task], now: datetime) -> AgingWipBreakdown:
    less_than_1d = 0
    d1_to_3 = 0
    d4_to_7 = 0
    d8_to_14 = 0
    greater_than_14d = 0
    for task in open_tasks:
        age_hours = _hours_between(task.updated_at or task.created_at, now)
        if age_hours is None:
            continue
        age_days = age_hours / 24
        if age_days < 1:
            less_than_1d += 1
        elif age_days < 4:
            d1_to_3 += 1
        elif age_days < 8:
            d4_to_7 += 1
        elif age_days < 15:
            d8_to_14 += 1
        else:
            greater_than_14d += 1
    return AgingWipBreakdown(
        less_than_1d=less_than_1d,
        d1_to_3=d1_to_3,
        d4_to_7=d4_to_7,
        d8_to_14=d8_to_14,
        greater_than_14d=greater_than_14d,
    )


def _throughput_variability(values: list[int]) -> ThroughputVariability:
    if not values:
        return ThroughputVariability(mean_completed_per_period=0.0, stddev_completed_per_period=0.0, coeff_var_completed_per_period=None)
    mean_value = sum(values) / len(values)
    variance = sum((value - mean_value) ** 2 for value in values) / len(values)
    stddev = math.sqrt(variance)
    coeff_var = (stddev / mean_value) if mean_value > 0 else None
    return ThroughputVariability(
        mean_completed_per_period=mean_value,
        stddev_completed_per_period=stddev,
        coeff_var_completed_per_period=coeff_var,
    )


@router.get("/report", response_model=AnalyticsReportResponse)
def analytics_report(
    days: int = Query(default=30, ge=7, le=365),
    bucket: str = Query(default="week", pattern="^(day|week)$"),
    include_archived: bool = Query(default=False),
    db: Session = Depends(get_db),
):
    now = datetime.utcnow()
    window_start = now - timedelta(days=days)
    bucket_days = 1 if bucket == "day" else 7

    task_stmt = select(Task).where(Task.created_at >= window_start, Task.created_at <= now)
    if not include_archived:
        task_stmt = task_stmt.where(Task.is_archived.is_(False))
    tasks = db.scalars(task_stmt).all()

    done_task_ids = [task.id for task in tasks if task.done_at is not None]
    in_progress_starts: dict[int, datetime] = {}
    if done_task_ids:
        history_rows = db.scalars(
            select(TaskHistory)
            .where(
                TaskHistory.task_id.in_(done_task_ids),
                TaskHistory.field_name == "status",
                TaskHistory.new_value == "in_progress",
            )
            .order_by(TaskHistory.task_id, TaskHistory.created_at)
        ).all()
        for row in history_rows:
            in_progress_starts.setdefault(row.task_id, row.created_at)

    lead_values = [_hours_between(task.created_at, task.done_at) for task in tasks if task.done_at]
    cycle_values = [_hours_between(in_progress_starts.get(task.id), task.done_at) for task in tasks if task.done_at]
    lead_values = [item for item in lead_values if item is not None]
    cycle_values = [item for item in cycle_values if item is not None]

    buckets: list[AnalyticsTrendPoint] = []
    cumulative_created = 0
    cumulative_completed = 0
    completed_per_bucket: list[int] = []
    cursor = window_start
    while cursor < now:
        period_start = cursor
        period_end = min(now, cursor + timedelta(days=bucket_days))
        period_tasks = [task for task in tasks if period_start <= task.created_at < period_end]
        period_done = [task for task in tasks if task.done_at and period_start <= task.done_at < period_end]

        period_lead = [
            _hours_between(task.created_at, task.done_at)
            for task in period_done
            if _hours_between(task.created_at, task.done_at) is not None
        ]
        period_cycle = [
            _hours_between(in_progress_starts.get(task.id), task.done_at)
            for task in period_done
            if _hours_between(in_progress_starts.get(task.id), task.done_at) is not None
        ]
        overdue_open = [
            task
            for task in tasks
            if task.deadline_at and task.deadline_at < period_end and (task.done_at is None or task.done_at >= period_end)
        ]
        wip_open = [task for task in tasks if task.created_at <= period_end and (task.done_at is None or task.done_at >= period_end)]
        cumulative_created += len(period_tasks)
        cumulative_completed += len(period_done)
        completed_per_bucket.append(len(period_done))

        buckets.append(
            AnalyticsTrendPoint(
                period_start=period_start,
                period_end=period_end,
                completed_tasks=len(period_done),
                created_tasks=len(period_tasks),
                overdue_open_tasks=len(overdue_open),
                wip_open_tasks=len(wip_open),
                burnup_completed_cumulative=cumulative_completed,
                burnup_scope_cumulative=cumulative_created,
                burndown_remaining=max(cumulative_created - cumulative_completed, 0),
                avg_lead_time_hours=(sum(period_lead) / len(period_lead)) if period_lead else None,
                avg_cycle_time_hours=(sum(period_cycle) / len(period_cycle)) if period_cycle else None,
            )
        )
        cursor = period_end

    total_tasks = len(tasks)
    completed_tasks = len([task for task in tasks if task.done_at])
    open_tasks_now = [task for task in tasks if not task.is_done]
    summary = AnalyticsSummary(
        window_start=window_start,
        window_end=now,
        total_tasks=total_tasks,
        created_tasks=total_tasks,
        completed_tasks=completed_tasks,
        overdue_open_tasks=len([task for task in open_tasks_now if task.deadline_at and task.deadline_at < now]),
        wip_open_tasks=len(open_tasks_now),
        velocity_per_period=(completed_tasks / len(buckets)) if buckets else 0,
        avg_lead_time_hours=(sum(lead_values) / len(lead_values)) if lead_values else None,
        avg_cycle_time_hours=(sum(cycle_values) / len(cycle_values)) if cycle_values else None,
        aging_wip=_aging_wip(open_tasks_now, now=now),
        throughput_variability=_throughput_variability(completed_per_bucket),
    )
    return AnalyticsReportResponse(summary=summary, trend=buckets)
