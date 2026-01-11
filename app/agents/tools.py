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


@tool
def update_user_profile(
    field: Annotated[str, "Field to update: name, gender, birth_date, birth_time, birth_city, current_city"],
    value: Annotated[str, "Value to set for the field"],
    needs_geocoding: Annotated[bool, "Whether the value is a city name that needs geocoding"] = False
) -> str:
    """
    Update the user's profile with information they provided naturally in conversation.
    This tool saves data directly to the database and computes the natal chart when complete.

    Use this tool when the user shares personal information like:
    - Their name ("I'm Sarah" -> field=name, value=Sarah)
    - Gender/pronouns ("I'm a woman" / "I use she/her" -> field=gender, value=female)
    - Birth date ("I was born June 15, 1990" -> field=birth_date, value=1990-06-15)
    - Birth time ("around 2pm" -> field=birth_time, value=14:00)
    - Birth location ("in New York" -> field=birth_city, value=New York, needs_geocoding=True)
    - Current location ("I live in LA now" -> field=current_city, value=Los Angeles, needs_geocoding=True)

    Args:
        field: Which profile field to update
        value: The value extracted from user's message
        needs_geocoding: True if value is a city name needing lat/lon lookup

    Returns:
        Confirmation of the update
    """
    from timezonefinder import TimezoneFinder
    from app.services.persistence.database import get_db_context
    from app.models.user import UserDB
    import json

    logger.info(f"update_user_profile called: field={field}, value={value}, needs_geocoding={needs_geocoding}")

    try:
        context = get_user_context()
        user_id = context.get("user_id")

        if not user_id:
            logger.error("No user context available in update_user_profile")
            return "Error: No user context available."

        logger.info(f"Updating profile for user_id={user_id}")

        # Helper function to compute natal chart and update database
        def compute_and_store_natal_chart(db, user):
            """Compute natal chart if we have all required data"""
            if user.birth_date and user.birth_latitude and user.birth_longitude:
                try:
                    natal_chart = kerykeion_service.compute_natal_chart(
                        birth_date=user.birth_date,
                        birth_time=user.birth_time,
                        latitude=user.birth_latitude,
                        longitude=user.birth_longitude,
                        timezone=user.birth_timezone or "UTC"
                    )
                    user.natal_chart_data = json.dumps(natal_chart)
                    user.natal_chart_computed_at = datetime.utcnow()
                    db.commit()

                    # Update the global context so tools have access to the chart
                    global _user_context
                    _user_context["natal_chart"] = natal_chart
                    _user_context["profile"]["birth_date"] = user.birth_date
                    _user_context["profile"]["birth_time"] = user.birth_time
                    _user_context["profile"]["birth_latitude"] = user.birth_latitude
                    _user_context["profile"]["birth_longitude"] = user.birth_longitude

                    logger.info(f"Natal chart computed and stored for user {user_id}")
                    return natal_chart
                except Exception as e:
                    logger.error(f"Error computing natal chart: {e}")
                    return None
            return None

        # Handle geocoding for locations
        if needs_geocoding and field in ["birth_city", "current_city"]:
            try:
                from geopy.geocoders import Nominatim
                geolocator = Nominatim(user_agent="archon-ai")
                location = geolocator.geocode(value)

                if location:
                    # Get timezone from coordinates
                    try:
                        tf = TimezoneFinder()
                        timezone = tf.timezone_at(lat=location.latitude, lng=location.longitude) or "UTC"
                    except Exception:
                        timezone = "UTC"

                    with get_db_context() as db:
                        user = db.query(UserDB).filter(UserDB.id == user_id).first()
                        if not user:
                            logger.error(f"User not found in database for user_id={user_id}")
                            return "Error: User not found in database."

                        if field == "birth_city":
                            user.birth_location = value
                            user.birth_latitude = location.latitude
                            user.birth_longitude = location.longitude
                            user.birth_timezone = timezone
                            db.commit()
                            logger.info(f"Committed birth_city={value}, lat={location.latitude}, lon={location.longitude} for user_id={user_id}")

                            # Try to compute natal chart if we have date
                            logger.info(f"Checking for natal chart computation: birth_date={user.birth_date}, birth_lat={user.birth_latitude}")
                            natal_chart = compute_and_store_natal_chart(db, user)

                            if natal_chart:
                                logger.info(f"Natal chart computed for user_id={user_id}")
                                return f"Saved birth location: {value} ({timezone}). Your natal chart has been computed!"
                            elif user.birth_date:
                                return f"Saved birth location: {value} ({timezone}). Chart computed!"
                            else:
                                return f"Saved birth location: {value} ({timezone}). Still need your birth date to compute your chart."

                        else:  # current_city
                            user.current_location = value
                            user.current_latitude = location.latitude
                            user.current_longitude = location.longitude
                            user.location_updated_at = datetime.utcnow()
                            db.commit()
                            return f"Updated current location to {value} ({timezone})"
                else:
                    return f"Could not find coordinates for '{value}'. Please try a more specific location (e.g., 'New York, NY' or 'London, UK')."

            except ImportError as e:
                logger.warning(f"Import error: {e}")
                return f"Location lookup requires additional setup."
            except Exception as e:
                logger.error(f"Geocoding error: {e}")
                return f"Error looking up location: {str(e)}"

        # Handle other fields - all sync directly to database
        with get_db_context() as db:
            user = db.query(UserDB).filter(UserDB.id == user_id).first()
            if not user:
                return "Error: User not found in database."

            if field == "name":
                user.name = value
                db.commit()
                logger.info(f"Committed name={value} for user_id={user_id}")
                # Update context
                _user_context["profile"]["name"] = value
                return f"Nice to meet you, {value}!"

            elif field == "gender":
                user.gender = value
                db.commit()
                _user_context["profile"]["gender"] = value
                return f"Updated gender/pronouns to {value}"

            elif field == "birth_date":
                from dateutil import parser as date_parser
                try:
                    parsed_date = date_parser.parse(value)
                    date_str = parsed_date.strftime("%Y-%m-%d")
                    user.birth_date = date_str
                    db.commit()
                    logger.info(f"Committed birth_date={date_str} for user_id={user_id}")

                    # Try to compute natal chart if we have location
                    natal_chart = compute_and_store_natal_chart(db, user)

                    if natal_chart:
                        logger.info(f"Natal chart computed for user_id={user_id}")
                        return f"Saved birth date: {date_str}. Your natal chart has been computed!"
                    elif user.birth_latitude:
                        return f"Saved birth date: {date_str}. Chart computed!"
                    else:
                        return f"Saved birth date: {date_str}. Still need your birth location to compute your chart."

                except Exception as e:
                    logger.error(f"Error parsing date '{value}': {e}")
                    return f"Could not parse date '{value}'. Please use a format like 'June 15, 1990' or '1990-06-15'."

            elif field == "birth_time":
                from dateutil import parser as date_parser
                try:
                    parsed_time = date_parser.parse(value)
                    time_str = parsed_time.strftime("%H:%M:%S")
                    user.birth_time = time_str
                    db.commit()

                    # Recompute natal chart with time for accurate rising sign
                    natal_chart = compute_and_store_natal_chart(db, user)

                    if natal_chart:
                        return f"Saved birth time: {time_str}. Your natal chart has been updated with accurate rising sign and house placements!"
                    else:
                        return f"Saved birth time: {time_str}. Still need birth date and location to compute your chart."

                except Exception as e:
                    return f"Could not parse time '{value}'. Please use a format like '2:30 PM' or '14:30'."

        return f"Unknown field: {field}. Supported fields: name, gender, birth_date, birth_time, birth_city, current_city"

    except Exception as e:
        logger.error(f"Error in update_user_profile: {e}")
        import traceback
        logger.error(f"Traceback: {traceback.format_exc()}")
        return f"Error updating profile: {str(e)}"


