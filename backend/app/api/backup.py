from __future__ import annotations

import csv
import io
import json
import zipfile
from datetime import datetime

from fastapi import APIRouter, Depends, HTTPException
from fastapi.responses import StreamingResponse
from sqlalchemy import delete, select
from sqlalchemy.orm import Session

from app.db.database import get_db
from app.models.models import BoardColumn, Tag, Task, TaskTag
from app.schemas.schemas import (
    BackupImportRequest,
    BackupImportResponse,
    BackupMetadata,
    BackupPayload,
    BackupTaskItem,
    ColumnRead,
    TagRead,
)

router = APIRouter(prefix="/backup", tags=["backup"])
APP_VERSION = "0.1.0"


def _build_backup_payload(db: Session) -> BackupPayload:
    columns = db.scalars(select(BoardColumn).order_by(BoardColumn.position, BoardColumn.id)).all()
    tags = db.scalars(select(Tag).order_by(Tag.name, Tag.id)).all()
    tasks = db.scalars(select(Task).order_by(Task.id)).all()

    task_ids = [task.id for task in tasks]
    tags_by_task: dict[int, list[str]] = {task_id: [] for task_id in task_ids}
    if task_ids:
        tagged_rows = db.execute(
            select(TaskTag.task_id, Tag.name)
            .join(Tag, Tag.id == TaskTag.tag_id)
            .where(TaskTag.task_id.in_(task_ids))
            .order_by(TaskTag.task_id, Tag.name)
        ).all()
        for task_id, tag_name in tagged_rows:
            tags_by_task.setdefault(task_id, []).append(tag_name)

    columns_by_id = {column.id: column.name for column in columns}
    backup_tasks = [
        BackupTaskItem(
            title=task.title,
            description=task.description or "",
            status=task.status,
            priority=task.priority,
            deadline_at=task.deadline_at,
            planned_return_at=task.planned_return_at,
            position=task.position,
            board_column_name=columns_by_id.get(task.board_column_id) if task.board_column_id else None,
            project_id=task.project_id,
            color_mark=task.color_mark,
            estimate_minutes=task.estimate_minutes,
            spent_minutes=task.spent_minutes,
            assignee_last_name=task.assignee_last_name,
            assignee_first_name=task.assignee_first_name,
            assignee_middle_name=task.assignee_middle_name,
            assignee_phone=task.assignee_phone,
            assignee_email=task.assignee_email,
            assignee_org=task.assignee_org,
            emoji=task.emoji,
            is_done=task.is_done,
            is_archived=task.is_archived,
            done_at=task.done_at,
            tags=tags_by_task.get(task.id, []),
        )
        for task in tasks
    ]

    metadata = BackupMetadata(
        exported_at=datetime.utcnow(),
        app_version=APP_VERSION,
        task_count=len(tasks),
        column_count=len(columns),
        tag_count=len(tags),
    )

    return BackupPayload(
        metadata=metadata,
        columns=[ColumnRead.model_validate(item) for item in columns],
        tags=[TagRead.model_validate(item) for item in tags],
        tasks=backup_tasks,
    )


@router.get("/export.json", response_model=BackupPayload)
def export_json(db: Session = Depends(get_db)):
    return _build_backup_payload(db)


@router.get("/export.csv")
def export_csv(db: Session = Depends(get_db)):
    payload = _build_backup_payload(db)
    buffer = io.StringIO()
    writer = csv.writer(buffer)
    writer.writerow(
        [
            "title",
            "description",
            "status",
            "priority",
            "board_column_name",
            "is_done",
            "is_archived",
            "deadline_at",
            "planned_return_at",
            "done_at",
            "assignee_email",
            "assignee_org",
            "tags",
        ]
    )
    for task in payload.tasks:
        writer.writerow(
            [
                task.title,
                task.description,
                task.status,
                task.priority,
                task.board_column_name or "",
                task.is_done,
                task.is_archived,
                task.deadline_at.isoformat() if task.deadline_at else "",
                task.planned_return_at.isoformat() if task.planned_return_at else "",
                task.done_at.isoformat() if task.done_at else "",
                task.assignee_email or "",
                task.assignee_org or "",
                ",".join(task.tags),
            ]
        )

    output = io.BytesIO(buffer.getvalue().encode("utf-8"))
    filename = f"kanban_tasks_{datetime.utcnow().strftime('%Y%m%d_%H%M%S')}.csv"
    headers = {"Content-Disposition": f'attachment; filename="{filename}"'}
    return StreamingResponse(output, media_type="text/csv; charset=utf-8", headers=headers)


