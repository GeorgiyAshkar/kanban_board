from __future__ import annotations

import os
from dataclasses import dataclass

from fastapi import Header, HTTPException, status


@dataclass(frozen=True)
class Actor:
    user_id: str
    role: str
    workspace_id: str


VALID_ROLES = {"viewer", "editor", "admin"}


def _auth_mode() -> str:
    return os.getenv("AUTH_MODE", "optional").strip().lower()


def get_current_actor(
    x_user_id: str | None = Header(default=None),
    x_user_role: str | None = Header(default=None),
    x_workspace_id: str | None = Header(default=None),
) -> Actor:
    mode = _auth_mode()

    if mode == "required" and not x_user_id:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Authentication required: set X-User-Id header",
        )

    user_id = x_user_id or "local_user"
    role = (x_user_role or "editor").strip().lower()
    workspace_id = (x_workspace_id or "personal").strip().lower()

    if role not in VALID_ROLES:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Invalid role")

    return Actor(user_id=user_id, role=role, workspace_id=workspace_id)


def ensure_can_write(actor: Actor) -> None:
    if actor.role == "viewer":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Read-only role cannot modify resources",
        )
