"""
Agent tools for astrology calculations.

Simple, focused tools that the LLM can call:
1. get_current_transits - Get transit aspects for a date
2. analyze_synastry - Analyze relationship compatibility
3. search_chart_memory - Search user's chart data
"""
from typing import Optional, Dict, Any, Annotated
from datetime import datetime
from langchain_core.tools import tool
from app.services.astrology.kerykeion_service import kerykeion_service
from app.core.logging_config import logger


# Context that will be injected by the agent
# This contains user's natal chart and profile data
_user_context: Dict[str, Any] = {}


def set_user_context(user_id: str, natal_chart_data: Dict[str, Any], user_profile: Dict[str, Any]):
    """Set the current user context for tools to access"""
    global _user_context
    _user_context = {
        "user_id": user_id,
        "natal_chart": natal_chart_data,
        "profile": user_profile
    }


def get_user_context() -> Dict[str, Any]:
    """Get the current user context"""
    return _user_context


@tool
def get_current_transits(
    date: Annotated[Optional[str], "Target date in YYYY-MM-DD format. If not provided, uses today."] = None
) -> str:
    """
    Get current transit aspects for the user's natal chart.

    This tool calculates how current planetary positions are aspecting
    the user's natal chart. Use this when the user asks about timing,
    current focus, or "what's happening now/this week/this month".

    Args:
        date: Optional target date. If not provided, uses today.

    Returns:
        String describing the transit aspects and their meanings.
    """
    try:
        context = get_user_context()
        natal_chart = context.get("natal_chart")

        if not natal_chart:
            return "Error: User's natal chart not available. Please ensure the user has completed their profile."

        # Get user's current location if available
        profile = context.get("profile", {})
        current_lat = profile.get("current_latitude")
        current_lon = profile.get("current_longitude")

        # Compute transits
        transit_data = kerykeion_service.compute_transits(
            natal_chart_data=natal_chart,
            transit_date=date,
            transit_latitude=current_lat,
            transit_longitude=current_lon
        )

        # Format response
        aspects = transit_data.get("aspects", [])
        significant = transit_data.get("significant_transits", [])

        response = f"Transit aspects for {transit_data['transit_date'][:10]}:\n\n"

        if significant:
            response += "Major transits:\n"
            for transit in significant:
                response += f"- {transit}\n"

        response += f"\nTotal aspects found: {len(aspects)}\n"

        if aspects:
            response += "\nTop aspects:\n"
            for aspect in aspects[:5]:
                response += f"- {aspect['planet1']} {aspect['aspect_type']} natal {aspect['planet2']} (orb: {aspect['orb']:.1f}°)\n"

        logger.info(f"Computed transits for user {context.get('user_id')}")
        return response

    except Exception as e:
        logger.error(f"Error in get_current_transits: {e}")
        return f"Error computing transits: {str(e)}"


@tool
def analyze_synastry(
    partner_birth_date: Annotated[str, "Partner's birth date in YYYY-MM-DD format"],
    partner_birth_time: Annotated[Optional[str], "Partner's birth time in HH:MM:SS format (optional)"] = None,
    partner_birth_location: Annotated[Optional[str], "Partner's birth location (City, Country)"] = None,
    partner_latitude: Annotated[Optional[float], "Partner's birth latitude"] = None,
    partner_longitude: Annotated[Optional[float], "Partner's birth longitude"] = None
) -> str:
    """
    Analyze relationship compatibility (synastry) between the user and a partner.

    This tool compares two natal charts to assess relationship dynamics.
    Use this when the user asks about compatibility with someone, or
    about their relationship with a specific person.

    Args:
        partner_birth_date: Partner's birth date (required)
        partner_birth_time: Partner's birth time (optional but recommended)
        partner_birth_location: Partner's birth location description
        partner_latitude: Partner's birth latitude
        partner_longitude: Partner's birth longitude

    Returns:
        String describing the synastry analysis with compatibility insights.
    """
    try:
        context = get_user_context()
        natal_chart = context.get("natal_chart")

        if not natal_chart:
            return "Error: User's natal chart not available."

        # Use default coordinates if not provided (will need geocoding in production)
        lat = partner_latitude or 0.0
        lon = partner_longitude or 0.0

        # Compute synastry
        synastry_data = kerykeion_service.compute_synastry(
            user_chart_data=natal_chart,
            partner_birth_date=partner_birth_date,
            partner_birth_time=partner_birth_time,
            partner_latitude=lat,
            partner_longitude=lon
        )

        # Format response
        score = synastry_data.get("compatibility_score", 50)
        strengths = synastry_data.get("strengths", [])
        challenges = synastry_data.get("challenges", [])

        response = f"Synastry Analysis:\n\n"
        response += f"Compatibility Score: {score:.1f}/100\n\n"

        if strengths:
            response += "Relationship Strengths:\n"
            for strength in strengths:
                response += f"- {strength}\n"
            response += "\n"

        if challenges:
            response += "Relationship Challenges:\n"
            for challenge in challenges:
                response += f"- {challenge}\n"

        logger.info(f"Computed synastry for user {context.get('user_id')}")
        return response

    except Exception as e:
        logger.error(f"Error in analyze_synastry: {e}")
        return f"Error computing synastry: {str(e)}"


@tool
def search_chart_memory(
    query: Annotated[str, "Search query to find information about the user's natal chart"]
) -> str:
    """
    Search the user's natal chart data and past interpretations.

    This tool retrieves relevant information from the user's chart
    based on semantic similarity. Use this when you need specific
    details about the user's natal placements, or when referencing
    past interpretations.

    Args:
        query: What to search for (e.g., "Sun placement", "Mars aspects")

    Returns:
        Relevant information from the user's natal chart.
    """
    try:
        context = get_user_context()
        natal_chart = context.get("natal_chart")

        if not natal_chart:
            return "Error: User's natal chart not available."

        # For now, return a formatted summary of the natal chart
        # In production, this would use Chroma DB for semantic search
        planets = natal_chart.get("planets", {})

        response = "Natal Chart Summary:\n\n"

        for planet_name, planet_data in planets.items():
            sign = planet_data.get("sign", "Unknown")
            house = planet_data.get("house", 0)
            response += f"{planet_name.capitalize()}: {sign}, House {house}\n"

        logger.info(f"Searched chart memory for user {context.get('user_id')}")
        return response

    except Exception as e:
        logger.error(f"Error in search_chart_memory: {e}")
        return f"Error searching chart: {str(e)}"


# List of all tools for the agent
AGENT_TOOLS = [
    get_current_transits,
    analyze_synastry,
    search_chart_memory
]
