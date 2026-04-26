from __future__ import annotations

import os
from pathlib import Path

from alembic import command
from alembic.config import Config


def run_migrations() -> None:
    base_dir = Path(__file__).resolve().parents[2]
    config = Config(str(base_dir / "alembic.ini"))
    config.set_main_option("script_location", str(base_dir / "alembic"))
    config.set_main_option("sqlalchemy.url", os.getenv("DATABASE_URL", "sqlite:///./kanban.db"))
    command.upgrade(config, "head")