@tool
async def store_user_memory(
    content: Annotated[str, "The memory content to store (a fact, insight, or experience)"],
    memory_type: Annotated[str, "Type of memory: 'semantic' (facts), 'episodic' (experiences), or 'procedural' (preferences)"] = "semantic"
) -> str:
    """
    Store a long-term memory about the user for future personalization.

    Use this tool when the user shares significant information about their life that
    would be helpful to remember for future conversations, such as:
    - Career information ("I'm a software engineer" -> semantic)
    - Relationship status ("I just got engaged" -> semantic)
    - Life events ("I'm moving to London next month" -> episodic)
    - Preferences ("I prefer detailed explanations" -> procedural)

    Args:
        content: The memory to store (summarize what the user shared)
        memory_type: Type of memory (semantic, episodic, or procedural)

    Returns:
        Confirmation that the memory was stored
    """
    from app.services.memory import memory_service, MemoryType

    try:
        context = get_user_context()
        user_id = context.get("user_id")

        if not user_id:
            return "Error: No user context available."

        # Map string to enum
        type_map = {
            "semantic": MemoryType.SEMANTIC,
            "episodic": MemoryType.EPISODIC,
            "procedural": MemoryType.PROCEDURAL
        }
        mem_type = type_map.get(memory_type, MemoryType.SEMANTIC)

        memory = await memory_service.store_memory(
            user_id=user_id,
            content=content,
            memory_type=mem_type
        )

        logger.info(f"Stored {memory_type} memory for user {user_id}")
        return f"Memory stored: {content[:50]}..."

    except Exception as e:
        logger.error(f"Error in store_user_memory: {e}")
        return f"Error storing memory: {str(e)}"


