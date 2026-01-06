"""
Geocoding Service for Birth Location Lookup

Converts location names to geographic coordinates (latitude, longitude) and timezone.
Uses OpenStreetMap Nominatim (free, no API key) with Google Geocoding as fallback.
"""
from typing import Dict, Optional, Tuple
import requests
from datetime import datetime
from timezonefinder import TimezoneFinder
from tenacity import retry, stop_after_attempt, wait_exponential
from app.core.config import settings
from app.core.logging_config import logger


class GeocodingService:
    """Service for geocoding location names to coordinates"""

    def __init__(self):
        """Initialize geocoding service"""
        self.nominatim_url = "https://nominatim.openstreetmap.org/search"
        self.headers = {
            "User-Agent": "Archon-AI-Astrology/1.0"  # Required by Nominatim
        }
        self.tf = TimezoneFinder()

    @retry(
        stop=stop_after_attempt(3),
        wait=wait_exponential(multiplier=1, min=2, max=10),
        reraise=True
    )
    def geocode_location(
        self,
        location: str
    ) -> Optional[Dict[str, any]]:
        """
        Geocode a location name to coordinates and timezone.

        Args:
            location: Location string (e.g., "New York, USA" or "London, UK")

        Returns:
            Dictionary with:
                - latitude: float
                - longitude: float
                - timezone: str (e.g., "America/New_York")
                - display_name: str (formatted location name)
            Returns None if location not found.
        """
        # Try Nominatim first (free, no API key)
        result = self._geocode_with_nominatim(location)

        if result:
            return result

        # Fallback to Google Geocoding if API key provided
        if settings.GOOGLE_GEOCODING_API_KEY:
            logger.info("Nominatim failed, trying Google Geocoding")
            result = self._geocode_with_google(location)
            if result:
                return result

        logger.warning(f"Could not geocode location: {location}")
        return None

    def _geocode_with_nominatim(
        self,
        location: str
    ) -> Optional[Dict[str, any]]:
        """
        Geocode using OpenStreetMap Nominatim (free).

        Args:
            location: Location string

        Returns:
            Geocoding result or None
        """
        try:
            params = {
                "q": location,
                "format": "json",
                "limit": 1,
                "addressdetails": 1
            }

            response = requests.get(
                self.nominatim_url,
                params=params,
                headers=self.headers,
                timeout=10
            )
            response.raise_for_status()

            data = response.json()

            if not data:
                logger.debug(f"Nominatim: No results for {location}")
                return None

            result = data[0]
            lat = float(result["lat"])
            lon = float(result["lon"])

            # Get timezone
            timezone = self.tf.timezone_at(lat=lat, lng=lon)
            if not timezone:
                timezone = "UTC"

            geocoded = {
                "latitude": lat,
                "longitude": lon,
                "timezone": timezone,
                "display_name": result.get("display_name", location)
            }

            logger.info(f"Geocoded '{location}' -> {lat:.4f}, {lon:.4f} ({timezone})")
            return geocoded

        except requests.RequestException as e:
            logger.error(f"Nominatim request failed: {e}")
            return None
        except (KeyError, ValueError, IndexError) as e:
            logger.error(f"Failed to parse Nominatim response: {e}")
            return None

    def _geocode_with_google(
        self,
        location: str
    ) -> Optional[Dict[str, any]]:
        """
        Geocode using Google Geocoding API (fallback).

        Args:
            location: Location string

        Returns:
            Geocoding result or None
        """
        try:
            url = "https://maps.googleapis.com/maps/api/geocode/json"
            params = {
                "address": location,
                "key": settings.GOOGLE_GEOCODING_API_KEY
            }

            response = requests.get(url, params=params, timeout=10)
            response.raise_for_status()

            data = response.json()

            if data["status"] != "OK" or not data.get("results"):
                logger.debug(f"Google Geocoding: No results for {location}")
                return None

            result = data["results"][0]
            geometry = result["geometry"]["location"]
            lat = geometry["lat"]
            lon = geometry["lng"]

            # Get timezone
            timezone = self.tf.timezone_at(lat=lat, lng=lon)
            if not timezone:
                timezone = "UTC"

            geocoded = {
                "latitude": lat,
                "longitude": lon,
                "timezone": timezone,
                "display_name": result.get("formatted_address", location)
            }

            logger.info(f"Google geocoded '{location}' -> {lat:.4f}, {lon:.4f}")
            return geocoded

        except requests.RequestException as e:
            logger.error(f"Google Geocoding request failed: {e}")
            return None
        except (KeyError, ValueError) as e:
            logger.error(f"Failed to parse Google response: {e}")
            return None

    def reverse_geocode(
        self,
        latitude: float,
        longitude: float
    ) -> Optional[str]:
        """
        Reverse geocode coordinates to location name.

        Args:
            latitude: Latitude
            longitude: Longitude

        Returns:
            Location name or None
        """
        try:
            url = f"{self.nominatim_url.replace('search', 'reverse')}"
            params = {
                "lat": latitude,
                "lon": longitude,
                "format": "json"
            }

            response = requests.get(
                url,
                params=params,
                headers=self.headers,
                timeout=10
            )
            response.raise_for_status()

            data = response.json()
            location_name = data.get("display_name", f"{latitude}, {longitude}")

            logger.debug(f"Reverse geocoded {latitude}, {longitude} -> {location_name}")
            return location_name

        except Exception as e:
            logger.error(f"Reverse geocoding failed: {e}")
            return f"{latitude}, {longitude}"

    def get_timezone(self, latitude: float, longitude: float) -> str:
        """
        Get timezone for coordinates.

        Args:
            latitude: Latitude
            longitude: Longitude

        Returns:
            Timezone string (e.g., "America/New_York")
        """
        timezone = self.tf.timezone_at(lat=latitude, lng=longitude)
        return timezone if timezone else "UTC"

    def validate_coordinates(
        self,
        latitude: float,
        longitude: float
    ) -> bool:
        """
        Validate coordinate ranges.

        Args:
            latitude: Latitude (-90 to 90)
            longitude: Longitude (-180 to 180)

        Returns:
            True if valid, False otherwise
        """
        return -90 <= latitude <= 90 and -180 <= longitude <= 180


# Global instance
geocoding_service = GeocodingService()
