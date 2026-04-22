from fastapi.testclient import TestClient

from app.main import app


client = TestClient(app)


def test_health_endpoint() -> None:
    response = client.get("/health")
    assert response.status_code == 200
    assert response.json() == {"status": "ok"}


def test_tasks_endpoint_accepts_pagination_params() -> None:
    response = client.get("/tasks", params={"archived": "false", "limit": 10, "offset": 0})
    assert response.status_code == 200
    assert isinstance(response.json(), list)
