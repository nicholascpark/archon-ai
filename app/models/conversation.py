"""
Models for conversations, sessions, and messages.
"""
from datetime import datetime
from typing import Optional, List
from pydantic import BaseModel, Field
from sqlalchemy import Column, String, Integer, Float, DateTime, Text, ForeignKey
from sqlalchemy.orm import relationship
from app.models.base import Base
import uuid


class SessionDB(Base):
    """SQLAlchemy model for conversation sessions"""
    __tablename__ = "sessions"

    id = Column(String, primary_key=True, default=lambda: str(uuid.uuid4()))
    user_id = Column(String, ForeignKey("users.id"), nullable=False, index=True)
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    message_count = Column(Integer, default=0)
    tokens_used = Column(Integer, default=0)
    cost_usd = Column(Float, default=0.0)
    extra_data = Column(Text, nullable=True)


class MessageDB(Base):
    """SQLAlchemy model for chat messages"""
    __tablename__ = "messages"

    id = Column(Integer, primary_key=True, autoincrement=True)
    session_id = Column(String, ForeignKey("sessions.id"), nullable=False, index=True)
    role = Column(String, nullable=False)  # 'user' or 'assistant'
    content = Column(Text, nullable=False)
    timestamp = Column(DateTime, default=datetime.utcnow)
    tokens = Column(Integer, default=0)
    extra_data = Column(Text, nullable=True)  # JSON: chart references, aspects, etc.


class RelationshipDB(Base):
    """SQLAlchemy model for saved relationships (for synastry)"""
    __tablename__ = "relationships"

    id = Column(String, primary_key=True, default=lambda: str(uuid.uuid4()))
    user_id = Column(String, ForeignKey("users.id"), nullable=False, index=True)
    partner_name = Column(String, nullable=True)
    partner_birth_date = Column(String, nullable=False)
    partner_birth_time = Column(String, nullable=True)
    partner_birth_location = Column(String, nullable=True)
    partner_latitude = Column(Float, nullable=True)
    partner_longitude = Column(Float, nullable=True)
    relationship_type = Column(String, nullable=True)  # romantic, friend, family, business
    created_at = Column(DateTime, default=datetime.utcnow)
    synastry_cache = Column(Text, nullable=True)  # Cached synastry analysis (JSON)


class CostLogDB(Base):
    """SQLAlchemy model for tracking API costs"""
    __tablename__ = "cost_logs"

    id = Column(Integer, primary_key=True, autoincrement=True)
    user_id = Column(String, ForeignKey("users.id"), nullable=False, index=True)
    session_id = Column(String, nullable=True)
    timestamp = Column(DateTime, default=datetime.utcnow, index=True)
    provider = Column(String, nullable=False)  # 'groq', 'openai', etc.
    model = Column(String, nullable=False)
    input_tokens = Column(Integer, default=0)
    output_tokens = Column(Integer, default=0)
    cost_usd = Column(Float, default=0.0)
    extra_data = Column(Text, nullable=True)


# Pydantic models

class MessageCreate(BaseModel):
    """Schema for creating a message"""
    session_id: str
    role: str = Field(..., pattern="^(user|assistant)$")
    content: str
    tokens: int = 0


class MessageResponse(BaseModel):
    """Schema for message in API responses"""
    id: int
    session_id: str
    role: str
    content: str
    timestamp: datetime
    tokens: int

    class Config:
        from_attributes = True


class SessionCreate(BaseModel):
    """Schema for creating a session"""
    user_id: str


class SessionResponse(BaseModel):
    """Schema for session in API responses"""
    id: str
    user_id: str
    created_at: datetime
    updated_at: datetime
    message_count: int
    tokens_used: int
    cost_usd: float

    class Config:
        from_attributes = True


class RelationshipCreate(BaseModel):
    """Schema for creating a relationship"""
    partner_name: Optional[str] = None
    partner_birth_date: str
    partner_birth_time: Optional[str] = None
    partner_birth_location: Optional[str] = None
    relationship_type: Optional[str] = None


class RelationshipResponse(BaseModel):
    """Schema for relationship in API responses"""
    id: str
    partner_name: Optional[str]
    partner_birth_date: str
    partner_birth_time: Optional[str]
    partner_birth_location: Optional[str]
    relationship_type: Optional[str]
    created_at: datetime

    class Config:
        from_attributes = True
