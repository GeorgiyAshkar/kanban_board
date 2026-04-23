from fastapi.testclient import TestClient


def test_health_endpoint(client: TestClient) -> None:
    response = client.get('/health')
    assert response.status_code == 200
    assert response.json() == {'status': 'ok'}


def test_tasks_endpoint_accepts_pagination_params(client: TestClient) -> None:
    response = client.get('/tasks', params={'archived': 'false', 'limit': 10, 'offset': 0})
    assert response.status_code == 200
    assert isinstance(response.json(), list)
