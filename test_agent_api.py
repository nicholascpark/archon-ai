#!/usr/bin/env python3
"""
Test script for Archon AI agent tools.

Tests each tool with various scenarios to validate the agent's capabilities.
Run with: python test_agent_api.py
"""
import asyncio
import json
from datetime import datetime, timedelta

# Test configuration
TEST_USER_PROFILE = {
    "id": "test-user-001",
    "email": "test@archon.ai",
    "username": "TestUser",
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

# Computed natal chart (mock data matching the service output)
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
        "house_3": {"sign": "Scorpio", "position": 60.0},
        "house_4": {"sign": "Sagittarius", "position": 90.0},
        "house_5": {"sign": "Capricorn", "position": 120.0},
        "house_6": {"sign": "Aquarius", "position": 150.0},
        "house_7": {"sign": "Pisces", "position": 180.0},
        "house_8": {"sign": "Aries", "position": 210.0},
        "house_9": {"sign": "Taurus", "position": 240.0},
        "house_10": {"sign": "Gemini", "position": 270.0},
        "house_11": {"sign": "Cancer", "position": 300.0},
        "house_12": {"sign": "Leo", "position": 330.0}
    },
    "aspects": [
        {"planet1": "sun", "planet2": "moon", "aspect_type": "trine", "orb": 2.2},
        {"planet1": "venus", "planet2": "mars", "aspect_type": "sextile", "orb": 1.4},
    ],
    "computed_at": datetime.utcnow().isoformat()
}


async def test_get_current_transits():
    """Test the get_current_transits tool"""
    print("\n" + "="*60)
    print("TEST: get_current_transits")
    print("="*60)

    from app.agents.tools import get_current_transits, set_user_context

    # Set user context
    set_user_context(
        user_id=TEST_USER_PROFILE["id"],
        natal_chart_data=TEST_NATAL_CHART,
        user_profile=TEST_USER_PROFILE
    )

    # Test 1: Today's transits
    print("\n[Test 1] Today's transits:")
    result = get_current_transits.invoke({})
    print(result)

    # Test 2: Specific date
    print("\n[Test 2] Transits for next week:")
    next_week = (datetime.now() + timedelta(days=7)).strftime("%Y-%m-%d")
    result = get_current_transits.invoke({"date": next_week})
    print(result)

    return True


async def test_analyze_synastry():
    """Test the analyze_synastry tool"""
    print("\n" + "="*60)
    print("TEST: analyze_synastry")
    print("="*60)

    from app.agents.tools import analyze_synastry, set_user_context

    # Set user context
    set_user_context(
        user_id=TEST_USER_PROFILE["id"],
        natal_chart_data=TEST_NATAL_CHART,
        user_profile=TEST_USER_PROFILE
    )

    # Test: Synastry with a partner
    print("\n[Test] Synastry with partner born 1988-03-21:")
    result = analyze_synastry.invoke({
        "partner_birth_date": "1988-03-21",
        "partner_birth_time": "10:00:00",
        "partner_latitude": 40.7128,
        "partner_longitude": -74.0060
    })
    print(result)

    return True


async def test_search_chart_memory():
    """Test the search_chart_memory tool"""
    print("\n" + "="*60)
    print("TEST: search_chart_memory")
    print("="*60)

    from app.agents.tools import search_chart_memory, set_user_context

    # Set user context
    set_user_context(
        user_id=TEST_USER_PROFILE["id"],
        natal_chart_data=TEST_NATAL_CHART,
        user_profile=TEST_USER_PROFILE
    )

    # Test: Search for Sun placement
    print("\n[Test 1] Search for Sun placement:")
    result = search_chart_memory.invoke({"query": "Sun placement"})
    print(result)

    # Test: Search for Mars aspects
    print("\n[Test 2] Search for Mars aspects:")
    result = search_chart_memory.invoke({"query": "Mars aspects"})
    print(result)

    return True


async def test_get_onboarding_status():
    """Test the get_onboarding_status tool"""
    print("\n" + "="*60)
    print("TEST: get_onboarding_status")
    print("="*60)

    from app.agents.tools import get_onboarding_status, set_user_context

    # Test 1: Complete profile
    print("\n[Test 1] Complete profile:")
    set_user_context(
        user_id=TEST_USER_PROFILE["id"],
        natal_chart_data=TEST_NATAL_CHART,
        user_profile=TEST_USER_PROFILE
    )
    result = get_onboarding_status.invoke({})
    print(result)

    # Test 2: Incomplete profile
    print("\n[Test 2] Incomplete profile (no birth data):")
    incomplete_profile = {
        "id": "test-user-002",
        "email": "new@archon.ai",
        "username": "NewUser",
        "name": None,
        "gender": None,
        "birth_date": None,
        "birth_time": None,
        "needs_onboarding": True
    }
    set_user_context(
        user_id="test-user-002",
        natal_chart_data={},
        user_profile=incomplete_profile
    )
    result = get_onboarding_status.invoke({})
    print(result)

    return True


