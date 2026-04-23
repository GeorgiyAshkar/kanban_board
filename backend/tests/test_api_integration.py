from fastapi.testclient import TestClient


def test_task_lifecycle_logs_history(client: TestClient) -> None:
    columns = client.get('/columns')
    assert columns.status_code == 200
    payload = columns.json()
    assert len(payload) >= 2

    source_column_id = payload[0]['id']
    target_column_id = payload[1]['id']

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
        json={'board_column_id': target_column_id, 'status': 'in_progress', 'position': 1},
    )
    assert moved.status_code == 200
    assert moved.json()['board_column_id'] == target_column_id
    assert moved.json()['status'] == 'in_progress'

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
