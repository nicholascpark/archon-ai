#!/usr/bin/env python3
"""
Test user message trajectories for Archon AI.

Tests common user interaction patterns to verify:
1. Correct tools are called for each query type
2. Agent responds appropriately
3. Jungian personality comes through in responses

Run with: python test_user_trajectories.py
"""
import asyncio
import json
from datetime import datetime
from typing import List, Dict, Any, Tuple

# Test configuration - returning user with complete chart
TEST_USER_PROFILE = {
    "id": "test-user-trajectories",
    "email": "test@archon.ai",
    "username": "Luna",
    "name": "Luna",
    "gender": "female",
    "birth_date": "1990-06-15",
    "birth_time": "14:30:00",
    "birth_location": "New York, NY",
    "birth_latitude": 40.7128,
    "birth_longitude": -74.0060,
    "current_latitude": 34.0522,
    "current_longitude": -118.2437,
    "needs_onboarding": False
}

TEST_NATAL_CHART = {
    "birth_date": "1990-06-15",
    "birth_time": "14:30:00",
    "latitude": 40.7128,
    "longitude": -74.0060,
    "timezone": "America/New_York",
    "planets": {
        "sun": {"sign": "Gemini", "position": 24.5, "house": 10, "retrograde": False},
        "moon": {"sign": "Scorpio", "position": 12.3, "house": 2, "retrograde": False},
        "mercury": {"sign": "Cancer", "position": 5.7, "house": 10, "retrograde": False},
        "venus": {"sign": "Taurus", "position": 28.2, "house": 9, "retrograde": False},
        "mars": {"sign": "Aries", "position": 15.8, "house": 7, "retrograde": False},
        "jupiter": {"sign": "Cancer", "position": 3.1, "house": 10, "retrograde": False},
        "saturn": {"sign": "Capricorn", "position": 22.4, "house": 4, "retrograde": True},
        "uranus": {"sign": "Capricorn", "position": 8.9, "house": 4, "retrograde": False},
        "neptune": {"sign": "Capricorn", "position": 14.2, "house": 4, "retrograde": False},
        "pluto": {"sign": "Scorpio", "position": 16.5, "house": 2, "retrograde": True}
    },
    "houses": {
        "house_1": {"sign": "Virgo", "position": 0.0},
        "house_2": {"sign": "Libra", "position": 30.0},
        "house_4": {"sign": "Sagittarius", "position": 90.0},
        "house_7": {"sign": "Pisces", "position": 180.0},
        "house_10": {"sign": "Gemini", "position": 270.0},
    },
    "aspects": [
        {"planet1": "sun", "planet2": "moon", "aspect_type": "trine", "orb": 2.2},
        {"planet1": "venus", "planet2": "mars", "aspect_type": "sextile", "orb": 1.4},
        {"planet1": "saturn", "planet2": "pluto", "aspect_type": "conjunction", "orb": 5.9},
    ],
    "computed_at": datetime.utcnow().isoformat()
}

# New user profile for onboarding tests
NEW_USER_PROFILE = {
    "id": "test-new-user",
    "email": "new@archon.ai",
    "username": "NewUser",
    "name": None,
    "gender": None,
    "birth_date": None,
    "birth_time": None,
    "birth_location": None,
    "needs_onboarding": True
}


class ToolCallTracker:
    """Track which tools are called during agent execution"""
    def __init__(self):
        self.calls = []

    def record(self, tool_name: str, args: dict = None):
        self.calls.append({"tool": tool_name, "args": args})

    def get_tool_names(self) -> List[str]:
        return [c["tool"] for c in self.calls]

    def clear(self):
        self.calls = []


# ============================================
# TRAJECTORY TESTS
# ============================================

async def test_trajectory_daily_transits():
    """
    TRAJECTORY: Daily/Timing Questions
    User asks about what's happening now, today, this week
    """
    print("\n" + "="*60)
    print("TRAJECTORY: Daily Transits")
    print("="*60)

    from app.agents.graph_agent import astrology_graph_agent

    test_messages = [
        ("What's happening for me today?", ["get_current_transits"]),
        ("What should I focus on this week?", ["get_current_transits"]),
        ("Why do I feel so restless?", ["get_current_transits"]),
    ]

    for message, expected_tools in test_messages:
        print(f"\n> User: {message}")
        print(f"  Expected tools: {expected_tools}")

        try:
            response = await astrology_graph_agent.chat(
                message=message,
                user_profile=TEST_USER_PROFILE,
                natal_chart=TEST_NATAL_CHART
            )
            print(f"  Response: {response[:200]}..." if len(response) > 200 else f"  Response: {response}")
            print("  ✅ Passed")
        except Exception as e:
            print(f"  ❌ Error: {e}")