@tool
async def search_user_memories(
    query: Annotated[str, "Search query to find relevant memories about the user"]
) -> str:
    """
    Search the user's long-term memories for relevant information.

    Use this tool when you need to recall something the user mentioned
    in previous conversations, or when the user asks "do you remember..."
    or references something from before.

    Args:
        query: What to search for in memories

    Returns:
        Relevant memories if found
    """
    from app.services.memory import memory_service

    try:
        context = get_user_context()
        user_id = context.get("user_id")

        if not user_id:
            return "No user context available."

        results = await memory_service.search_memories(
            user_id=user_id,
            query=query,
            limit=3
        )

        if not results:
            return "No relevant memories found."

        response = "Relevant memories:\n"
        for result in results:
            response += f"- {result.memory.content} (relevance: {result.relevance_score:.2f})\n"

        return response

    except Exception as e:
        logger.error(f"Error in search_user_memories: {e}")
        return f"Error searching memories: {str(e)}"


@tool
def get_onboarding_status() -> str:
    """
    Check what profile information is still needed from the user.

    Use this tool at the start of a conversation to see if we need
    to gather any information from the user for personalized readings.

    Required fields for chart calculation:
    - name (for personalization)
    - gender (for pronouns)
    - birth_date (required)
    - birth_location (required)

    Optional but recommended:
    - birth_time (improves accuracy)
    - current_location (for transit calculations)

    Returns:
        Status of user's profile completion and what's still needed
    """
    from app.services.memory import memory_service

    try:
        context = get_user_context()
        user_id = context.get("user_id")

        if not user_id:
            return "No user context available."

        state = memory_service.get_onboarding_state(user_id)

        if state.is_complete:
            status = f"Profile complete ({state.completion_percentage}%)! "
            status += "User has provided name, gender, birth date, and birth location."

            if not state.has_birth_time:
                status += "\n\nOptional: Birth time not provided - readings will use noon as default."
            if not state.has_current_location:
                status += "\nOptional: Current location not provided - transit house placements may be less accurate."

            return status

        # Show missing required fields
        missing_required = state.missing_required
        prompt = state.get_friendly_prompt()

        response = f"Profile incomplete ({state.completion_percentage}%).\n"
        response += f"Still need: {', '.join(missing_required)}\n\n"
        response += f"Suggested question: \"{prompt}\""

        return response

    except Exception as e:
        logger.error(f"Error in get_onboarding_status: {e}")
        return f"Error checking profile: {str(e)}"


