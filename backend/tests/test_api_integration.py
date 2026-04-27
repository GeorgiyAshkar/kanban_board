from datetime import datetime, timedelta

from fastapi.testclient import TestClient
from app.db.database import SessionLocal
from app.services.reminder_notifications import apply_deadline_automation, dispatch_queued_notifications, enqueue_due_reminders


def test_task_lifecycle_logs_history(client: TestClient) -> None:
    columns = client.get('/columns')
    assert columns.status_code == 200
    payload = columns.json()
    assert len(payload) >= 2

    source_column = payload[0]
    target_column = payload[1]
    source_column_id = source_column['id']
    target_column_id = target_column['id']

    created = client.post(
        '/tasks',
        json={
            'title': 'Интеграционный сценарий',
            'description': 'Проверка критического потока',
            'board_column_id': source_column_id,
            'status': 'inbox',
            'priority': 'normal',
        },
    )
    assert created.status_code == 201
    task_id = created.json()['id']

    moved = client.post(
        f'/tasks/{task_id}/move',
        json={'board_column_id': target_column_id, 'position': 1},
    )
    assert moved.status_code == 200
    assert moved.json()['board_column_id'] == target_column_id
    assert moved.json()['status'] == target_column['canonical_status']

    archived = client.post(f'/tasks/{task_id}/archive')
    assert archived.status_code == 200
    assert archived.json()['is_archived'] is True

    restored = client.post(f'/tasks/{task_id}/restore')
    assert restored.status_code == 200
    assert restored.json()['is_archived'] is False

    completed = client.post(f'/tasks/{task_id}/complete')
    assert completed.status_code == 200
    assert completed.json()['is_done'] is True

    history = client.get(f'/tasks/{task_id}/history')
    assert history.status_code == 200
    action_types = {entry['action_type'] for entry in history.json()}
    assert {'task_created', 'column_changed', 'status_changed', 'task_archived', 'task_restored', 'task_completed'} <= action_types


def test_checklist_comments_tags_metadata_flow(client: TestClient) -> None:
    columns = client.get('/columns').json()

    task = client.post(
        '/tasks',
        json={
            'title': 'Задача с сущностями',
            'description': '',
            'board_column_id': columns[0]['id'],
            'status': 'inbox',
            'priority': 'high',
        },
    )
    assert task.status_code == 201
    task_id = task.json()['id']

    comment = client.post(f'/tasks/{task_id}/comments', json={'text': 'Первый комментарий', 'author': 'tester'})
    assert comment.status_code == 201
    comments = client.get(f'/tasks/{task_id}/comments')
    assert comments.status_code == 200
    assert comments.json()[0]['text'] == 'Первый комментарий'

    checklist_item = client.post(f'/tasks/{task_id}/checklist', json={'title': 'Проверить smoke', 'position': 0})
    assert checklist_item.status_code == 201
    item_id = checklist_item.json()['id']

    checked = client.patch(f'/checklist/{item_id}', json={'is_done': True})
    assert checked.status_code == 200
    assert checked.json()['is_done'] is True

    tag = client.post('/tags', json={'name': 'critical-flow', 'color': '#ff0000'})
    assert tag.status_code == 201
    tag_id = tag.json()['id']

    bind_tag = client.post(f'/tasks/{task_id}/tags', json={'tag_id': tag_id})
    assert bind_tag.status_code == 201

    metadata = client.get('/tasks/board-metadata', params=[('task_ids', task_id)])
    assert metadata.status_code == 200
    data = metadata.json()
    assert len(data) == 1
    assert data[0]['task_id'] == task_id
    assert len(data[0]['tags']) == 1
    assert len(data[0]['checklist']) == 1

    search = client.get('/tasks', params={'q': 'critical-flow', 'archived': 'false'})
    assert search.status_code == 200
    assert any(found['id'] == task_id for found in search.json())


