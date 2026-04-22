import os

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.api import checklist, columns, comments, history, reminders, tags, task_tags, tasks, today
from app.db.database import SessionLocal
from app.db.migrations import run_migrations
from app.models.models import BoardColumn, TaskStatus

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


@app.on_event("startup")
def on_startup() -> None:
    run_migrations()
    db = SessionLocal()
    try:
        defaults = [
            ("Входящие", TaskStatus.INBOX.value),
            ("К выполнению", TaskStatus.TODO.value),
            ("В работе", TaskStatus.IN_PROGRESS.value),
            ("На паузе", TaskStatus.PAUSED.value),
            ("Готово", TaskStatus.DONE.value),
        ]
        for pos, (name, system_key) in enumerate(defaults):
            exists = db.query(BoardColumn).filter(BoardColumn.system_key == system_key).first()
            if not exists:
                db.add(BoardColumn(name=name, system_key=system_key, position=pos, is_system=True))
        db.commit()
    finally:
        db.close()


@app.get("/health")
def health() -> dict[str, str]:
    return {"status": "ok"}