@tool
def get_moon_phase(
    date: Annotated[Optional[str], "Date in YYYY-MM-DD format. If not provided, uses today."] = None
) -> str:
    """
    Get the current moon phase and sign.

    Use this when the user asks about:
    - "What phase is the moon?"
    - "Is it a good time for new beginnings?"
    - "What's the moon in today?"
    - Timing questions related to lunar cycles

    Args:
        date: Optional target date. If not provided, uses today.

    Returns:
        String describing the current moon phase, sign, and its meaning.
    """
    try:
        moon_data = kerykeion_service.get_current_moon_phase(date)

        response = f"Moon Phase ({moon_data['date']}):\n\n"
        response += f"Phase: {moon_data['phase']}\n"
        response += f"Moon Sign: {moon_data['moon_sign']}\n"
        response += f"Meaning: {moon_data['phase_description']}\n"

        logger.info(f"Retrieved moon phase for {moon_data['date']}")
        return response

    except Exception as e:
        logger.error(f"Error in get_moon_phase: {e}")
        return f"Error getting moon phase: {str(e)}"


@tool
def get_retrograde_planets(
    date: Annotated[Optional[str], "Date in YYYY-MM-DD format. If not provided, uses today."] = None
) -> str:
    """
    Get which planets are currently retrograde.

    Use this when the user asks about:
    - "Is Mercury in retrograde?"
    - "Why does everything feel slow/stuck?"
    - "What planets are retrograde right now?"
    - Communication or technology issues
    - General feeling of things going backwards

    Args:
        date: Optional target date. If not provided, uses today.

    Returns:
        String describing which planets are retrograde and their meanings.
    """
    try:
        retro_data = kerykeion_service.get_retrograde_planets(date)

        response = f"Retrograde Planets ({retro_data['date']}):\n\n"

        if retro_data['retrograde_planets']:
            response += f"{retro_data['retrograde_count']} planet(s) retrograde:\n"
            for planet in retro_data['retrograde_planets']:
                response += f"\n• {planet['planet']} in {planet['sign']}\n"
                response += f"  {planet['meaning']}\n"
        else:
            response += "No planets are currently retrograde.\n"
            response += "Clear cosmic traffic - good time for forward movement!\n"

        response += f"\nDirect planets: {', '.join(retro_data['direct_planets'])}"

        logger.info(f"Retrieved retrograde planets for {retro_data['date']}")
        return response

    except Exception as e:
        logger.error(f"Error in get_retrograde_planets: {e}")
        return f"Error getting retrograde planets: {str(e)}"


@tool
def get_solar_return(
    year: Annotated[Optional[int], "Year for the solar return. Defaults to current year."] = None
) -> str:
    """
    Get the user's solar return chart (birthday year forecast).

    Use this when the user asks about:
    - "What's my year ahead look like?"
    - "Birthday reading"
    - "What themes for this year?"
    - "What should I focus on this year?"
    - Annual forecasts or year-ahead questions

    Args:
        year: Year for solar return. Defaults to current year.

    Returns:
        String describing the solar return themes and focus areas.
    """
    try:
        context = get_user_context()
        natal_chart = context.get("natal_chart")

        if not natal_chart:
            return "Error: User's natal chart not available. Please ensure birth data is complete."

        sr_data = kerykeion_service.compute_solar_return(natal_chart, year)

        response = f"Solar Return {sr_data['year']} - Your Year Ahead:\n\n"

        if sr_data['themes']:
            for theme in sr_data['themes']:
                response += f"• {theme}\n"

        if sr_data.get('ascendant'):
            response += f"\nYear's Rising Sign: {sr_data['ascendant']}\n"
            response += "(This colors how you present yourself this year)\n"

        logger.info(f"Computed solar return for year {sr_data['year']}")
        return response

    except Exception as e:
        logger.error(f"Error in get_solar_return: {e}")
        return f"Error computing solar return: {str(e)}"


