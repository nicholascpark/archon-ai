"""
Models for astrological chart data.
"""
from datetime import datetime
from typing import Optional, Dict, Any
from pydantic import BaseModel, Field
from sqlalchemy.ext.declarative import declarative_base


Base = declarative_base()


# Pydantic models for chart data

class NatalChartData(BaseModel):
    """
    Schema for natal chart data from Kerykeion.

    This is the cached chart data stored in users.natal_chart_data (JSON).
    """
    # Birth data
    birth_date: str
    birth_time: Optional[str]
    birth_location: str
    latitude: float
    longitude: float
    timezone: str

    # Chart data (from Kerykeion)
    planets: Dict[str, Any]  # Planet positions
    houses: Dict[str, Any]  # House cusps
    aspects: list  # Planetary aspects

    # Computed timestamp
    computed_at: datetime = Field(default_factory=datetime.utcnow)


class TransitData(BaseModel):
    """Schema for transit data"""
    transit_date: str
    aspects: list  # Transit aspects to natal chart
    significant_transits: list  # Major transits affecting user


class SynastryData(BaseModel):
    """Schema for synastry (relationship compatibility) data"""
    partner_id: Optional[str] = None
    aspects: list  # Aspects between two charts
    compatibility_notes: Optional[str] = None
