import os
import time

from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware

from app.api import checklist, columns, comments, history, notifications, ops, reminders, tags, task_tags, tasks, today
from app.db.database import SessionLocal
from app.db.migrations import run_migrations
from app.models.models import BoardColumn
from app.observability import log_event, metrics_registry, setup_structured_logging
from app.services.reminder_notifications import ReminderNotificationWorker

def _allowed_origins() -> list[str]:
    raw = os.getenv("ALLOWED_ORIGINS", "http://localhost:5173,http://127.0.0.1:5173,http://localhost:8080")
    return [item.strip() for item in raw.split(",") if item.strip()]


app = FastAPI(title="Personal Kanban Board API", version="0.1.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=_allowed_origins(),
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(tasks.router)
app.include_router(history.router)
app.include_router(comments.router)
app.include_router(reminders.router)
app.include_router(tags.router)
app.include_router(task_tags.router)
app.include_router(checklist.router)
app.include_router(columns.router)
app.include_router(today.router)
app.include_router(notifications.router)
app.include_router(ops.router)

notification_worker = ReminderNotificationWorker(interval_seconds=5)


@app.on_event("startup")
def on_startup() -> None:
    setup_structured_logging()
    run_migrations()
    db = SessionLocal()
    try:
        defaults = [
            ("Входящие", "inbox"),
            ("К выполнению", "todo"),
            ("В работе", "in_progress"),
            ("На паузе", "paused"),
            ("Готово", "done"),
        ]
        for pos, (name, canonical_status) in enumerate(defaults):
            exists = db.query(BoardColumn).filter(BoardColumn.name == name).first()
            if not exists:
                db.add(BoardColumn(name=name, canonical_status=canonical_status, position=pos, is_system=True))
            elif exists.canonical_status != canonical_status:
                exists.canonical_status = canonical_status
        db.commit()
    finally:
        db.close()
    notification_worker.start()
    log_event("app_startup", status="ok")


@app.on_event("shutdown")
def on_shutdown() -> None:
    notification_worker.stop()
    log_event("app_shutdown", status="ok")


@app.middleware("http")
async def observe_requests(request: Request, call_next):
    started = time.perf_counter()
    status_code = 500
    try:
        response = await call_next(request)
        status_code = response.status_code
        return response
    finally:
        duration_seconds = time.perf_counter() - started
        metrics_registry.observe_request(status_code=status_code, duration_seconds=duration_seconds)
        log_event(
            "http_request",
            method=request.method,
            path=request.url.path,
            status_code=status_code,
            latency_ms=round(duration_seconds * 1000, 2),
        )
