"""
User model with birth data fields for astrology calculations.

This model stores permanent user profile data including birth information
that is asked only ONCE during onboarding and never requested again.
"""
from datetime import datetime
from typing import Optional
from pydantic import BaseModel, EmailStr, Field, validator
from sqlalchemy import Column, String, Float, DateTime, Boolean, Text
from app.models.base import Base
import uuid


class UserDB(Base):
    """
    SQLAlchemy model for users table.

    Stores permanent user data including birth information.
    Birth data is collected ONCE during onboarding.
    """
    __tablename__ = "users"

    id = Column(String, primary_key=True, default=lambda: str(uuid.uuid4()))
    email = Column(String, unique=True, nullable=False, index=True)
    username = Column(String, unique=True, nullable=False)
    hashed_password = Column(String, nullable=False)
    created_at = Column(DateTime, default=datetime.utcnow)

    # Subscription
    subscription_tier = Column(String, default="free")  # free, basic, premium
    is_active = Column(Boolean, default=True)

    # PERMANENT BIRTH DATA (asked only once!)
    birth_date = Column(String, nullable=False)  # ISO: 1990-05-15
    birth_time = Column(String, nullable=True)  # HH:MM:SS or null
    birth_location = Column(String, nullable=False)  # City, Country
    birth_latitude = Column(Float, nullable=True)
    birth_longitude = Column(Float, nullable=True)
    birth_timezone = Column(String, nullable=True)  # e.g., America/New_York

    # Current location (for transit timing)
    current_location = Column(String, nullable=True)
    current_latitude = Column(Float, nullable=True)
    current_longitude = Column(Float, nullable=True)
    location_updated_at = Column(DateTime, nullable=True)

    # Natal chart cache (JSON)
    natal_chart_data = Column(Text, nullable=True)  # Cached Kerykeion output
    natal_chart_computed_at = Column(DateTime, nullable=True)

    # Preferences
    astrology_system = Column(String, default="western")  # western, vedic
    house_system = Column(String, default="placidus")

    extra_data = Column(Text, nullable=True)  # JSON for additional data


# Pydantic models for API validation


class UserBase(BaseModel):
    """Base user schema with common fields"""
    email: EmailStr
    username: str = Field(..., min_length=3, max_length=50)


class UserCreate(UserBase):
    """
    Schema for user registration.

    Includes birth data that MUST be provided during signup.
    This is the only time we ask for birth information!
    """
    password: str = Field(..., min_length=8)

    # Required birth data for natal chart
    birth_date: str = Field(..., description="Birth date in ISO format (YYYY-MM-DD)")
    birth_time: Optional[str] = Field(None, description="Birth time in HH:MM:SS format")
    birth_location: str = Field(..., description="Birth location (City, Country)")

    # Optional advanced fields
    birth_latitude: Optional[float] = None
    birth_longitude: Optional[float] = None
    birth_timezone: Optional[str] = None

    @validator("birth_date")
    def validate_birth_date(cls, v):
        """Validate birth date format"""
        try:
            datetime.fromisoformat(v)
            return v
        except ValueError:
            raise ValueError("Birth date must be in ISO format (YYYY-MM-DD)")

    @validator("birth_time")
    def validate_birth_time(cls, v):
        """Validate birth time format if provided"""
        if v is None:
            return v
        try:
            # Validate time format HH:MM:SS
            time_parts = v.split(":")
            if len(time_parts) != 3:
                raise ValueError("Invalid time format")
            hours, minutes, seconds = map(int, time_parts)
            if not (0 <= hours < 24 and 0 <= minutes < 60 and 0 <= seconds < 60):
                raise ValueError("Invalid time values")
            return v
        except (ValueError, AttributeError):
            raise ValueError("Birth time must be in HH:MM:SS format")


class UserUpdate(BaseModel):
    """Schema for updating user profile"""
    username: Optional[str] = Field(None, min_length=3, max_length=50)
    birth_time: Optional[str] = None
    current_location: Optional[str] = None
    current_latitude: Optional[float] = None
    current_longitude: Optional[float] = None
    astrology_system: Optional[str] = Field(None, pattern="^(western|vedic)$")
    house_system: Optional[str] = None


class UserResponse(UserBase):
    """
    Schema for user data in API responses.

    Includes birth data that is always available in the user's profile.
    """
    id: str
    created_at: datetime
    subscription_tier: str
    is_active: bool

    # Birth data (always available after registration)
    birth_date: str
    birth_time: Optional[str]
    birth_location: str
    birth_latitude: Optional[float]
    birth_longitude: Optional[float]
    birth_timezone: Optional[str]

    # Current location
    current_location: Optional[str]
    current_latitude: Optional[float]
    current_longitude: Optional[float]
    location_updated_at: Optional[datetime]

    # Natal chart status
    natal_chart_computed_at: Optional[datetime]

    # Preferences
    astrology_system: str
    house_system: str

    class Config:
        from_attributes = True


class UserLogin(BaseModel):
    """Schema for user login"""
    email: EmailStr
    password: str


class Token(BaseModel):
    """Schema for JWT token response"""
    access_token: str
    token_type: str = "bearer"
    user: UserResponse


class TokenPayload(BaseModel):
    """Schema for JWT token payload"""
    sub: str  # user_id
    exp: datetime
    iat: datetime