@router.get("/archive")
def export_archive(db: Session = Depends(get_db)):
    payload = _build_backup_payload(db)
    archive_buffer = io.BytesIO()
    timestamp = datetime.utcnow().strftime("%Y%m%d_%H%M%S")

    tasks_csv_buffer = io.StringIO()
    writer = csv.writer(tasks_csv_buffer)
    writer.writerow(["title", "description", "status", "priority", "board_column_name", "tags"])
    for task in payload.tasks:
        writer.writerow([task.title, task.description, task.status, task.priority, task.board_column_name or "", ",".join(task.tags)])

    with zipfile.ZipFile(archive_buffer, mode="w", compression=zipfile.ZIP_DEFLATED) as archive:
        archive.writestr("backup.json", json.dumps(payload.model_dump(mode="json"), ensure_ascii=False, indent=2))
        archive.writestr("tasks.csv", tasks_csv_buffer.getvalue())
        archive.writestr("metadata.json", json.dumps(payload.metadata.model_dump(mode="json"), ensure_ascii=False, indent=2))

    archive_buffer.seek(0)
    headers = {"Content-Disposition": f'attachment; filename="kanban_backup_{timestamp}.zip"'}
    return StreamingResponse(archive_buffer, media_type="application/zip", headers=headers)


@router.post("/import", response_model=BackupImportResponse)
def import_backup(payload: BackupImportRequest, db: Session = Depends(get_db)):
    backup = payload.backup
    mode = payload.mode

    known_columns = {item.name for item in db.scalars(select(BoardColumn)).all()}
    known_tags = {item.name for item in db.scalars(select(Tag)).all()}

    payload_column_names = {column.name for column in backup.columns}
    payload_tag_names = {tag.name for tag in backup.tags}

    for task in backup.tasks:
        if task.board_column_name and task.board_column_name not in payload_column_names and task.board_column_name not in known_columns:
            raise HTTPException(status_code=400, detail=f"Unknown board column for task '{task.title}': {task.board_column_name}")
        missing_tags = [tag for tag in task.tags if tag not in payload_tag_names and tag not in known_tags]
        if missing_tags:
            raise HTTPException(status_code=400, detail=f"Unknown tags for task '{task.title}': {', '.join(missing_tags)}")

    columns_to_create = [column for column in backup.columns if column.name not in known_columns]
    tags_to_create = [tag for tag in backup.tags if tag.name not in known_tags]

    if payload.dry_run:
        return BackupImportResponse(
            dry_run=True,
            mode=mode,
            tasks_to_import=len(backup.tasks),
            tags_to_create=len(tags_to_create),
            columns_to_create=len(columns_to_create),
        )

    if mode == "replace_all":
        db.execute(delete(TaskTag))
        db.execute(delete(Task))
        db.execute(delete(Tag))
        db.execute(delete(BoardColumn))
        db.flush()
        columns_to_create = backup.columns
        tags_to_create = backup.tags

    for column in columns_to_create:
        db.add(
            BoardColumn(
                name=column.name,
                canonical_status=column.canonical_status,
                position=column.position,
                color=column.color,
                wip_limit=column.wip_limit,
                sla_hours=column.sla_hours,
                is_system=column.is_system,
            )
        )
    db.flush()

    for tag in tags_to_create:
        db.add(Tag(name=tag.name, color=tag.color))
    db.flush()

    columns_map = {item.name: item.id for item in db.scalars(select(BoardColumn)).all()}
    tags_map = {item.name: item.id for item in db.scalars(select(Tag)).all()}

    created_tasks = 0
    for task in backup.tasks:
        task_model = Task(
            title=task.title,
            description=task.description,
            status=task.status,
            priority=task.priority,
            deadline_at=task.deadline_at,
            planned_return_at=task.planned_return_at,
            position=task.position,
            board_column_id=columns_map.get(task.board_column_name) if task.board_column_name else None,
            project_id=task.project_id,
            color_mark=task.color_mark,
            estimate_minutes=task.estimate_minutes,
            spent_minutes=task.spent_minutes,
            assignee_last_name=task.assignee_last_name,
            assignee_first_name=task.assignee_first_name,
            assignee_middle_name=task.assignee_middle_name,
            assignee_phone=task.assignee_phone,
            assignee_email=task.assignee_email,
            assignee_org=task.assignee_org,
            emoji=task.emoji,
            is_done=task.is_done,
            is_archived=task.is_archived,
            done_at=task.done_at,
            row_version=1,
            created_at=datetime.utcnow(),
            updated_at=datetime.utcnow(),
        )
        db.add(task_model)
        db.flush()
        for tag_name in task.tags:
            tag_id = tags_map.get(tag_name)
            if tag_id:
                db.add(TaskTag(task_id=task_model.id, tag_id=tag_id))
        created_tasks += 1

    db.commit()
    return BackupImportResponse(
        dry_run=False,
        mode=mode,
        tasks_to_import=len(backup.tasks),
        tags_to_create=len(tags_to_create),
        columns_to_create=len(columns_to_create),
        created_tasks=created_tasks,
        created_tags=len(tags_to_create),
        created_columns=len(columns_to_create),
    )