async def test_memory_tools():
    """Test the memory-related tools"""
    print("\n" + "="*60)
    print("TEST: Memory Tools (store_user_memory, search_user_memories)")
    print("="*60)

    from app.agents.tools import store_user_memory, search_user_memories, set_user_context

    set_user_context(
        user_id=TEST_USER_PROFILE["id"],
        natal_chart_data=TEST_NATAL_CHART,
        user_profile=TEST_USER_PROFILE
    )

    # Test 1: Store a memory
    print("\n[Test 1] Store a semantic memory:")
    try:
        result = await store_user_memory.ainvoke({
            "content": "User is a software engineer who works in tech",
            "memory_type": "semantic"
        })
        print(result)
    except Exception as e:
        print(f"Error (expected if memory service not fully initialized): {e}")

    # Test 2: Search memories
    print("\n[Test 2] Search memories:")
    try:
        result = await search_user_memories.ainvoke({
            "query": "career"
        })
        print(result)
    except Exception as e:
        print(f"Error (expected if memory service not fully initialized): {e}")

    return True


async def test_full_agent_flow():
    """Test a complete agent flow with graph execution"""
    print("\n" + "="*60)
    print("TEST: Full Agent Flow (graph execution)")
    print("="*60)

    from app.agents.graph_agent import astrology_graph_agent

    # Test various query types
    test_queries = [
        "What's my focus this week?",
        "Tell me about my Sun sign",
        "Am I compatible with someone born March 21, 1988?",
        "What's happening with my career?",
    ]

    for i, query in enumerate(test_queries, 1):
        print(f"\n[Query {i}]: {query}")
        print("-" * 40)

        try:
            response = await astrology_graph_agent.chat(
                message=query,
                user_profile=TEST_USER_PROFILE,
                natal_chart=TEST_NATAL_CHART
            )
            print(f"Response: {response[:500]}..." if len(response) > 500 else f"Response: {response}")
        except Exception as e:
            print(f"Error: {e}")

    return True


async def run_all_tests():
    """Run all tests"""
    print("\n" + "#"*60)
    print("ARCHON AI - AGENT TOOLS TEST SUITE")
    print("#"*60)
    print(f"Started at: {datetime.now().isoformat()}")

    results = {}

    # Run individual tool tests
    try:
        results["get_current_transits"] = await test_get_current_transits()
    except Exception as e:
        print(f"\n❌ get_current_transits failed: {e}")
        results["get_current_transits"] = False

    try:
        results["analyze_synastry"] = await test_analyze_synastry()
    except Exception as e:
        print(f"\n❌ analyze_synastry failed: {e}")
        results["analyze_synastry"] = False

    try:
        results["search_chart_memory"] = await test_search_chart_memory()
    except Exception as e:
        print(f"\n❌ search_chart_memory failed: {e}")
        results["search_chart_memory"] = False

    try:
        results["get_onboarding_status"] = await test_get_onboarding_status()
    except Exception as e:
        print(f"\n❌ get_onboarding_status failed: {e}")
        results["get_onboarding_status"] = False

    try:
        results["memory_tools"] = await test_memory_tools()
    except Exception as e:
        print(f"\n❌ memory_tools failed: {e}")
        results["memory_tools"] = False

    # Full agent flow test (requires LLM API key)
    try:
        results["full_agent_flow"] = await test_full_agent_flow()
    except Exception as e:
        print(f"\n❌ full_agent_flow failed: {e}")
        results["full_agent_flow"] = False

    # Summary
    print("\n" + "="*60)
    print("TEST RESULTS SUMMARY")
    print("="*60)

    for test_name, passed in results.items():
        status = "✅ PASSED" if passed else "❌ FAILED"
        print(f"  {test_name}: {status}")

    passed_count = sum(1 for v in results.values() if v)
    total_count = len(results)
    print(f"\nTotal: {passed_count}/{total_count} tests passed")

    return all(results.values())


if __name__ == "__main__":
    # Add the app to the path
    import sys
    from pathlib import Path
    sys.path.insert(0, str(Path(__file__).parent))

    # Run tests
    asyncio.run(run_all_tests())
