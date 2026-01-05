"""
Database service for SQLite operations.

Handles database connection, session management, and schema initialization.
"""
from contextlib import contextmanager
from typing import Generator
from sqlalchemy import create_engine, event
from sqlalchemy.orm import sessionmaker, Session
from sqlalchemy.pool import StaticPool
from app.core.config import settings
from app.core.logging_config import logger
import os


# Create database directory if it doesn't exist
db_path = settings.database_path
os.makedirs(os.path.dirname(db_path), exist_ok=True)

# Create SQLAlchemy engine
engine = create_engine(
    settings.DATABASE_URL,
    connect_args={"check_same_thread": False},  # Needed for SQLite
    poolclass=StaticPool,  # Use static pool for SQLite
    echo=settings.DEBUG  # Log SQL queries in debug mode
)

# Enable foreign keys for SQLite
@event.listens_for(engine, "connect")
def set_sqlite_pragma(dbapi_conn, connection_record):
    """Enable foreign key constraints in SQLite"""
    cursor = dbapi_conn.cursor()
    cursor.execute("PRAGMA foreign_keys=ON")
    cursor.close()


# Create session factory
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)


def get_db() -> Generator[Session, None, None]:
    """
    Dependency for FastAPI to get database session.

    Usage in FastAPI:
        @app.get("/users")
        def get_users(db: Session = Depends(get_db)):
            return db.query(User).all()
    """
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()


@contextmanager
def get_db_context():
    """
    Context manager for database session (for use outside FastAPI).

    Usage:
        with get_db_context() as db:
            user = db.query(User).first()
    """
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()


def init_db():
    """
    Initialize database schema.
    Creates all tables defined in models.
    """
    from app.models.user import Base
    from app.models.chart import Base as ChartBase
    from app.models.conversation import Base as ConversationBase

    logger.info("Initializing database schema...")
    Base.metadata.create_all(bind=engine)

    # Create additional tables if needed
    try:
        ChartBase.metadata.create_all(bind=engine)
    except:
        pass  # Chart models might not exist yet

    try:
        ConversationBase.metadata.create_all(bind=engine)
    except:
        pass  # Conversation models might not exist yet

    logger.info("Database schema initialized successfully")


def drop_db():
    """Drop all database tables (USE WITH CAUTION!)"""
    from app.models.user import Base

    logger.warning("Dropping all database tables...")
    Base.metadata.drop_all(bind=engine)
    logger.warning("All tables dropped")


def reset_db():
    """Reset database by dropping and recreating all tables"""
    drop_db()
    init_db()
