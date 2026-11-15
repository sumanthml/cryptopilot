"""SQLAlchemy engine, session, Base, and resilient get_db dependency."""

from __future__ import annotations

import logging
from collections.abc import Generator

from sqlalchemy import create_engine, event, text
from sqlalchemy.orm import DeclarativeBase, Session, sessionmaker

from app.core.config import get_settings

logger = logging.getLogger("cryptopilot.database")


class Base(DeclarativeBase):
    """Declarative base for all CryptoPilot ORM models."""


def _init_engine():
    settings = get_settings()
    _db_url = settings.DATABASE_URL
    if _db_url and _db_url.startswith("postgresql://"):
        _db_url = _db_url.replace("postgresql://", "postgresql+psycopg2://", 1)

    # Attempt remote database connection if configured
    if _db_url and not _db_url.startswith("sqlite"):
        try:
            temp_engine = create_engine(
                _db_url,
                connect_args={"connect_timeout": 3},
                future=True,
                pool_pre_ping=True,
            )
            with temp_engine.connect() as conn:
                conn.execute(text("SELECT 1"))
            logger.info("Successfully connected to PostgreSQL database.")
            return temp_engine
        except Exception as exc:
            logger.warning(
                f"Configured PostgreSQL database is currently unreachable ({exc}). "
                "Engaging resilient zero-config SQLite local database (cryptopilot.db)."
            )

    # Resilient local fallback SQLite database
    sqlite_url = "sqlite:///./cryptopilot.db"
    sql_engine = create_engine(
        sqlite_url,
        connect_args={"check_same_thread": False},
        future=True,
    )

    @event.listens_for(sql_engine, "connect")
    def _set_sqlite_pragma(dbapi_connection, _connection_record):
        cursor = dbapi_connection.cursor()
        cursor.execute("PRAGMA foreign_keys=ON;")
        cursor.execute("PRAGMA journal_mode=WAL;")
        cursor.close()

    return sql_engine


engine = _init_engine()
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine, future=True)


def get_db() -> Generator[Session, None, None]:
    """FastAPI dependency yielding a scoped SQLAlchemy session."""
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()


def init_db() -> None:
    """Create all tables that do not yet exist and seed baseline enterprise demo data."""
    from app.db.models import models as _  # noqa: F401
    from app.db.seed import seed_default_data

    Base.metadata.create_all(bind=engine)
    with SessionLocal() as db:
        seed_default_data(db)
