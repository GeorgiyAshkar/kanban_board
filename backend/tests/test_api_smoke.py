from fastapi.testclient import TestClient


def test_health_endpoint(client: TestClient) -> None:
    response = client.get('/health')
    assert response.status_code == 200
    assert response.json() == {'status': 'ok'}


def test_ready_endpoint(client: TestClient) -> None:
    response = client.get('/ready')
    assert response.status_code == 200
    payload = response.json()
    assert payload['status'] == 'ready'
    assert payload['checks']['database'] == 'ok'
    assert isinstance(payload['checks']['db_ping_ms'], float | int)


def test_metrics_endpoint(client: TestClient) -> None:
    response = client.get('/metrics')
    assert response.status_code == 200
    assert response.headers['content-type'].startswith('text/plain')
    body = response.text
    assert 'http_requests_total' in body
    assert 'http_request_duration_seconds_bucket' in body


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