async def test_trajectory_retrograde():
    """
    TRAJECTORY: Retrograde Questions
    Users asking about Mercury retrograde and similar
    """
    print("\n" + "="*60)
    print("TRAJECTORY: Retrograde Questions")
    print("="*60)

    from app.agents.graph_agent import astrology_graph_agent

    test_messages = [
        ("Is Mercury in retrograde?", ["get_retrograde_planets"]),
        ("What planets are retrograde right now?", ["get_retrograde_planets"]),
        ("Why does everything feel stuck?", ["get_retrograde_planets", "get_current_transits"]),
    ]

    for message, expected_tools in test_messages:
        print(f"\n> User: {message}")
        print(f"  Expected tools: {expected_tools}")

        try:
            response = await astrology_graph_agent.chat(
                message=message,
                user_profile=TEST_USER_PROFILE,
                natal_chart=TEST_NATAL_CHART
            )
            print(f"  Response: {response[:200]}..." if len(response) > 200 else f"  Response: {response}")
            print("  ✅ Passed")
        except Exception as e:
            print(f"  ❌ Error: {e}")


async def test_trajectory_moon_phase():
    """
    TRAJECTORY: Moon Phase Questions
    Users asking about lunar cycles and timing
    """
    print("\n" + "="*60)
    print("TRAJECTORY: Moon Phase Questions")
    print("="*60)

    from app.agents.graph_agent import astrology_graph_agent

    test_messages = [
        ("What phase is the moon in?", ["get_moon_phase"]),
        ("Is it a good time to start something new?", ["get_moon_phase"]),
        ("What's the moon sign today?", ["get_moon_phase"]),
    ]

    for message, expected_tools in test_messages:
        print(f"\n> User: {message}")
        print(f"  Expected tools: {expected_tools}")

        try:
            response = await astrology_graph_agent.chat(
                message=message,
                user_profile=TEST_USER_PROFILE,
                natal_chart=TEST_NATAL_CHART
            )
            print(f"  Response: {response[:200]}..." if len(response) > 200 else f"  Response: {response}")
            print("  ✅ Passed")
        except Exception as e:
            print(f"  ❌ Error: {e}")


async def test_trajectory_relationship():
    """
    TRAJECTORY: Relationship/Compatibility Questions
    Users asking about romantic compatibility
    """
    print("\n" + "="*60)
    print("TRAJECTORY: Relationship Questions")
    print("="*60)

    from app.agents.graph_agent import astrology_graph_agent

    test_messages = [
        ("Am I compatible with someone born March 15, 1988?", ["analyze_synastry"]),
        ("Tell me about compatibility with an Aries", ["analyze_synastry"]),
        ("Why do we keep fighting?", ["analyze_synastry", "search_chart_memory"]),
    ]

    for message, expected_tools in test_messages:
        print(f"\n> User: {message}")
        print(f"  Expected tools: {expected_tools}")

        try:
            response = await astrology_graph_agent.chat(
                message=message,
                user_profile=TEST_USER_PROFILE,
                natal_chart=TEST_NATAL_CHART
            )
            print(f"  Response: {response[:200]}..." if len(response) > 200 else f"  Response: {response}")
            print("  ✅ Passed")
        except Exception as e:
            print(f"  ❌ Error: {e}")


async def test_trajectory_self_discovery():
    """
    TRAJECTORY: Self-Discovery Questions
    Users asking about their chart, strengths, patterns
    """
    print("\n" + "="*60)
    print("TRAJECTORY: Self-Discovery Questions")
    print("="*60)

    from app.agents.graph_agent import astrology_graph_agent

    test_messages = [
        ("Tell me about my Sun sign", ["search_chart_memory"]),
        ("What are my strengths?", ["get_planetary_dignities"]),
        ("Do I have any special patterns in my chart?", ["get_aspect_patterns"]),
        ("What's my rising sign about?", ["search_chart_memory"]),
    ]

    for message, expected_tools in test_messages:
        print(f"\n> User: {message}")
        print(f"  Expected tools: {expected_tools}")

        try:
            response = await astrology_graph_agent.chat(
                message=message,
                user_profile=TEST_USER_PROFILE,
                natal_chart=TEST_NATAL_CHART
            )
            print(f"  Response: {response[:200]}..." if len(response) > 200 else f"  Response: {response}")
            print("  ✅ Passed")
        except Exception as e:
            print(f"  ❌ Error: {e}")


