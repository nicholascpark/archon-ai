"""
FastAPI application entry point.
"""
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from app.core.config import settings
from app.core.logging_config import logger

# Create FastAPI app
app = FastAPI(
    title=settings.APP_NAME,
    description="Personal AI Astrology Partner - Your birth chart, always remembered",
    version="0.1.0",
    debug=settings.DEBUG
)

# Configure CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.CORS_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.on_event("startup")
async def startup_event():
    """Run on application startup"""
    logger.info(f"Starting {settings.APP_NAME}")
    logger.info(f"Environment: {settings.ENVIRONMENT}")


@app.on_event("shutdown")
async def shutdown_event():
    """Run on application shutdown"""
    logger.info("Shutting down application")


@app.get("/")
async def root():
    """Root endpoint"""
    return {
        "app": settings.APP_NAME,
        "version": "0.1.0",
        "status": "running",
        "message": "Welcome to your personal AI astrology partner!"
    }


@app.get("/api/health")
async def health_check():
    """Health check endpoint"""
    return {
        "status": "healthy",
        "environment": settings.ENVIRONMENT
    }


# Import routers (will be added in next phase)
# from app.api.routes import auth, user, websocket
# app.include_router(auth.router, prefix="/auth", tags=["auth"])
# app.include_router(user.router, prefix="/api/user", tags=["user"])
# app.include_router(websocket.router, prefix="/ws", tags=["websocket"])