def test_board_and_task_details_aggregates_and_notification_delivery(client: TestClient) -> None:
    created = client.post('/tasks', json={'title': 'Reminder task', 'description': 'body', 'priority': 'normal'})
    assert created.status_code == 201
    task_id = created.json()['id']

    reminder = client.post(
        f'/tasks/{task_id}/reminders',
        json={'remind_at': '2020-01-01T00:00:00Z', 'message': 'Пора проверить задачу'},
    )
    assert reminder.status_code == 201
    reminder_id = reminder.json()['id']

    board = client.get('/tasks/board', params={'archived': 'false'})
    assert board.status_code == 200
    board_payload = board.json()
    assert board_payload['total'] >= 1
    assert any(item['id'] == task_id for item in board_payload['tasks'])

    details = client.get(f'/tasks/{task_id}/details')
    assert details.status_code == 200
    assert 'reminders' in details.json()
    assert any(item['id'] == reminder_id for item in details.json()['reminders'])

    db = SessionLocal()
    try:
        enqueue_due_reminders(db)
        dispatch_queued_notifications(db)
        db.commit()
    finally:
        db.close()

    events = client.get('/notifications/events', params={'after_id': 0, 'limit': 10})
    assert events.status_code == 200
    payload = events.json()
    assert any(event['reminder_id'] == reminder_id for event in payload)
    event = next(event for event in payload if event['reminder_id'] == reminder_id)

    ack = client.post(f"/notifications/events/{event['id']}/ack")
    assert ack.status_code == 200
    assert ack.json()['status'] == 'acknowledged'


def test_board_filters_by_tags_dates_assignee_column_and_completion(client: TestClient) -> None:
    columns = client.get('/columns').json()
    target_column = columns[0]

    target = client.post(
        '/tasks',
        json={
            'title': 'Target task',
            'description': 'with extra filters',
            'board_column_id': target_column['id'],
            'status': target_column['canonical_status'],
            'priority': 'normal',
            'assignee_first_name': 'Alice',
            'assignee_last_name': 'Cooper',
            'assignee_email': 'alice@example.com',
            'deadline_at': '2030-01-15T10:00:00Z',
        },
    )
    assert target.status_code == 201
    target_id = target.json()['id']

    other = client.post(
        '/tasks',
        json={
            'title': 'Other task',
            'description': '',
            'board_column_id': target_column['id'],
            'status': target_column['canonical_status'],
            'priority': 'normal',
            'assignee_first_name': 'Bob',
            'deadline_at': '2030-03-01T10:00:00Z',
        },
    )
    assert other.status_code == 201

    tag_urgent = client.post('/tags', json={'name': f'urgent-{target_id}', 'color': '#ff0000'})
    assert tag_urgent.status_code == 201
    tag_team = client.post('/tags', json={'name': f'team-{target_id}', 'color': '#00ff00'})
    assert tag_team.status_code == 201
    urgent_id = tag_urgent.json()['id']
    team_id = tag_team.json()['id']

    assert client.post(f'/tasks/{target_id}/tags', json={'tag_id': urgent_id}).status_code == 201
    assert client.post(f'/tasks/{target_id}/tags', json={'tag_id': team_id}).status_code == 201
    assert client.post(f'/tasks/{target_id}/complete').status_code == 200

    board = client.get(
        '/tasks/board',
        params=[
            ('archived', 'false'),
            ('is_done', 'true'),
            ('assignee', 'alice'),
            ('date_field', 'deadline_at'),
            ('date_from', '2030-01-01'),
            ('date_to', '2030-01-31'),
            ('board_column_ids', target_column['id']),
            ('tag_ids', urgent_id),
            ('tag_ids', team_id),
        ],
    )
    assert board.status_code == 200
    payload = board.json()
    assert payload['total'] >= 1
    assert any(item['id'] == target_id for item in payload['tasks'])


def test_analytics_report_contains_summary_and_trends(client: TestClient) -> None:
    created = client.post('/tasks', json={'title': 'Analytics seed', 'description': '', 'priority': 'normal'})
    assert created.status_code == 201
    task_id = created.json()['id']
    completed = client.post(f'/tasks/{task_id}/complete')
    assert completed.status_code == 200

    response = client.get('/analytics/report', params={'days': 30, 'bucket': 'week'})
    assert response.status_code == 200
    payload = response.json()
    assert 'summary' in payload
    assert 'trend' in payload
    assert payload['summary']['completed_tasks'] >= 1
    assert 'aging_wip' in payload['summary']
    assert 'throughput_variability' in payload['summary']
    assert isinstance(payload['trend'], list)
    if payload['trend']:
        point = payload['trend'][0]
        assert 'burnup_completed_cumulative' in point
        assert 'burnup_scope_cumulative' in point
        assert 'burndown_remaining' in point