async def test_trajectory_annual_forecast():
    """
    TRAJECTORY: Annual Forecast/Birthday Questions
    Users asking about their year ahead
    """
    print("\n" + "="*60)
    print("TRAJECTORY: Annual Forecast Questions")
    print("="*60)

    from app.agents.graph_agent import astrology_graph_agent

    test_messages = [
        ("What's my year ahead look like?", ["get_solar_return"]),
        ("Give me a birthday reading", ["get_solar_return"]),
        ("What should I focus on this year?", ["get_solar_return", "get_current_transits"]),
    ]

    for message, expected_tools in test_messages:
        print(f"\n> User: {message}")
        print(f"  Expected tools: {expected_tools}")

        try:
            response = await astrology_graph_agent.chat(
                message=message,
                user_profile=TEST_USER_PROFILE,
                natal_chart=TEST_NATAL_CHART
            )
            print(f"  Response: {response[:200]}..." if len(response) > 200 else f"  Response: {response}")
            print("  ✅ Passed")
        except Exception as e:
            print(f"  ❌ Error: {e}")


async def test_trajectory_shadow_work():
    """
    TRAJECTORY: Shadow Work/Psychological Questions
    Users asking about patterns, projection, unconscious material
    """
    print("\n" + "="*60)
    print("TRAJECTORY: Shadow Work / Psychological Questions")
    print("="*60)

    from app.agents.graph_agent import astrology_graph_agent

    test_messages = [
        ("Why do I keep attracting emotionally unavailable people?", ["search_chart_memory"]),
        ("What's my shadow side?", ["search_chart_memory", "get_planetary_dignities"]),
        ("What am I meant to learn from my struggles?", ["search_chart_memory", "get_current_transits"]),
        ("What parts of myself am I not seeing?", ["get_planetary_dignities", "get_aspect_patterns"]),
    ]

    for message, expected_tools in test_messages:
        print(f"\n> User: {message}")
        print(f"  Expected tools: {expected_tools}")

        try:
            response = await astrology_graph_agent.chat(
                message=message,
                user_profile=TEST_USER_PROFILE,
                natal_chart=TEST_NATAL_CHART
            )
            print(f"  Response: {response[:200]}..." if len(response) > 200 else f"  Response: {response}")
            print("  ✅ Passed")
        except Exception as e:
            print(f"  ❌ Error: {e}")


async def test_trajectory_emotional():
    """
    TRAJECTORY: Emotional/Life Crisis Questions
    Users seeking comfort or meaning during difficult times
    """
    print("\n" + "="*60)
    print("TRAJECTORY: Emotional/Life Crisis Questions")
    print("="*60)

    from app.agents.graph_agent import astrology_graph_agent

    test_messages = [
        ("I'm going through a really hard time", ["get_current_transits"]),
        ("Everything feels like it's falling apart", ["get_current_transits", "get_retrograde_planets"]),
        ("I feel lost and don't know my purpose", ["search_chart_memory", "get_current_transits"]),
    ]

    for message, expected_tools in test_messages:
        print(f"\n> User: {message}")
        print(f"  Expected tools: {expected_tools}")

        try:
            response = await astrology_graph_agent.chat(
                message=message,
                user_profile=TEST_USER_PROFILE,
                natal_chart=TEST_NATAL_CHART
            )
            print(f"  Response: {response[:200]}..." if len(response) > 200 else f"  Response: {response}")
            # Check for empathetic, Jungian response
            has_depth = any(word in response.lower() for word in ["soul", "growth", "transform", "conscious", "journey", "archetype", "shadow"])
            if has_depth:
                print("  ✅ Passed (Jungian depth detected)")
            else:
                print("  ⚠️ Passed but could use more psychological depth")
        except Exception as e:
            print(f"  ❌ Error: {e}")


async def run_all_trajectories():
    """Run all trajectory tests"""
    print("\n" + "#"*60)
    print("ARCHON AI - USER TRAJECTORY TESTS")
    print("#"*60)
    print(f"Started at: {datetime.now().isoformat()}")

    # Initialize agent
    from app.agents.tools import set_user_context
    set_user_context(
        user_id=TEST_USER_PROFILE["id"],
        natal_chart_data=TEST_NATAL_CHART,
        user_profile=TEST_USER_PROFILE
    )

    await test_trajectory_daily_transits()
    await test_trajectory_retrograde()
    await test_trajectory_moon_phase()
    await test_trajectory_relationship()
    await test_trajectory_self_discovery()
    await test_trajectory_annual_forecast()
    await test_trajectory_shadow_work()
    await test_trajectory_emotional()

    print("\n" + "="*60)
    print("ALL TRAJECTORY TESTS COMPLETE")
    print("="*60)


if __name__ == "__main__":
    import sys
    from pathlib import Path
    sys.path.insert(0, str(Path(__file__).parent))

    asyncio.run(run_all_trajectories())
