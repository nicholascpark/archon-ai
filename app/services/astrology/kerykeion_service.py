"""
Kerykeion astrology service for natal charts, transits, and synastry.

This service uses the free, open-source Kerykeion library for all
astrological calculations - no API keys needed!
"""
from typing import Dict, Any, List, Optional, Tuple
from datetime import datetime
import json
from app.core.logging_config import logger
from app.core.config import settings

# Import will work after Kerykeion is installed
try:
    from kerykeion import AstrologicalSubject
    from kerykeion.aspects import AspectsFactory
    KERYKEION_AVAILABLE = True
except ImportError:
    logger.warning("Kerykeion not installed. Install with: pip install kerykeion")
    KERYKEION_AVAILABLE = False


class KerykeionService:
    """
    Service for astrological calculations using Kerykeion.

    Provides:
    - Natal chart calculations
    - Transit analysis
    - Synastry (relationship compatibility)
    """

    # Map house system names to Kerykeion single-letter codes
    HOUSE_SYSTEM_CODES = {
        "placidus": "P",
        "koch": "K",
        "porphyrius": "O",
        "regiomontanus": "R",
        "campanus": "C",
        "equal": "A",
        "whole_sign": "W",
        "morinus": "M",
    }

    def __init__(self):
        house_name = settings.HOUSE_SYSTEM.lower()
        self.house_system = self.HOUSE_SYSTEM_CODES.get(house_name, "P")
        logger.info(f"KerykeionService initialized with house system: {house_name} ({self.house_system})")

    def compute_natal_chart(
        self,
        birth_date: str,
        birth_time: Optional[str],
        latitude: float,
        longitude: float,
        timezone: str = "UTC"
    ) -> Dict[str, Any]:
        """
        Compute natal chart using Kerykeion.

        Args:
            birth_date: Birth date in ISO format (YYYY-MM-DD)
            birth_time: Birth time in HH:MM:SS format (optional)
            latitude: Birth latitude
            longitude: Birth longitude
            timezone: Timezone string (e.g., "America/New_York")

        Returns:
            Dictionary containing chart data (planets, houses, aspects)
        """
        if not KERYKEION_AVAILABLE:
            raise RuntimeError("Kerykeion is not installed")

        try:
            # Parse birth datetime
            birth_datetime = self._parse_datetime(birth_date, birth_time)

            # Create astrological subject
            subject = AstrologicalSubject(
                name="User",
                year=birth_datetime.year,
                month=birth_datetime.month,
                day=birth_datetime.day,
                hour=birth_datetime.hour,
                minute=birth_datetime.minute,
                lat=latitude,
                lng=longitude,
                tz_str=timezone,
                houses_system_identifier=self.house_system
            )

            # Extract chart data
            chart_data = self._extract_chart_data(subject)

            logger.info(f"Computed natal chart for {birth_date} {birth_time}")
            return chart_data

        except Exception as e:
            logger.error(f"Error computing natal chart: {e}")
            raise

    def compute_transits(
        self,
        natal_chart_data: Dict[str, Any],
        transit_date: Optional[str] = None,
        transit_latitude: Optional[float] = None,
        transit_longitude: Optional[float] = None
    ) -> Dict[str, Any]:
        """
        Compute transit aspects for a specific date.

        Args:
            natal_chart_data: User's natal chart data (from compute_natal_chart)
            transit_date: Date for transits (defaults to today)
            transit_latitude: Location latitude (defaults to birth location)
            transit_longitude: Location longitude (defaults to birth location)

        Returns:
            Dictionary with transit aspects
        """
        if not KERYKEION_AVAILABLE:
            raise RuntimeError("Kerykeion is not installed")

        try:
            # Parse transit date
            if transit_date:
                transit_dt = datetime.fromisoformat(transit_date)
            else:
                transit_dt = datetime.now()

            # Use birth location if transit location not provided
            lat = transit_latitude or natal_chart_data["latitude"]
            lon = transit_longitude or natal_chart_data["longitude"]
            tz = natal_chart_data.get("timezone", "UTC")

            # Create natal subject and get model
            natal_subject = self._create_subject_from_chart_data(natal_chart_data)
            natal_model = natal_subject.model()

            # Create transit subject and get model
            transit_subject = AstrologicalSubject(
                name="Transit",
                year=transit_dt.year,
                month=transit_dt.month,
                day=transit_dt.day,
                hour=transit_dt.hour,
                minute=transit_dt.minute,
                lat=lat,
                lng=lon,
                tz_str=tz,
                houses_system_identifier=self.house_system
            )
            transit_model = transit_subject.model()

            # Calculate aspects between natal and transit (use models)
            aspects_result = AspectsFactory.dual_chart_aspects(natal_model, transit_model)
            aspects = aspects_result.aspects

            # Format transit data
            transit_data = {
                "transit_date": transit_dt.isoformat(),
                "aspects": self._format_aspects(aspects),
                "significant_transits": self._identify_significant_transits(aspects)
            }

            logger.info(f"Computed transits for {transit_dt.date()}")
            return transit_data

        except Exception as e:
            logger.error(f"Error computing transits: {e}")
            raise

    def compute_synastry(
        self,
        user_chart_data: Dict[str, Any],
        partner_birth_date: str,
        partner_birth_time: Optional[str],
        partner_latitude: float,
        partner_longitude: float,
        partner_timezone: str = "UTC"
    ) -> Dict[str, Any]:
        """
        Compute synastry (relationship compatibility) between two charts.

        Args:
            user_chart_data: User's natal chart data
            partner_birth_date: Partner's birth date (ISO format)
            partner_birth_time: Partner's birth time (HH:MM:SS)
            partner_latitude: Partner's birth latitude
            partner_longitude: Partner's birth longitude
            partner_timezone: Partner's timezone

        Returns:
            Dictionary with synastry aspects
        """
        if not KERYKEION_AVAILABLE:
            raise RuntimeError("Kerykeion is not installed")

        try:
            # Create user subject and get model
            user_subject = self._create_subject_from_chart_data(user_chart_data)
            user_model = user_subject.model()

            # Parse partner birth datetime
            partner_dt = self._parse_datetime(partner_birth_date, partner_birth_time)

            # Create partner subject and get model
            partner_subject = AstrologicalSubject(
                name="Partner",
                year=partner_dt.year,
                month=partner_dt.month,
                day=partner_dt.day,
                hour=partner_dt.hour,
                minute=partner_dt.minute,
                lat=partner_latitude,
                lng=partner_longitude,
                tz_str=partner_timezone,
                houses_system_identifier=self.house_system
            )
            partner_model = partner_subject.model()

            # Calculate synastry aspects (use models)
            aspects_result = AspectsFactory.dual_chart_aspects(user_model, partner_model)
            aspects = aspects_result.aspects

            # Format synastry data
            synastry_data = {
                "aspects": self._format_aspects(aspects),
                "compatibility_score": self._calculate_compatibility_score(aspects),
                "strengths": self._identify_synastry_strengths(aspects),
                "challenges": self._identify_synastry_challenges(aspects)
            }

            logger.info("Computed synastry analysis")
            return synastry_data

        except Exception as e:
            logger.error(f"Error computing synastry: {e}")
            raise

    # Helper methods

    def _parse_datetime(self, date_str: str, time_str: Optional[str]) -> datetime:
        """Parse date and optional time into datetime object"""
        if time_str:
            dt_str = f"{date_str} {time_str}"
            return datetime.fromisoformat(dt_str)
        else:
            # Default to noon if no time provided
            return datetime.fromisoformat(f"{date_str} 12:00:00")

    def _extract_chart_data(self, subject: Any) -> Dict[str, Any]:
        """Extract relevant data from Kerykeion AstrologicalSubject"""
        # Get planet positions (new Kerykeion API returns objects with attributes)
        planets = {}
        for planet_name in ["sun", "moon", "mercury", "venus", "mars",
                           "jupiter", "saturn", "uranus", "neptune", "pluto"]:
            planet = getattr(subject, planet_name, None)
            if planet:
                planets[planet_name] = {
                    "sign": getattr(planet, "sign", ""),
                    "position": getattr(planet, "position", 0),
                    "house": getattr(planet, "house", ""),
                    "retrograde": getattr(planet, "retrograde", False)
                }

        # Get house cusps (new API uses first_house, second_house, etc.)
        house_names = ["first_house", "second_house", "third_house", "fourth_house",
                      "fifth_house", "sixth_house", "seventh_house", "eighth_house",
                      "ninth_house", "tenth_house", "eleventh_house", "twelfth_house"]
        houses = {}
        for i, house_name in enumerate(house_names, 1):
            house = getattr(subject, house_name, None)
            if house:
                houses[f"house_{i}"] = {
                    "sign": getattr(house, "sign", ""),
                    "position": getattr(house, "position", 0)
                }

        # Get aspects (new API: use static method with model)
        model = subject.model()
        aspects_result = AspectsFactory.single_chart_aspects(model)
        aspects = self._format_aspects(aspects_result.aspects)

        # Get birth data from subject model
        year = getattr(model, "year", 1990)
        month = getattr(model, "month", 1)
        day = getattr(model, "day", 1)
        hour = getattr(model, "hour", 12)
        minute = getattr(model, "minute", 0)
        lat = getattr(model, "lat", 0)
        lng = getattr(model, "lng", 0)
        tz_str = getattr(model, "tz_str", "UTC")

        return {
            "birth_date": f"{year}-{month:02d}-{day:02d}",
            "birth_time": f"{hour:02d}:{minute:02d}:00",
            "latitude": lat,
            "longitude": lng,
            "timezone": tz_str,
            "planets": planets,
            "houses": houses,
            "aspects": aspects,
            "computed_at": datetime.utcnow().isoformat()
        }

    def _create_subject_from_chart_data(self, chart_data: Dict[str, Any]) -> Any:
        """Recreate AstrologicalSubject from stored chart data"""
        dt = self._parse_datetime(chart_data["birth_date"], chart_data.get("birth_time"))

        return AstrologicalSubject(
            name="User",
            year=dt.year,
            month=dt.month,
            day=dt.day,
            hour=dt.hour,
            minute=dt.minute,
            lat=chart_data["latitude"],
            lng=chart_data["longitude"],
            tz_str=chart_data.get("timezone", "UTC"),
            houses_system_identifier=self.house_system
        )

    def _format_aspects(self, aspects: List[Any]) -> List[Dict[str, Any]]:
        """Format aspects into a clean dictionary structure"""
        formatted = []
        for aspect in aspects:
            # New Kerykeion API uses object attributes
            formatted.append({
                "planet1": getattr(aspect, "p1_name", ""),
                "planet2": getattr(aspect, "p2_name", ""),
                "aspect_type": getattr(aspect, "aspect", ""),
                "orb": getattr(aspect, "orbit", 0),
                "applying": getattr(aspect, "aspect_movement", "") == "Applying"
            })
        return formatted

    def _identify_significant_transits(self, aspects: List[Any]) -> List[str]:
        """Identify major transits from aspect list"""
        significant = []
        major_aspects = ["conjunction", "opposition", "square", "trine", "sextile"]

        for aspect in aspects:
            aspect_type = getattr(aspect, "aspect", "").lower()
            if aspect_type in major_aspects:
                p1 = getattr(aspect, "p1_name", "")
                p2 = getattr(aspect, "p2_name", "")
                significant.append(f"{p1} {aspect_type} {p2}")

        return significant[:5]  # Return top 5

    def _calculate_compatibility_score(self, aspects: List[Any]) -> float:
        """Calculate simple compatibility score (0-100)"""
        if not aspects:
            return 50.0

        positive_weight = {"trine": 3, "sextile": 2, "conjunction": 1}
        negative_weight = {"opposition": -2, "square": -3}

        score = 50.0
        for aspect in aspects:
            aspect_type = getattr(aspect, "aspect", "").lower()
            if aspect_type in positive_weight:
                score += positive_weight[aspect_type]
            elif aspect_type in negative_weight:
                score += negative_weight[aspect_type]

        return max(0, min(100, score))

    def _identify_synastry_strengths(self, aspects: List[Any]) -> List[str]:
        """Identify relationship strengths"""
        strengths = []
        for aspect in aspects:
            aspect_type = getattr(aspect, "aspect", "").lower()
            if aspect_type in ["trine", "sextile"]:
                p1 = getattr(aspect, "p1_name", "")
                p2 = getattr(aspect, "p2_name", "")
                strengths.append(f"{p1}-{p2} {aspect_type}")

        return strengths[:3]

    def _identify_synastry_challenges(self, aspects: List[Any]) -> List[str]:
        """Identify relationship challenges"""
        challenges = []
        for aspect in aspects:
            aspect_type = getattr(aspect, "aspect", "").lower()
            if aspect_type in ["opposition", "square"]:
                p1 = getattr(aspect, "p1_name", "")
                p2 = getattr(aspect, "p2_name", "")
                challenges.append(f"{p1}-{p2} {aspect_type}")

        return challenges[:3]


    def get_current_moon_phase(self, date: Optional[str] = None) -> Dict[str, Any]:
        """
        Get current moon phase and sign.

        Args:
            date: Optional date string (YYYY-MM-DD), defaults to today

        Returns:
            Dictionary with moon phase info
        """
        if not KERYKEION_AVAILABLE:
            raise RuntimeError("Kerykeion is not installed")

        try:
            if date:
                dt = datetime.fromisoformat(date)
            else:
                dt = datetime.now()

            # Create a subject for the current moment
            subject = AstrologicalSubject(
                name="Now",
                year=dt.year,
                month=dt.month,
                day=dt.day,
                hour=dt.hour,
                minute=dt.minute,
                lat=0.0,  # Moon phase is the same globally
                lng=0.0,
                tz_str="UTC",
                houses_system_identifier=self.house_system
            )

            moon = getattr(subject, "moon", None)
            sun = getattr(subject, "sun", None)

            if not moon or not sun:
                return {"phase": "Unknown", "sign": "Unknown"}

            moon_pos = getattr(moon, "position", 0)
            sun_pos = getattr(sun, "position", 0)
            moon_sign = getattr(moon, "sign", "Unknown")

            # Calculate phase based on Sun-Moon angle
            angle = (moon_pos - sun_pos) % 360

            # Determine phase name
            if angle < 45:
                phase = "New Moon"
                phase_desc = "New beginnings, setting intentions, planting seeds"
            elif angle < 90:
                phase = "Waxing Crescent"
                phase_desc = "Building momentum, taking initial action"
            elif angle < 135:
                phase = "First Quarter"
                phase_desc = "Challenges and decisions, overcoming obstacles"
            elif angle < 180:
                phase = "Waxing Gibbous"
                phase_desc = "Refining, adjusting, almost there"
            elif angle < 225:
                phase = "Full Moon"
                phase_desc = "Culmination, manifestation, revelations"
            elif angle < 270:
                phase = "Waning Gibbous"
                phase_desc = "Gratitude, sharing, integrating lessons"
            elif angle < 315:
                phase = "Last Quarter"
                phase_desc = "Releasing, letting go, clearing"
            else:
                phase = "Waning Crescent"
                phase_desc = "Rest, reflection, preparation for renewal"

            return {
                "phase": phase,
                "phase_description": phase_desc,
                "moon_sign": moon_sign,
                "angle": round(angle, 1),
                "date": dt.strftime("%Y-%m-%d")
            }

        except Exception as e:
            logger.error(f"Error getting moon phase: {e}")
            raise

    def get_retrograde_planets(self, date: Optional[str] = None) -> Dict[str, Any]:
        """
        Get which planets are currently retrograde.

        Args:
            date: Optional date string (YYYY-MM-DD), defaults to today

        Returns:
            Dictionary with retrograde planet info
        """
        if not KERYKEION_AVAILABLE:
            raise RuntimeError("Kerykeion is not installed")

        try:
            if date:
                dt = datetime.fromisoformat(date)
            else:
                dt = datetime.now()

            subject = AstrologicalSubject(
                name="Now",
                year=dt.year,
                month=dt.month,
                day=dt.day,
                hour=12,
                minute=0,
                lat=0.0,
                lng=0.0,
                tz_str="UTC",
                houses_system_identifier=self.house_system
            )

            retrograde_planets = []
            direct_planets = []

            for planet_name in ["mercury", "venus", "mars", "jupiter", "saturn", "uranus", "neptune", "pluto"]:
                planet = getattr(subject, planet_name, None)
                if planet:
                    is_retro = getattr(planet, "retrograde", False)
                    sign = getattr(planet, "sign", "Unknown")
                    if is_retro:
                        retrograde_planets.append({
                            "planet": planet_name.capitalize(),
                            "sign": sign,
                            "meaning": self._get_retrograde_meaning(planet_name)
                        })
                    else:
                        direct_planets.append(planet_name.capitalize())

            return {
                "date": dt.strftime("%Y-%m-%d"),
                "retrograde_planets": retrograde_planets,
                "direct_planets": direct_planets,
                "retrograde_count": len(retrograde_planets)
            }

        except Exception as e:
            logger.error(f"Error getting retrograde planets: {e}")
            raise

    def _get_retrograde_meaning(self, planet: str) -> str:
        """Get the meaning of a planet being retrograde"""
        meanings = {
            "mercury": "Communication delays, technology issues, revisiting old ideas, introspection on how you think",
            "venus": "Relationship review, reassessing values, old flames may reappear, inner beauty work",
            "mars": "Low energy, anger turned inward, strategic planning, reconsidering actions",
            "jupiter": "Inner growth focus, reviewing beliefs, philosophical introspection",
            "saturn": "Karmic lessons intensify, restructuring foundations, inner discipline",
            "uranus": "Internal revolution, breaking free from inner constraints",
            "neptune": "Dreams clarify, illusions dissolve, spiritual introspection",
            "pluto": "Deep psychological work, power dynamics review, transformation"
        }
        return meanings.get(planet.lower(), "Review and reflection in this planet's domain")

    def compute_solar_return(
        self,
        natal_chart_data: Dict[str, Any],
        year: Optional[int] = None
    ) -> Dict[str, Any]:
        """
        Compute solar return chart (birthday chart for the year).

        Args:
            natal_chart_data: User's natal chart data
            year: Year for solar return (defaults to current year)

        Returns:
            Dictionary with solar return chart data
        """
        if not KERYKEION_AVAILABLE:
            raise RuntimeError("Kerykeion is not installed")

        try:
            if year is None:
                year = datetime.now().year

            # Get natal Sun position
            natal_sun = natal_chart_data.get("planets", {}).get("sun", {})
            natal_sun_pos = natal_sun.get("position", 0)

            # For solar return, we need to find when Sun returns to exact natal position
            # This is an approximation - exact calculation would need ephemeris
            birth_date = natal_chart_data.get("birth_date", "1990-01-01")
            birth_month, birth_day = int(birth_date[5:7]), int(birth_date[8:10])

            # Use birth date in target year
            lat = natal_chart_data.get("latitude", 0)
            lon = natal_chart_data.get("longitude", 0)
            tz = natal_chart_data.get("timezone", "UTC")

            subject = AstrologicalSubject(
                name="Solar Return",
                year=year,
                month=birth_month,
                day=birth_day,
                hour=12,
                minute=0,
                lat=lat,
                lng=lon,
                tz_str=tz,
                houses_system_identifier=self.house_system
            )

            chart_data = self._extract_chart_data(subject)

            # Add year theme analysis
            sr_sun = chart_data.get("planets", {}).get("sun", {})
            sr_moon = chart_data.get("planets", {}).get("moon", {})

            themes = []
            if sr_sun.get("house"):
                themes.append(f"Year focuses on {self._house_theme(sr_sun['house'])} (Sun in house {sr_sun['house']})")
            if sr_moon.get("sign"):
                themes.append(f"Emotional tone: {sr_moon.get('sign')} energy")

            return {
                "year": year,
                "chart": chart_data,
                "themes": themes,
                "sun_house": sr_sun.get("house"),
                "moon_sign": sr_moon.get("sign"),
                "ascendant": chart_data.get("houses", {}).get("house_1", {}).get("sign")
            }

        except Exception as e:
            logger.error(f"Error computing solar return: {e}")
            raise

    def _house_theme(self, house: int) -> str:
        """Get the theme of a house"""
        themes = {
            1: "self-identity and personal initiatives",
            2: "finances, values, and self-worth",
            3: "communication, learning, and siblings",
            4: "home, family, and emotional foundations",
            5: "creativity, romance, and self-expression",
            6: "health, work routines, and service",
            7: "partnerships and one-on-one relationships",
            8: "transformation, shared resources, and intimacy",
            9: "philosophy, travel, and higher education",
            10: "career, public image, and life direction",
            11: "friendships, groups, and future goals",
            12: "spirituality, solitude, and the unconscious"
        }
        return themes.get(house, "personal growth")

    def get_planetary_dignities(self, chart_data: Dict[str, Any]) -> Dict[str, Any]:
        """
        Analyze planetary dignities (strengths/weaknesses) in a chart.

        Args:
            chart_data: Chart data with planet positions

        Returns:
            Dictionary with dignity analysis
        """
        # Rulership table (planet: [signs it rules])
        rulerships = {
            "sun": ["Leo"],
            "moon": ["Cancer"],
            "mercury": ["Gemini", "Virgo"],
            "venus": ["Taurus", "Libra"],
            "mars": ["Aries", "Scorpio"],
            "jupiter": ["Sagittarius", "Pisces"],
            "saturn": ["Capricorn", "Aquarius"],
            "uranus": ["Aquarius"],
            "neptune": ["Pisces"],
            "pluto": ["Scorpio"]
        }

        # Exaltation table
        exaltations = {
            "sun": "Aries",
            "moon": "Taurus",
            "mercury": "Virgo",
            "venus": "Pisces",
            "mars": "Capricorn",
            "jupiter": "Cancer",
            "saturn": "Libra"
        }

        # Detriment (opposite of rulership)
        detriments = {
            "sun": ["Aquarius"],
            "moon": ["Capricorn"],
            "mercury": ["Sagittarius", "Pisces"],
            "venus": ["Aries", "Scorpio"],
            "mars": ["Taurus", "Libra"],
            "jupiter": ["Gemini", "Virgo"],
            "saturn": ["Cancer", "Leo"]
        }

        # Fall (opposite of exaltation)
        falls = {
            "sun": "Libra",
            "moon": "Scorpio",
            "mercury": "Pisces",
            "venus": "Virgo",
            "mars": "Cancer",
            "jupiter": "Capricorn",
            "saturn": "Aries"
        }

        planets = chart_data.get("planets", {})
        dignities = {"strong": [], "weak": [], "neutral": []}

        for planet_name, planet_data in planets.items():
            sign = planet_data.get("sign", "")
            if not sign:
                continue

            # Check dignity
            if sign in rulerships.get(planet_name, []):
                dignities["strong"].append({
                    "planet": planet_name.capitalize(),
                    "sign": sign,
                    "dignity": "Domicile",
                    "meaning": f"{planet_name.capitalize()} is at home in {sign}, expressing its nature freely"
                })
            elif sign == exaltations.get(planet_name):
                dignities["strong"].append({
                    "planet": planet_name.capitalize(),
                    "sign": sign,
                    "dignity": "Exalted",
                    "meaning": f"{planet_name.capitalize()} is honored in {sign}, operating at its best"
                })
            elif sign in detriments.get(planet_name, []):
                dignities["weak"].append({
                    "planet": planet_name.capitalize(),
                    "sign": sign,
                    "dignity": "Detriment",
                    "meaning": f"{planet_name.capitalize()} must work harder in {sign}, a challenging placement"
                })
            elif sign == falls.get(planet_name):
                dignities["weak"].append({
                    "planet": planet_name.capitalize(),
                    "sign": sign,
                    "dignity": "Fall",
                    "meaning": f"{planet_name.capitalize()} struggles in {sign}, requiring conscious effort"
                })
            else:
                dignities["neutral"].append({
                    "planet": planet_name.capitalize(),
                    "sign": sign
                })

        return dignities

    def identify_aspect_patterns(self, chart_data: Dict[str, Any]) -> Dict[str, Any]:
        """
        Identify major aspect patterns in a chart (Grand Trine, T-Square, etc.)

        Args:
            chart_data: Chart data with aspects

        Returns:
            Dictionary with identified patterns
        """
        aspects = chart_data.get("aspects", [])
        planets = chart_data.get("planets", {})

        patterns = []

        # Get all trines
        trines = [a for a in aspects if a.get("aspect_type", "").lower() == "trine"]
        # Get all squares
        squares = [a for a in aspects if a.get("aspect_type", "").lower() == "square"]
        # Get all oppositions
        oppositions = [a for a in aspects if a.get("aspect_type", "").lower() == "opposition"]

        # Check for Grand Trine (3 planets in trine with each other)
        if len(trines) >= 3:
            # Simplified detection - look for triangular patterns
            planets_in_trines = set()
            for t in trines:
                planets_in_trines.add(t.get("planet1", ""))
                planets_in_trines.add(t.get("planet2", ""))

            if len(planets_in_trines) >= 3:
                # Get element of first planet in trine
                first_planet = list(planets_in_trines)[0]
                if first_planet in planets:
                    element = self._get_element(planets[first_planet].get("sign", ""))
                    patterns.append({
                        "pattern": "Grand Trine",
                        "element": element,
                        "planets": list(planets_in_trines)[:3],
                        "meaning": f"Natural talent and flow in {element} matters - gifts that come easily"
                    })

        # Check for T-Square (2 planets in opposition, both square a third)
        if len(oppositions) >= 1 and len(squares) >= 2:
            for opp in oppositions:
                p1 = opp.get("planet1", "")
                p2 = opp.get("planet2", "")
                # Look for planet that squares both
                for sq in squares:
                    sq_p1 = sq.get("planet1", "")
                    sq_p2 = sq.get("planet2", "")
                    if (sq_p1 in [p1, p2] or sq_p2 in [p1, p2]):
                        apex = sq_p1 if sq_p1 not in [p1, p2] else sq_p2
                        if apex:
                            patterns.append({
                                "pattern": "T-Square",
                                "apex": apex,
                                "base": [p1, p2],
                                "meaning": f"Dynamic tension driving growth - {apex} is the release point"
                            })
                            break

        # Check for Stellium (3+ planets in same sign)
        sign_counts = {}
        for planet_name, planet_data in planets.items():
            sign = planet_data.get("sign", "")
            if sign:
                sign_counts[sign] = sign_counts.get(sign, []) + [planet_name]

        for sign, planet_list in sign_counts.items():
            if len(planet_list) >= 3:
                patterns.append({
                    "pattern": "Stellium",
                    "sign": sign,
                    "planets": planet_list,
                    "meaning": f"Concentrated energy in {sign} - major life theme"
                })

        return {
            "patterns": patterns,
            "pattern_count": len(patterns)
        }

    def _get_element(self, sign: str) -> str:
        """Get the element of a zodiac sign"""
        fire = ["Aries", "Leo", "Sagittarius"]
        earth = ["Taurus", "Virgo", "Capricorn"]
        air = ["Gemini", "Libra", "Aquarius"]
        water = ["Cancer", "Scorpio", "Pisces"]

        if sign in fire:
            return "Fire"
        elif sign in earth:
            return "Earth"
        elif sign in air:
            return "Air"
        elif sign in water:
            return "Water"
        return "Unknown"


# Global service instance
kerykeion_service = KerykeionService()