@tool
def get_planetary_dignities() -> str:
    """
    Analyze the user's planetary dignities (strengths and weaknesses in their chart).

    Use this when the user asks about:
    - "What are my strengths/weaknesses?"
    - "Which planets are strong in my chart?"
    - "Where do I have natural talent?"
    - "What do I need to work on?"
    - Questions about planetary power or placement quality

    Returns:
        String describing strong and weak planetary placements.
    """
    try:
        context = get_user_context()
        natal_chart = context.get("natal_chart")

        if not natal_chart:
            return "Error: User's natal chart not available."

        dignities = kerykeion_service.get_planetary_dignities(natal_chart)

        response = "Planetary Dignities Analysis:\n\n"

        if dignities['strong']:
            response += "STRENGTHS (Naturally Gifted):\n"
            for d in dignities['strong']:
                response += f"• {d['planet']} in {d['sign']} ({d['dignity']})\n"
                response += f"  {d['meaning']}\n\n"

        if dignities['weak']:
            response += "GROWTH AREAS (Require Conscious Effort):\n"
            for d in dignities['weak']:
                response += f"• {d['planet']} in {d['sign']} ({d['dignity']})\n"
                response += f"  {d['meaning']}\n\n"

        if not dignities['strong'] and not dignities['weak']:
            response += "All planets in neutral positions - balanced expression across the board.\n"

        logger.info(f"Analyzed dignities for user {context.get('user_id')}")
        return response

    except Exception as e:
        logger.error(f"Error in get_planetary_dignities: {e}")
        return f"Error analyzing dignities: {str(e)}"


@tool
def get_aspect_patterns() -> str:
    """
    Identify major aspect patterns in the user's chart (Grand Trine, T-Square, Stellium, etc.)

    Use this when the user asks about:
    - "What patterns are in my chart?"
    - "Do I have any special configurations?"
    - "Grand trine? T-square?"
    - "Where is my energy concentrated?"
    - Questions about chart patterns or special formations

    Returns:
        String describing any significant aspect patterns found.
    """
    try:
        context = get_user_context()
        natal_chart = context.get("natal_chart")

        if not natal_chart:
            return "Error: User's natal chart not available."

        patterns = kerykeion_service.identify_aspect_patterns(natal_chart)

        if not patterns['patterns']:
            return "No major aspect patterns identified in your chart. Your planetary energies work more independently."

        response = f"Aspect Patterns Found ({patterns['pattern_count']}):\n\n"

        for p in patterns['patterns']:
            response += f"• {p['pattern']}"
            if p.get('element'):
                response += f" in {p['element']}"
            if p.get('sign'):
                response += f" in {p['sign']}"
            response += "\n"

            if p.get('planets'):
                response += f"  Planets: {', '.join([pl.capitalize() for pl in p['planets']])}\n"
            if p.get('apex'):
                response += f"  Apex: {p['apex'].capitalize()}\n"
            if p.get('meaning'):
                response += f"  {p['meaning']}\n"
            response += "\n"

        logger.info(f"Identified {patterns['pattern_count']} patterns for user {context.get('user_id')}")
        return response

    except Exception as e:
        logger.error(f"Error in get_aspect_patterns: {e}")
        return f"Error identifying patterns: {str(e)}"


# List of all tools for the agent
AGENT_TOOLS = [
    # Astrology tools - Core
    get_current_transits,
    analyze_synastry,
    search_chart_memory,
    # Astrology tools - Timing
    get_moon_phase,
    get_retrograde_planets,
    get_solar_return,
    # Astrology tools - Chart Analysis
    get_planetary_dignities,
    get_aspect_patterns,
    # Profile & memory tools
    update_user_profile,
    store_user_memory,
    search_user_memories,
    get_onboarding_status,
]
