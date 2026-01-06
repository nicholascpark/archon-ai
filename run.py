#!/usr/bin/env python3
"""
Entry point for the Archon AI application.

Usage:
    python run.py              # Start the server
    python run.py --init-db    # Initialize database
    python run.py --reset-db   # Reset database (WARNING: deletes all data!)
"""
import argparse
import uvicorn
from app.core.config import settings
from app.core.logging_config import logger


def init_database():
    """Initialize the database schema"""
    from app.services.persistence.database import init_db

    logger.info("Initializing database...")
    init_db()
    logger.info("Database initialized successfully!")


def reset_database():
    """Reset database (drop and recreate all tables)"""
    from app.services.persistence.database import reset_db

    confirm = input("⚠️  This will DELETE ALL DATA. Are you sure? (yes/no): ")
    if confirm.lower() == "yes":
        logger.warning("Resetting database...")
        reset_db()
        logger.info("Database reset complete!")
    else:
        logger.info("Database reset cancelled")


def start_server():
    """Start the FastAPI server"""
    logger.info(f"Starting {settings.APP_NAME}")
    logger.info(f"Environment: {settings.ENVIRONMENT}")
    logger.info(f"Server: http://{settings.HOST}:{settings.PORT}")

    uvicorn.run(
        "app.api.main:app",
        host=settings.HOST,
        port=settings.PORT,
        reload=settings.DEBUG,
        log_level=settings.LOG_LEVEL.lower()
    )


def main():
    """Main entry point"""
    parser = argparse.ArgumentParser(description="Archon AI Application")
    parser.add_argument("--init-db", action="store_true", help="Initialize database")
    parser.add_argument("--reset-db", action="store_true", help="Reset database (deletes all data)")
    args = parser.parse_args()

    if args.init_db:
        init_database()
    elif args.reset_db:
        reset_database()
    else:
        start_server()


if __name__ == "__main__":
    main()
