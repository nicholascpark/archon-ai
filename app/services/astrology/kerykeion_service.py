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

    def __init__(self):
        self.house_system = settings.HOUSE_SYSTEM
        logger.info(f"KerykeionService initialized with house system: {self.house_system}")

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
                houses_system=self.house_system
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

            # Create natal subject
            natal_subject = self._create_subject_from_chart_data(natal_chart_data)

            # Create transit subject
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
                houses_system=self.house_system
            )

            # Calculate aspects between natal and transit
            aspects = AspectsFactory.dual_chart_aspects(natal_subject, transit_subject)

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
            # Create user subject
            user_subject = self._create_subject_from_chart_data(user_chart_data)

            # Parse partner birth datetime
            partner_dt = self._parse_datetime(partner_birth_date, partner_birth_time)

            # Create partner subject
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
                houses_system=self.house_system
            )

            # Calculate synastry aspects
            aspects = AspectsFactory.dual_chart_aspects(user_subject, partner_subject)

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
        # Get planet positions
        planets = {}
        for planet_name in ["sun", "moon", "mercury", "venus", "mars",
                           "jupiter", "saturn", "uranus", "neptune", "pluto"]:
            planet = getattr(subject, planet_name, None)
            if planet:
                planets[planet_name] = {
                    "sign": planet.get("sign", ""),
                    "position": planet.get("position", 0),
                    "house": planet.get("house", 0)
                }

        # Get house cusps
        houses = {f"house_{i}": subject.houses_list[i-1]
                 for i in range(1, 13) if i <= len(subject.houses_list)}

        # Get aspects
        aspects_factory = AspectsFactory(subject)
        aspects = self._format_aspects(aspects_factory.all_aspects)

        return {
            "birth_date": f"{subject.year}-{subject.month:02d}-{subject.day:02d}",
            "birth_time": f"{subject.hour:02d}:{subject.minute:02d}:00",
            "latitude": subject.lat,
            "longitude": subject.lng,
            "timezone": subject.tz_str,
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
            houses_system=self.house_system
        )

    def _format_aspects(self, aspects: List[Any]) -> List[Dict[str, Any]]:
        """Format aspects into a clean dictionary structure"""
        formatted = []
        for aspect in aspects:
            formatted.append({
                "planet1": aspect.get("p1_name", ""),
                "planet2": aspect.get("p2_name", ""),
                "aspect_type": aspect.get("aspect", ""),
                "orb": aspect.get("orbit", 0),
                "applying": aspect.get("aid", 0) < 0
            })
        return formatted

    def _identify_significant_transits(self, aspects: List[Any]) -> List[str]:
        """Identify major transits from aspect list"""
        significant = []
        major_aspects = ["conjunction", "opposition", "square", "trine", "sextile"]

        for aspect in aspects:
            aspect_type = aspect.get("aspect", "").lower()
            if aspect_type in major_aspects:
                p1 = aspect.get("p1_name", "")
                p2 = aspect.get("p2_name", "")
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
            aspect_type = aspect.get("aspect", "").lower()
            if aspect_type in positive_weight:
                score += positive_weight[aspect_type]
            elif aspect_type in negative_weight:
                score += negative_weight[aspect_type]

        return max(0, min(100, score))

    def _identify_synastry_strengths(self, aspects: List[Any]) -> List[str]:
        """Identify relationship strengths"""
        strengths = []
        for aspect in aspects:
            aspect_type = aspect.get("aspect", "").lower()
            if aspect_type in ["trine", "sextile"]:
                p1 = aspect.get("p1_name", "")
                p2 = aspect.get("p2_name", "")
                strengths.append(f"{p1}-{p2} {aspect_type}")

        return strengths[:3]

    def _identify_synastry_challenges(self, aspects: List[Any]) -> List[str]:
        """Identify relationship challenges"""
        challenges = []
        for aspect in aspects:
            aspect_type = aspect.get("aspect", "").lower()
            if aspect_type in ["opposition", "square"]:
                p1 = aspect.get("p1_name", "")
                p2 = aspect.get("p2_name", "")
                challenges.append(f"{p1}-{p2} {aspect_type}")

        return challenges[:3]


# Global service instance
kerykeion_service = KerykeionService()
