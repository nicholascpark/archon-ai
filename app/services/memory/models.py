"""
Pydantic models for Archon AI memory system.

Defines:
- UserProfile: Complete user identity and birth data
- Memory: Long-term semantic/episodic memories
- ConversationSummary: Compressed conversation history
"""
from datetime import datetime, date, time
from typing import Optional, List, Dict, Any
from pydantic import BaseModel, Field
from enum import Enum


class Gender(str, Enum):
    """Gender options for pronoun preferences."""
    MALE = "male"
    FEMALE = "female"
    NON_BINARY = "non_binary"
    OTHER = "other"
    PREFER_NOT_TO_SAY = "prefer_not_to_say"


class MemoryType(str, Enum):
    """Types of long-term memories."""
    SEMANTIC = "semantic"      # Facts about the user
    EPISODIC = "episodic"      # Past interaction memories
    PROCEDURAL = "procedural"  # Learned preferences/behaviors


class Location(BaseModel):
    """Geographic location with coordinates."""
    city: str
    latitude: float
    longitude: float
    timezone: str


class BirthData(BaseModel):
    """User's birth information for natal chart."""
    date: date
    time: Optional[time] = None  # Some users don't know exact time
    location: Location
    time_unknown: bool = False


class UserProfile(BaseModel):
    """
    Complete user profile for Archon AI.

    Includes identity, birth data, current location, and cached natal chart.
    """
    # Identity
    id: str
    name: Optional[str] = None
    email: Optional[str] = None
    gender: Optional[Gender] = None

    # Birth Data
    birth_data: Optional[BirthData] = None

    # Current Location (for transit calculations)
    current_location: Optional[Location] = None

    # Cached Natal Chart (computed once from birth_data)
    natal_chart: Optional[Dict[str, Any]] = None
    chart_computed_at: Optional[datetime] = None

    # Onboarding state
    onboarding_complete: bool = False

    # Metadata
    created_at: datetime = Field(default_factory=datetime.utcnow)
    updated_at: datetime = Field(default_factory=datetime.utcnow)

    def get_pronoun(self) -> str:
        """Get appropriate pronoun based on gender."""
        if self.gender == Gender.MALE:
            return "he/him"
        elif self.gender == Gender.FEMALE:
            return "she/her"
        elif self.gender == Gender.NON_BINARY:
            return "they/them"
        else:
            return "they/them"  # Default to neutral

    def get_display_name(self) -> str:
        """Get name or fallback to 'friend'."""
        return self.name or "friend"

    def has_complete_birth_data(self) -> bool:
        """Check if we have enough data for natal chart."""
        return (
            self.birth_data is not None and
            self.birth_data.date is not None and
            self.birth_data.location is not None
        )

    def needs_birth_time(self) -> bool:
        """Check if birth time is still needed for accuracy."""
        return (
            self.birth_data is not None and
            self.birth_data.time is None and
            not self.birth_data.time_unknown
        )


class Memory(BaseModel):
    """
    Long-term memory entry.

    Stores semantic facts, episodic experiences, or procedural knowledge
    about the user for personalized interactions.
    """
    id: str
    user_id: str

    # Memory content
    type: MemoryType
    content: str

    # Metadata for filtering/context
    metadata: Dict[str, Any] = Field(default_factory=dict)

    # Source tracking
    source_conversation_id: Optional[str] = None
    extracted_at: datetime = Field(default_factory=datetime.utcnow)

    # Relevance tracking
    last_accessed: Optional[datetime] = None
    access_count: int = 0

    class Config:
        use_enum_values = True


class ConversationSummary(BaseModel):
    """
    Compressed conversation history.

    Instead of storing every message, we store summaries with
    extracted key topics and insights.
    """
    id: str
    user_id: str

    # Summary content
    summary: str
    key_topics: List[str] = Field(default_factory=list)
    insights_extracted: List[str] = Field(default_factory=list)

    # Conversation metadata
    message_count: int
    started_at: datetime
    ended_at: datetime

    # Extracted memories (IDs)
    memory_ids: List[str] = Field(default_factory=list)


class MemorySearchResult(BaseModel):
    """Result from memory search with relevance score."""
    memory: Memory
    relevance_score: float


class ProfileUpdateRequest(BaseModel):
    """Request to update user profile via natural language."""
    field: str  # name, gender, birth_date, birth_time, birth_city, current_city
    value: Any
    extracted_from: str  # Original user message


class OnboardingState(BaseModel):
    """
    Tracks onboarding progress for new users.

    Required fields for basic chart:
    - name (for personalization)
    - gender (for pronouns)
    - birth_date (required for chart)
    - birth_location (required for chart)

    Optional but recommended:
    - birth_time (improves accuracy significantly)
    - current_location (for transit calculations)
    """
    user_id: str
    has_name: bool = False
    has_gender: bool = False
    has_birth_date: bool = False
    has_birth_time: bool = False
    has_birth_location: bool = False
    has_current_location: bool = False

    @property
    def is_complete(self) -> bool:
        """Check if minimum onboarding is complete for chart calculation."""
        return (
            self.has_name and
            self.has_gender and
            self.has_birth_date and
            self.has_birth_location
        )

    @property
    def is_enhanced(self) -> bool:
        """Check if user has provided optional enhancements."""
        return self.is_complete and self.has_birth_time

    @property
    def completion_percentage(self) -> int:
        """Get percentage of profile completion."""
        required = [self.has_name, self.has_gender, self.has_birth_date, self.has_birth_location]
        optional = [self.has_birth_time, self.has_current_location]

        required_pct = sum(required) / len(required) * 80  # 80% weight
        optional_pct = sum(optional) / len(optional) * 20  # 20% weight

        return int(required_pct + optional_pct)

    @property
    def next_question(self) -> Optional[str]:
        """Get the next onboarding question to ask."""
        if not self.has_name:
            return "name"
        if not self.has_gender:
            return "gender"
        if not self.has_birth_date:
            return "birth_date"
        if not self.has_birth_location:
            return "birth_location"
        if not self.has_birth_time:
            return "birth_time"  # Optional but recommended
        if not self.has_current_location:
            return "current_location"  # Optional
        return None

    @property
    def missing_required(self) -> List[str]:
        """Get list of missing required fields."""
        missing = []
        if not self.has_name:
            missing.append("name")
        if not self.has_gender:
            missing.append("gender")
        if not self.has_birth_date:
            missing.append("birth_date")
        if not self.has_birth_location:
            missing.append("birth_location")
        return missing

    def get_friendly_prompt(self) -> Optional[str]:
        """Get a friendly prompt for the next missing field."""
        prompts = {
            "name": "What's your name?",
            "gender": "What pronouns do you prefer? (he/him, she/her, they/them)",
            "birth_date": "When were you born? (date and time if you know it)",
            "birth_location": "Where were you born? (city is fine)",
            "birth_time": "Do you know what time you were born? This helps with accuracy, but it's okay if you don't know.",
            "current_location": "Where are you located now? This helps with daily transit readings."
        }
        next_q = self.next_question
        return prompts.get(next_q) if next_q else None
