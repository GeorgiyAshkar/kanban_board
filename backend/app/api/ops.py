from __future__ import annotations

import os
import time

from fastapi import APIRouter
from fastapi.responses import PlainTextResponse
from sqlalchemy import func, select, text

from app.db.database import SessionLocal
from app.models.models import ReminderNotification, ReminderNotificationStatus, TaskReminder
from app.observability import LATENCY_BUCKETS, metrics_registry

router = APIRouter(tags=["ops"])


def _threshold(name: str, default: float) -> float:
    raw = os.getenv(name)
    if raw is None:
        return default
    try:
        return float(raw)
    except ValueError:
        return default


@router.get("/health")
def health() -> dict[str, str]:
    return {"status": "ok"}


@router.get("/ready")
def readiness() -> dict[str, object]:
    db = SessionLocal()
    started = time.time()
    try:
        db.execute(text("SELECT 1"))
        db_latency_ms = round((time.time() - started) * 1000, 2)
        return {"status": "ready", "checks": {"database": "ok", "db_ping_ms": db_latency_ms}}
    finally:
        db.close()


@router.get("/metrics", response_class=PlainTextResponse)
def metrics() -> str:
    snapshot = metrics_registry.snapshot()
    db = SessionLocal()
    try:
        reminder_queue_size = db.scalar(
            select(func.count(ReminderNotification.id)).where(
                ReminderNotification.status == ReminderNotificationStatus.QUEUED
            )
        ) or 0
        overdue_unsent = db.scalar(
            select(func.count(TaskReminder.id)).where(
                TaskReminder.is_completed.is_(False),
                TaskReminder.notification_sent_at.is_(None),
            )
        ) or 0
    finally:
        db.close()

    lines = [
        "# HELP http_requests_total Total number of HTTP requests.",
        "# TYPE http_requests_total counter",
        f"http_requests_total {snapshot['requests_total']}",
        "# HELP http_request_errors_total Total number of server-side HTTP errors (5xx).",
        "# TYPE http_request_errors_total counter",
        f"http_request_errors_total {snapshot['errors_total']}",
        "# HELP http_request_error_rate Ratio of 5xx responses to all responses.",
        "# TYPE http_request_error_rate gauge",
        f"http_request_error_rate {(snapshot['errors_total'] / snapshot['requests_total']) if snapshot['requests_total'] else 0}",
        "# HELP http_request_duration_seconds Request latency histogram buckets.",
        "# TYPE http_request_duration_seconds histogram",
    ]
    cumulative = 0
    for bucket in LATENCY_BUCKETS:
        cumulative += int(snapshot["request_duration_buckets"][bucket.key])
        lines.append(f'http_request_duration_seconds_bucket{{le="{bucket.key}"}} {cumulative}')
    lines.extend(
        [
            f'http_request_duration_seconds_bucket{{le="+Inf"}} {snapshot["request_duration_seconds_count"]}',
            f"http_request_duration_seconds_sum {snapshot['request_duration_seconds_sum']}",
            f"http_request_duration_seconds_count {snapshot['request_duration_seconds_count']}",
            "# HELP reminders_queue_size Number of reminder notifications waiting in queue.",
            "# TYPE reminders_queue_size gauge",
            f"reminders_queue_size {reminder_queue_size}",
            "# HELP reminders_overdue_unsent Number of reminders not yet sent.",
            "# TYPE reminders_overdue_unsent gauge",
            f"reminders_overdue_unsent {overdue_unsent}",
        ]
    )
    return "\n".join(lines) + "\n"


@router.get("/alerts")
def alerts() -> dict[str, object]:
    snapshot = metrics_registry.snapshot()
    db = SessionLocal()
    try:
        queue_size = db.scalar(
            select(func.count(ReminderNotification.id)).where(
                ReminderNotification.status == ReminderNotificationStatus.QUEUED
            )
        ) or 0
    finally:
        db.close()

    error_rate = (snapshot["errors_total"] / snapshot["requests_total"]) if snapshot["requests_total"] else 0
    avg_latency = (
        snapshot["request_duration_seconds_sum"] / snapshot["request_duration_seconds_count"]
        if snapshot["request_duration_seconds_count"]
        else 0
    )

    latency_threshold = _threshold("ALERT_HTTP_AVG_LATENCY_SECONDS", 1.0)
    error_rate_threshold = _threshold("ALERT_HTTP_ERROR_RATE", 0.05)
    queue_size_threshold = _threshold("ALERT_REMINDER_QUEUE_SIZE", 50)

    alerts = [
        {
            "name": "high_http_avg_latency",
            "value": avg_latency,
            "threshold": latency_threshold,
            "firing": avg_latency > latency_threshold,
        },
        {
            "name": "high_http_error_rate",
            "value": error_rate,
            "threshold": error_rate_threshold,
            "firing": error_rate > error_rate_threshold,
        },
        {
            "name": "high_reminder_queue_size",
            "value": queue_size,
            "threshold": queue_size_threshold,
            "firing": queue_size > queue_size_threshold,
        },
    ]
    return {"alerts": alerts}
