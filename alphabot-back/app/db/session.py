"""SQLAlchemy session and engine configuration."""

from __future__ import annotations

from typing import Any, Dict

from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker

from app.core import settings


def _engine_kwargs(database_url: str) -> Dict[str, Any]:
    """Return engine configuration tuned for the selected backend."""

    kwargs: Dict[str, Any] = {"future": True, "echo": False, "pool_pre_ping": True}
    if database_url.startswith("sqlite"):
        # SQLite는 단일 스레드 접근만 허용하므로 FastAPI 개발 서버용 예외 처리.
        kwargs["connect_args"] = {"check_same_thread": False}
    return kwargs


engine = create_engine(settings.database_url, **_engine_kwargs(settings.database_url))
SessionLocal = sessionmaker(bind=engine, autocommit=False, autoflush=False, future=True)

 
def get_db():
    """FastAPI dependency that yields a database session."""

    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()
