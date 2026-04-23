from collections.abc import Generator

import pytest
from fastapi.testclient import TestClient
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker

from app.db.database import Base
from app.main import app


@pytest.fixture()
def client(tmp_path, monkeypatch) -> Generator[TestClient, None, None]:
    test_db_path = tmp_path / 'integration.db'
    engine = create_engine(f"sqlite:///{test_db_path}", connect_args={"check_same_thread": False})
    testing_session_local = sessionmaker(autocommit=False, autoflush=False, bind=engine)

    monkeypatch.setattr('app.db.database.engine', engine)
    monkeypatch.setattr('app.db.database.SessionLocal', testing_session_local)
    monkeypatch.setattr('app.main.SessionLocal', testing_session_local)
    monkeypatch.setattr('app.main.run_migrations', lambda: None)

    Base.metadata.create_all(bind=engine)

    with TestClient(app) as test_client:
        yield test_client

    Base.metadata.drop_all(bind=engine)
    engine.dispose()
