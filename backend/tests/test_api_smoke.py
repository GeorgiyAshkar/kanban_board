from fastapi.testclient import TestClient


def test_health_endpoint(client: TestClient) -> None:
    response = client.get('/health')
    assert response.status_code == 200
    assert response.json() == {'status': 'ok'}


def test_tasks_endpoint_accepts_pagination_params(client: TestClient) -> None:
    response = client.get('/tasks', params={'archived': 'false', 'limit': 10, 'offset': 0})
    assert response.status_code == 200
    assert isinstance(response.json(), list)


def test_tasks_endpoint_uses_default_pagination(client: TestClient) -> None:
    for idx in range(55):
        created = client.post('/tasks', json={'title': f'task-{idx}', 'description': '', 'priority': 'normal'})
        assert created.status_code == 201

    response = client.get('/tasks', params={'archived': 'false'})
    assert response.status_code == 200
    assert len(response.json()) == 50
