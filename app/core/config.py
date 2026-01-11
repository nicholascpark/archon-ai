"""
Application configuration using Pydantic Settings.
Loads settings from environment variables with validation.
"""
from typing import List, Optional, Union
from pydantic import Field, field_validator
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    """Application settings loaded from environment variables"""

    # Application
    APP_NAME: str = "Archon AI"
    ENVIRONMENT: str = "development"
    DEBUG: bool = False
    SECRET_KEY: str = Field(..., min_length=32)

    # API Server
    HOST: str = "0.0.0.0"
    PORT: int = 8000
    CORS_ORIGINS: Union[str, List[str]] = "http://localhost:5173,http://localhost:3000"

    # LLM Provider Selection
    LLM_PROVIDER: str = "openai"  # openai, gemini, or groq
    LLM_TEMPERATURE: float = 0.7
    LLM_MAX_TOKENS: int = 1024

    # OpenAI (Primary - best tool calling)
    OPENAI_API_KEY: str = Field(..., description="OpenAI API key")
    OPENAI_MODEL: str = "gpt-4.1-nano"  # or gpt-4o-mini

    # Google Gemini (Fallback - free tier)
    GOOGLE_API_KEY: Optional[str] = None
    GEMINI_MODEL: str = "gemini-2.0-flash"

    # Groq (Alternative - fast & cheap)
    GROQ_API_KEY: Optional[str] = None
    GROQ_MODEL: str = "llama-3.3-70b-versatile"
    EMBEDDING_MODEL: str = "text-embedding-3-small"
    EMBEDDING_DIMENSIONS: int = 1536

    # Chroma Vector DB
    CHROMA_PERSIST_DIRECTORY: str = "./data/chroma"
    CHROMA_COLLECTION_PREFIX: str = "user_"
    CHROMA_DISTANCE_METRIC: str = "cosine"

    # Astrology (Kerykeion - no API key needed!)
    HOUSE_SYSTEM: str = "placidus"
    ASTROLOGY_SYSTEM: str = "western"

    # JWT Authentication
    JWT_SECRET_KEY: str = Field(..., min_length=32)
    JWT_ALGORITHM: str = "HS256"
    JWT_EXPIRATION_HOURS: int = 24
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 1440  # 24 hours

    # Database
    DATABASE_URL: str = "sqlite:///./data/conversations.db"

    # Performance & Cost Control
    MAX_RETRIES: int = 3
    REQUEST_TIMEOUT: int = 30
    MAX_TOKENS_PER_REQUEST: int = 1024
    MAX_CONTEXT_MESSAGES: int = 10

    # RAG Settings
    RAG_TOP_K: int = 3
    RAG_MIN_SIMILARITY: float = 0.7

    # Cost Limits
    MAX_COST_PER_USER_DAILY: float = 0.50
    WARN_COST_THRESHOLD: float = 0.30

    # Logging
    LOG_LEVEL: str = "INFO"
    LOG_FILE: str = "./data/logs/app.log"
    ENABLE_COST_TRACKING: bool = True

    # Geocoding
    GOOGLE_GEOCODING_API_KEY: Optional[str] = None

    # OAuth Settings
    GOOGLE_CLIENT_ID: Optional[str] = None
    GOOGLE_CLIENT_SECRET: Optional[str] = None
    META_CLIENT_ID: Optional[str] = None
    META_CLIENT_SECRET: Optional[str] = None

    # URLs for OAuth redirects
    API_URL: str = "http://localhost:8000"
    FRONTEND_URL: str = "http://localhost:3000"

    # Observability (Optional)
    LANGSMITH_API_KEY: Optional[str] = None
    LANGSMITH_PROJECT: str = "archon-ai"
    ENABLE_TRACING: bool = False

    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        case_sensitive=True,
        extra="ignore"
    )

    @field_validator("CORS_ORIGINS", mode="before")
    @classmethod
    def parse_cors_origins(cls, v) -> List[str]:
        """Parse comma-separated CORS origins into a list"""
        if isinstance(v, str):
            return [origin.strip() for origin in v.split(",")]
        return v

    @property
    def is_development(self) -> bool:
        """Check if running in development mode"""
        return self.ENVIRONMENT.lower() in ["development", "dev"]

    @property
    def is_production(self) -> bool:
        """Check if running in production mode"""
        return self.ENVIRONMENT.lower() in ["production", "prod"]

    @property
    def database_path(self) -> str:
        """Get the filesystem path for SQLite database"""
        if self.DATABASE_URL.startswith("sqlite:///"):
            return self.DATABASE_URL.replace("sqlite:///", "")
        return "./data/conversations.db"


# Global settings instance
settings = Settings()
