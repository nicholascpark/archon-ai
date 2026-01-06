"""
Cost Tracking Service

Monitors and tracks API usage costs for LLM and embeddings.
Provides per-user cost tracking and alerts.
"""
from typing import Optional, Dict, Any
from datetime import datetime, timedelta
from dataclasses import dataclass
from app.core.config import settings
from app.core.logging_config import logger
from app.services.persistence.database import get_db


# Pricing per 1M tokens (as of Jan 2025)
PRICING = {
    # Groq (FREE tier - rate limited)
    "groq": {
        "llama3-70b-8192": {
            "input": 0.00,  # Free!
            "output": 0.00  # Free!
        }
    },
    # Together.ai (Fallback)
    "together": {
        "meta-llama/Llama-3-70b-chat-hf": {
            "input": 0.90,  # $0.90 per 1M tokens
            "output": 0.90
        }
    },
    # OpenAI (Embeddings)
    "openai": {
        "text-embedding-3-small": {
            "input": 0.02,  # $0.02 per 1M tokens
            "output": 0.00
        }
    }
}


@dataclass
class UsageStats:
    """Container for usage statistics"""
    input_tokens: int
    output_tokens: int
    total_tokens: int
    cost_usd: float
    provider: str
    model: str
    timestamp: datetime


class CostTracker:
    """Service for tracking API usage and costs"""

    def __init__(self):
        """Initialize cost tracker"""
        self.enabled = settings.ENABLE_COST_TRACKING

    def calculate_cost(
        self,
        provider: str,
        model: str,
        input_tokens: int,
        output_tokens: int = 0
    ) -> float:
        """
        Calculate cost for API usage.

        Args:
            provider: Provider name (groq, together, openai)
            model: Model name
            input_tokens: Number of input tokens
            output_tokens: Number of output tokens

        Returns:
            Cost in USD
        """
        provider = provider.lower()

        if provider not in PRICING:
            logger.warning(f"Unknown provider: {provider}, assuming zero cost")
            return 0.0

        if model not in PRICING[provider]:
            logger.warning(f"Unknown model: {model} for provider {provider}")
            return 0.0

        pricing = PRICING[provider][model]

        input_cost = (input_tokens / 1_000_000) * pricing["input"]
        output_cost = (output_tokens / 1_000_000) * pricing["output"]

        total_cost = input_cost + output_cost

        return round(total_cost, 6)

    def log_usage(
        self,
        user_id: str,
        session_id: Optional[str],
        provider: str,
        model: str,
        input_tokens: int,
        output_tokens: int = 0,
        metadata: Optional[Dict[str, Any]] = None
    ) -> UsageStats:
        """
        Log API usage and calculate cost.

        Args:
            user_id: User's unique ID
            session_id: Session ID (optional)
            provider: Provider name
            model: Model name
            input_tokens: Number of input tokens
            output_tokens: Number of output tokens
            metadata: Additional metadata

        Returns:
            UsageStats object
        """
        if not self.enabled:
            return UsageStats(
                input_tokens=input_tokens,
                output_tokens=output_tokens,
                total_tokens=input_tokens + output_tokens,
                cost_usd=0.0,
                provider=provider,
                model=model,
                timestamp=datetime.utcnow()
            )

        # Calculate cost
        cost = self.calculate_cost(provider, model, input_tokens, output_tokens)
        total_tokens = input_tokens + output_tokens

        # Create usage stats
        stats = UsageStats(
            input_tokens=input_tokens,
            output_tokens=output_tokens,
            total_tokens=total_tokens,
            cost_usd=cost,
            provider=provider,
            model=model,
            timestamp=datetime.utcnow()
        )

        # Store in database
        try:
            db = get_db()
            db.execute(
                """
                INSERT INTO cost_logs
                (user_id, session_id, timestamp, provider, model,
                 input_tokens, output_tokens, cost_usd)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?)
                """,
                (
                    user_id,
                    session_id,
                    stats.timestamp,
                    provider,
                    model,
                    input_tokens,
                    output_tokens,
                    cost
                )
            )
            db.commit()

            logger.debug(
                f"Logged usage for user {user_id}: {total_tokens} tokens, ${cost:.6f}"
            )

        except Exception as e:
            logger.error(f"Failed to log cost: {e}")

        # Check if user exceeded daily limit
        self._check_user_limit(user_id, cost)

        return stats

    def _check_user_limit(self, user_id: str, current_cost: float) -> None:
        """
        Check if user is approaching or exceeded daily cost limit.

        Args:
            user_id: User's unique ID
            current_cost: Cost of current request
        """
        daily_cost = self.get_user_daily_cost(user_id)

        # Warning threshold (e.g., 60% of max)
        if daily_cost >= settings.WARN_COST_THRESHOLD:
            logger.warning(
                f"User {user_id} approaching daily limit: ${daily_cost:.4f} / ${settings.MAX_COST_PER_USER_DAILY}"
            )

        # Max threshold
        if daily_cost >= settings.MAX_COST_PER_USER_DAILY:
            logger.error(
                f"User {user_id} EXCEEDED daily limit: ${daily_cost:.4f}"
            )

    def get_user_daily_cost(self, user_id: str) -> float:
        """
        Get total cost for user today.

        Args:
            user_id: User's unique ID

        Returns:
            Total cost in USD
        """
        if not self.enabled:
            return 0.0

        try:
            db = get_db()
            today = datetime.utcnow().date()

            result = db.execute(
                """
                SELECT SUM(cost_usd) as total_cost
                FROM cost_logs
                WHERE user_id = ?
                AND DATE(timestamp) = ?
                """,
                (user_id, today)
            ).fetchone()

            return result["total_cost"] if result["total_cost"] else 0.0

        except Exception as e:
            logger.error(f"Failed to get daily cost: {e}")
            return 0.0

    def get_user_session_stats(self, session_id: str) -> Dict[str, Any]:
        """
        Get usage statistics for a session.

        Args:
            session_id: Session ID

        Returns:
            Dictionary with usage stats
        """
        if not self.enabled:
            return {
                "total_tokens": 0,
                "total_cost": 0.0,
                "request_count": 0
            }

        try:
            db = get_db()

            result = db.execute(
                """
                SELECT
                    COUNT(*) as request_count,
                    SUM(input_tokens + output_tokens) as total_tokens,
                    SUM(cost_usd) as total_cost
                FROM cost_logs
                WHERE session_id = ?
                """,
                (session_id,)
            ).fetchone()

            return {
                "total_tokens": result["total_tokens"] or 0,
                "total_cost": result["total_cost"] or 0.0,
                "request_count": result["request_count"] or 0
            }

        except Exception as e:
            logger.error(f"Failed to get session stats: {e}")
            return {
                "total_tokens": 0,
                "total_cost": 0.0,
                "request_count": 0
            }

    def get_user_lifetime_stats(self, user_id: str) -> Dict[str, Any]:
        """
        Get lifetime usage statistics for a user.

        Args:
            user_id: User's unique ID

        Returns:
            Dictionary with lifetime stats
        """
        if not self.enabled:
            return {
                "total_tokens": 0,
                "total_cost": 0.0,
                "session_count": 0,
                "request_count": 0
            }

        try:
            db = get_db()

            result = db.execute(
                """
                SELECT
                    COUNT(*) as request_count,
                    COUNT(DISTINCT session_id) as session_count,
                    SUM(input_tokens + output_tokens) as total_tokens,
                    SUM(cost_usd) as total_cost
                FROM cost_logs
                WHERE user_id = ?
                """,
                (user_id,)
            ).fetchone()

            return {
                "total_tokens": result["total_tokens"] or 0,
                "total_cost": result["total_cost"] or 0.0,
                "session_count": result["session_count"] or 0,
                "request_count": result["request_count"] or 0
            }

        except Exception as e:
            logger.error(f"Failed to get lifetime stats: {e}")
            return {
                "total_tokens": 0,
                "total_cost": 0.0,
                "session_count": 0,
                "request_count": 0
            }


# Global instance
cost_tracker = CostTracker()