def test_patch_task_uses_optimistic_lock_row_version(client: TestClient) -> None:
    created = client.post('/tasks', json={'title': 'Lock target', 'description': '', 'priority': 'normal'})
    assert created.status_code == 201
    task = created.json()
    task_id = task['id']
    assert task['row_version'] == 1

    first_patch = client.patch(
        f'/tasks/{task_id}',
        json={'row_version': 1, 'title': 'Updated once'},
    )
    assert first_patch.status_code == 200
    assert first_patch.json()['row_version'] == 2

    stale_patch = client.patch(
        f'/tasks/{task_id}',
        json={'row_version': 1, 'description': 'stale write'},
    )
    assert stale_patch.status_code == 409
    detail = stale_patch.json()['detail']
    assert detail['current_row_version'] == 2


def test_patch_task_requires_row_version_precondition(client: TestClient) -> None:
    created = client.post('/tasks', json={'title': 'Precondition target', 'description': '', 'priority': 'normal'})
    assert created.status_code == 201
    task_id = created.json()['id']

    response = client.patch(
        f'/tasks/{task_id}',
        json={'title': 'without row version'},
    )
    assert response.status_code == 428
    assert 'row_version is required' in response.json()['detail']


def test_patch_task_with_same_values_keeps_row_version(client: TestClient) -> None:
    created = client.post('/tasks', json={'title': 'No-op patch target', 'description': '', 'priority': 'normal'})
    assert created.status_code == 201
    task = created.json()
    task_id = task['id']
    row_version = task['row_version']

    noop_patch = client.patch(
        f'/tasks/{task_id}',
        json={'row_version': row_version, 'title': task['title']},
    )
    assert noop_patch.status_code == 200
    assert noop_patch.json()['row_version'] == row_version


def test_columns_support_wip_limit_and_sla_hours_settings(client: TestClient) -> None:
    created = client.post(
        '/columns',
        json={
            'name': 'Flow control',
            'canonical_status': 'in_progress',
            'position': 99,
            'wip_limit': 3,
            'sla_hours': 24,
            'is_system': False,
        },
    )
    assert created.status_code == 201
    column = created.json()
    column_id = column['id']
    assert column['wip_limit'] == 3
    assert column['sla_hours'] == 24

    updated = client.patch(
        f'/columns/{column_id}',
        json={'wip_limit': 5, 'sla_hours': 48},
    )
    assert updated.status_code == 200
    payload = updated.json()
    assert payload['wip_limit'] == 5
    assert payload['sla_hours'] == 48

    cleared = client.patch(
        f'/columns/{column_id}',
        json={'wip_limit': None, 'sla_hours': None},
    )
    assert cleared.status_code == 200
    payload = cleared.json()
    assert payload['wip_limit'] is None
    assert payload['sla_hours'] is None


def test_deadline_automation_escalates_priority_and_creates_reminder(client: TestClient) -> None:
    now = datetime.utcnow()
    created = client.post(
        '/tasks',
        json={
            'title': 'Automation target',
            'description': 'check automation',
            'priority': 'normal',
            'status': 'todo',
            'deadline_at': (now + timedelta(hours=3)).isoformat() + 'Z',
        },
    )
    assert created.status_code == 201
    task_id = created.json()['id']

    db = SessionLocal()
    try:
        affected = apply_deadline_automation(db, now=now)
        db.commit()
    finally:
        db.close()

    assert affected >= 2
    refreshed = client.get('/tasks', params={'archived': 'false', 'limit': 200})
    assert refreshed.status_code == 200
    task = next(item for item in refreshed.json() if item['id'] == task_id)
    assert task['priority'] == 'high'

    reminders = client.get(f'/tasks/{task_id}/reminders')
    assert reminders.status_code == 200
    assert any('[AUTO] Срочный дедлайн' in (item.get('message') or '') for item in reminders.json())
