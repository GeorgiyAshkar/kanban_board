from __future__ import annotations

import base64
import hashlib
import hmac
import os
import secrets
from datetime import datetime, timedelta

from fastapi import Depends, Header, HTTPException, status
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.db.database import get_db
from app.models.models import User, UserRole, UserSession

SESSION_TTL_HOURS = int(os.getenv("SESSION_TTL_HOURS", "72"))
AUTH_REQUIRED = os.getenv("AUTH_REQUIRED", "false").lower() in {"1", "true", "yes"}
LOCAL_USER_EMAIL = os.getenv("LOCAL_USER_EMAIL", "local_user@kanban.local")
LOCAL_USER_PASSWORD = os.getenv("LOCAL_USER_PASSWORD", "local-dev-password")


def hash_password(password: str) -> str:
    salt = secrets.token_bytes(16)
    digest = hashlib.scrypt(password.encode("utf-8"), salt=salt, n=2**14, r=8, p=1, dklen=32)
    return "scrypt$" + base64.b64encode(salt).decode("utf-8") + "$" + base64.b64encode(digest).decode("utf-8")


def verify_password(password: str, password_hash: str) -> bool:
    try:
        algo, b64_salt, b64_digest = password_hash.split("$", 2)
        if algo != "scrypt":
            return False
        salt = base64.b64decode(b64_salt.encode("utf-8"))
        expected_digest = base64.b64decode(b64_digest.encode("utf-8"))
    except Exception:
        return False

    digest = hashlib.scrypt(password.encode("utf-8"), salt=salt, n=2**14, r=8, p=1, dklen=32)
    return hmac.compare_digest(digest, expected_digest)


def _hash_token(raw_token: str) -> str:
    return hashlib.sha256(raw_token.encode("utf-8")).hexdigest()


def create_session(db: Session, user: User) -> tuple[str, datetime]:
    raw_token = secrets.token_urlsafe(48)
    expires_at = datetime.utcnow() + timedelta(hours=SESSION_TTL_HOURS)
    session = UserSession(
        user_id=user.id,
        token_hash=_hash_token(raw_token),
        expires_at=expires_at,
    )
    db.add(session)
    db.commit()
    return raw_token, expires_at


def _extract_bearer_token(authorization: str | None) -> str | None:
    if not authorization:
        return None
    parts = authorization.strip().split(" ", 1)
    if len(parts) != 2 or parts[0].lower() != "bearer":
        return None
    return parts[1].strip() or None


def _ensure_local_user(db: Session) -> User:
    user = db.scalar(select(User).where(User.email == LOCAL_USER_EMAIL))
    if user:
        return user
    user = User(
        email=LOCAL_USER_EMAIL,
        password_hash=hash_password(LOCAL_USER_PASSWORD),
        role=UserRole.ADMIN,
        is_active=True,
    )
    db.add(user)
    db.commit()
    db.refresh(user)
    return user


def get_current_user(
    authorization: str | None = Header(default=None),
    db: Session = Depends(get_db),
) -> User:
    token = _extract_bearer_token(authorization)
    if token is None:
        if not AUTH_REQUIRED:
            return _ensure_local_user(db)
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Missing bearer token")

    token_hash = _hash_token(token)
    session = db.scalar(
        select(UserSession).where(
            UserSession.token_hash == token_hash,
            UserSession.revoked_at.is_(None),
            UserSession.expires_at > datetime.utcnow(),
        )
    )
    if not session:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid or expired session")

    user = db.get(User, session.user_id)
    if user is None or not user.is_active:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Inactive user")
    return user


def ensure_task_owner_or_admin(owner_id: int | None, user: User) -> None:
    if user.role == UserRole.ADMIN:
        return
    if owner_id is None or owner_id != user.id:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Access denied")


def ensure_admin(user: User) -> None:
    if user.role != UserRole.ADMIN:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Admin role required")
