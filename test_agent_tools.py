#!/usr/bin/env python3
"""
Test script for Astrology LangGraph Agent tool calling.

Tests realistic user questions and validates that the correct tools are called.
This simulates what a typical astrology chat user would ask.

Usage:
    python test_agent_tools.py
    python test_agent_tools.py --verbose
"""
import asyncio
import argparse
import sys
from pathlib import Path
from typing import Optional, List
from dataclasses import dataclass

sys.path.insert(0, str(Path(__file__).parent))

from dotenv import load_dotenv
load_dotenv()

from langchain_core.messages import HumanMessage, AIMessage, ToolMessage
from app.agents.graph_agent import AstrologyGraphAgent
from app.core.logging_config import logger


# Test user profile (Gemini Sun, Pisces Moon, Virgo Rising)
TEST_USER = {
    "id": "test-user-astro",
    "email": "luna@example.com",
    "name": "Luna",
    "birth_date": "1992-06-21",
    "birth_time": "08:45",
    "birth_location": "San Francisco, CA",
    "birth_latitude": 37.7749,
    "birth_longitude": -122.4194,
    "timezone": "America/Los_Angeles"
}

TEST_CHART = {
    "birth_date": "1992-06-21",
    "birth_time": "08:45:00",
    "latitude": 37.7749,
    "longitude": -122.4194,
    "timezone": "America/Los_Angeles",
    "planets": {
        "sun": {"sign": "Gemini", "position": 29.8, "house": 10},
        "moon": {"sign": "Pisces", "position": 15.2, "house": 6},
        "mercury": {"sign": "Cancer", "position": 8.4, "house": 11},
        "venus": {"sign": "Taurus", "position": 22.1, "house": 9},
        "mars": {"sign": "Aries", "position": 12.7, "house": 8},
        "jupiter": {"sign": "Virgo", "position": 5.3, "house": 12},
        "saturn": {"sign": "Aquarius", "position": 18.9, "house": 5},
        "uranus": {"sign": "Capricorn", "position": 16.4, "house": 4},
        "neptune": {"sign": "Capricorn", "position": 18.1, "house": 5},
        "pluto": {"sign": "Scorpio", "position": 21.6, "house": 3}
    },
    "houses": {
        "1": {"sign": "Virgo", "position": 12.0},
        "2": {"sign": "Libra", "position": 8.0},
        "3": {"sign": "Scorpio", "position": 9.0},
        "4": {"sign": "Sagittarius", "position": 14.0},
        "5": {"sign": "Capricorn", "position": 18.0},
        "6": {"sign": "Aquarius", "position": 17.0},
        "7": {"sign": "Pisces", "position": 12.0},
        "8": {"sign": "Aries", "position": 8.0},
        "9": {"sign": "Taurus", "position": 9.0},
        "10": {"sign": "Gemini", "position": 14.0},
        "11": {"sign": "Cancer", "position": 18.0},
        "12": {"sign": "Leo", "position": 17.0}
    },
    "ascendant": {"sign": "Virgo", "position": 12.0},
    "midheaven": {"sign": "Gemini", "position": 14.0}
}


@dataclass
class TestCase:
    """A test case for the astrology agent."""
    name: str
    question: str
    expected_tool: Optional[str]  # None = no tool, direct response
    description: str


# Realistic test cases organized by category
TEST_CASES: List[TestCase] = [
    # ==========================================
    # NATAL CHART QUESTIONS (No tools needed)
    # ==========================================
    TestCase(
        name="natal_sun_sign",
        question="What does it mean that I'm a Gemini?",
        expected_tool=None,
        description="Basic sun sign interpretation - no tools needed"
    ),
    TestCase(
        name="natal_moon_meaning",
        question="Can you tell me about my Pisces moon and how it affects my emotions?",
        expected_tool=None,
        description="Moon sign emotional interpretation"
    ),
    TestCase(
        name="natal_rising_sign",
        question="How does having Virgo rising influence how others see me?",
        expected_tool=None,
        description="Ascendant/rising sign interpretation"
    ),
    TestCase(
        name="natal_venus_love",
        question="What does Venus in Taurus say about my love style?",
        expected_tool=None,
        description="Venus placement love interpretation"
    ),
    TestCase(
        name="natal_mars_energy",
        question="I have Mars in Aries. How should I channel my energy?",
        expected_tool=None,
        description="Mars placement energy interpretation"
    ),
    TestCase(
        name="natal_career",
        question="Based on my chart, what careers would suit me?",
        expected_tool=None,
        description="Career advice from natal chart"
    ),
    TestCase(
        name="natal_strengths",
        question="What are my biggest strengths according to my birth chart?",
        expected_tool=None,
        description="General natal chart strengths"
    ),

    # ==========================================
    # TRANSIT QUESTIONS (get_current_transits)
    # ==========================================
    TestCase(
        name="transit_today",
        question="What's happening in the stars for me today?",
        expected_tool="get_current_transits",
        description="Today's transits - should call transit tool"
    ),
    TestCase(
        name="transit_week",
        question="What should I expect this week astrologically?",
        expected_tool="get_current_transits",
        description="Weekly forecast - needs transits"
    ),
    TestCase(
        name="transit_energy",
        question="I'm feeling really anxious today. Is there anything in my transits causing this?",
        expected_tool="get_current_transits",
        description="Current feelings tied to transits"
    ),
    TestCase(
        name="transit_timing",
        question="Is now a good time to start a new project?",
        expected_tool="get_current_transits",
        description="Timing question - needs current transits"
    ),
    TestCase(
        name="transit_career_timing",
        question="When should I ask for a promotion? What do my transits say?",
        expected_tool="get_current_transits",
        description="Career timing question"
    ),
    TestCase(
        name="transit_love_timing",
        question="What's the current romantic energy in my chart?",
        expected_tool="get_current_transits",
        description="Love/romance transit check"
    ),
    TestCase(
        name="transit_mercury_retro",
        question="Is Mercury retrograde affecting me right now?",
        expected_tool="get_current_transits",
        description="Mercury retrograde impact"
    ),
    TestCase(
        name="transit_month",
        question="What should I focus on this month based on the planetary movements?",
        expected_tool="get_current_transits",
        description="Monthly focus from transits"
    ),

    # ==========================================
    # SYNASTRY QUESTIONS (analyze_synastry)
    # ==========================================
    TestCase(
        name="synastry_partner",
        question="I'm dating someone born on March 15, 1990. Are we compatible?",
        expected_tool="analyze_synastry",
        description="Basic compatibility check"
    ),
    TestCase(
        name="synastry_friend",
        question="My best friend was born November 8, 1991 in Chicago. Why do we get along so well?",
        expected_tool="analyze_synastry",
        description="Friendship synastry"
    ),
    TestCase(
        name="synastry_family",
        question="My mom is a Capricorn born January 5, 1965. Why do we clash sometimes?",
        expected_tool="analyze_synastry",
        description="Family relationship synastry"
    ),
    TestCase(
        name="synastry_new_relationship",
        question="I just met someone amazing. They're born July 22, 1988. What's our potential?",
        expected_tool="analyze_synastry",
        description="New relationship potential"
    ),
    TestCase(
        name="synastry_business",
        question="I'm thinking of starting a business with someone born September 30, 1985. Would we work well together?",
        expected_tool="analyze_synastry",
        description="Business partnership synastry"
    ),
    TestCase(
        name="synastry_challenges",
        question="What challenges might I face with a partner born on February 14, 1993?",
        expected_tool="analyze_synastry",
        description="Relationship challenges synastry"
    ),

    # ==========================================
    # CHART MEMORY/SEARCH (search_chart_memory)
    # ==========================================
    TestCase(
        name="chart_placements",
        question="What are all my planetary placements?",
        expected_tool="search_chart_memory",
        description="Request for full chart details"
    ),
    TestCase(
        name="chart_houses",
        question="Which houses are my planets in?",
        expected_tool="search_chart_memory",
        description="House placement query"
    ),

    # ==========================================
    # MIXED/COMPLEX QUESTIONS
    # ==========================================
    TestCase(
        name="mixed_love_advice",
        question="I'm a Gemini with Pisces moon. Any advice for my love life?",
        expected_tool=None,
        description="Love advice based on natal - no tools needed"
    ),
    TestCase(
        name="mixed_current_love",
        question="Is today a good day for a first date?",
        expected_tool="get_current_transits",
        description="Dating timing - needs transits"
    ),
    TestCase(
        name="general_astrology",
        question="What's the difference between sun signs and moon signs?",
        expected_tool=None,
        description="General astrology education question"
    ),
]


class TestRunner:
    """Runs test cases against the astrology agent."""

    def __init__(self, verbose: bool = False):
        self.verbose = verbose
        self.agent = AstrologyGraphAgent()
        self.results = []

    async def run_test(self, test: TestCase) -> dict:
        """Run a single test case."""
        print(f"\n{'='*60}")
        print(f"TEST: {test.name}")
        print(f"{'='*60}")
        print(f"📝 Question: {test.question}")
        print(f"🎯 Expected tool: {test.expected_tool or 'None (direct response)'}")
        print(f"📋 {test.description}")
        print("-" * 60)

        # Build graph
        graph = self.agent.build_graph(TEST_USER, TEST_CHART)

        # Track tool calls
        tool_calls_made = []
        full_response = ""

        try:
            # Stream through graph to capture tool calls
            async for event in graph.astream_events(
                {
                    "messages": [HumanMessage(content=test.question)],
                    "user_id": TEST_USER["id"],
                    "user_profile": TEST_USER,
                    "natal_chart": TEST_CHART,
                    "next_action": "",
                    "tool_outputs": [],
                    "tokens_used": 0,
                    "cost_usd": 0.0
                },
                version="v2"
            ):
                kind = event.get("event")

                # Capture tool calls
                if kind == "on_tool_start":
                    tool_name = event.get("name", "unknown")
                    tool_calls_made.append(tool_name)
                    print(f"   🔧 Tool called: {tool_name}")

                # Capture response
                if kind == "on_chat_model_stream":
                    chunk = event.get("data", {}).get("chunk")
                    if chunk and hasattr(chunk, 'content') and chunk.content:
                        full_response += chunk.content

            # Determine which tool was called (if any)
            actual_tool = tool_calls_made[0] if tool_calls_made else None

            # Check if test passed
            passed = actual_tool == test.expected_tool

            # Print result
            print(f"\n{'✅ PASSED' if passed else '❌ FAILED'}")
            print(f"   Expected: {test.expected_tool or 'None'}")
            print(f"   Actual:   {actual_tool or 'None'}")

            if self.verbose and full_response:
                print(f"\n   Response preview: {full_response[:200]}...")

            return {
                "name": test.name,
                "passed": passed,
                "expected": test.expected_tool,
                "actual": actual_tool,
                "tools_called": tool_calls_made,
                "response_length": len(full_response)
            }

        except Exception as e:
            print(f"\n❌ ERROR: {e}")
            return {
                "name": test.name,
                "passed": False,
                "expected": test.expected_tool,
                "actual": None,
                "error": str(e)
            }

    async def run_all_tests(self, categories: Optional[List[str]] = None):
        """Run all test cases."""
        print("\n" + "=" * 60)
        print("🌟 ASTROLOGY AGENT TOOL CALLING TEST SUITE 🌟")
        print("=" * 60)
        print(f"User: {TEST_USER['name']} (Sun: Gemini, Moon: Pisces, Rising: Virgo)")
        print(f"Total tests: {len(TEST_CASES)}")
        print("=" * 60)

        results = []

        for test in TEST_CASES:
            # Filter by category if specified
            if categories:
                if not any(cat in test.name for cat in categories):
                    continue

            result = await self.run_test(test)
            results.append(result)

            # Small delay between tests to avoid rate limiting
            await asyncio.sleep(0.5)

        # Print summary
        self._print_summary(results)

        return results

    def _print_summary(self, results: List[dict]):
        """Print test summary."""
        print("\n" + "=" * 60)
        print("📊 TEST SUMMARY")
        print("=" * 60)

        passed = sum(1 for r in results if r.get("passed"))
        failed = len(results) - passed

        print(f"Total:  {len(results)}")
        print(f"Passed: {passed} ✅")
        print(f"Failed: {failed} ❌")
        print(f"Rate:   {passed/len(results)*100:.1f}%")

        if failed > 0:
            print("\nFailed tests:")
            for r in results:
                if not r.get("passed"):
                    print(f"  - {r['name']}: expected '{r['expected']}', got '{r['actual']}'")

        # Group by expected tool
        print("\n" + "-" * 40)
        print("Results by tool:")

        tool_groups = {}
        for r in results:
            tool = r["expected"] or "direct"
            if tool not in tool_groups:
                tool_groups[tool] = {"passed": 0, "total": 0}
            tool_groups[tool]["total"] += 1
            if r.get("passed"):
                tool_groups[tool]["passed"] += 1

        for tool, stats in tool_groups.items():
            emoji = "✅" if stats["passed"] == stats["total"] else "⚠️"
            print(f"  {emoji} {tool}: {stats['passed']}/{stats['total']}")


async def run_single_test(test_name: str, verbose: bool = False):
    """Run a single test by name."""
    test = next((t for t in TEST_CASES if t.name == test_name), None)
    if not test:
        print(f"❌ Test '{test_name}' not found")
        print(f"Available tests: {[t.name for t in TEST_CASES]}")
        return

    runner = TestRunner(verbose=verbose)
    await runner.run_test(test)


async def run_category(category: str, verbose: bool = False):
    """Run tests in a specific category."""
    runner = TestRunner(verbose=verbose)
    await runner.run_all_tests(categories=[category])


def list_tests():
    """List all available tests."""
    print("\n📋 Available Test Cases:")
    print("=" * 60)

    current_category = ""
    for test in TEST_CASES:
        # Extract category from test name
        category = test.name.split("_")[0]
        if category != current_category:
            current_category = category
            print(f"\n{category.upper()}:")

        tool_indicator = f"→ {test.expected_tool}" if test.expected_tool else "→ direct"
        print(f"  {test.name}: {tool_indicator}")

    print("\n" + "-" * 40)
    print("Categories: natal, transit, synastry, chart, mixed, general")


def main():
    parser = argparse.ArgumentParser(
        description="Test Astrology Agent tool calling with realistic questions"
    )
    parser.add_argument(
        "--verbose", "-v",
        action="store_true",
        help="Show response previews"
    )
    parser.add_argument(
        "--test", "-t",
        type=str,
        help="Run a specific test by name"
    )
    parser.add_argument(
        "--category", "-c",
        type=str,
        help="Run tests in a specific category (natal, transit, synastry, chart, mixed)"
    )
    parser.add_argument(
        "--list", "-l",
        action="store_true",
        help="List all available tests"
    )

    args = parser.parse_args()

    if args.list:
        list_tests()
    elif args.test:
        asyncio.run(run_single_test(args.test, args.verbose))
    elif args.category:
        asyncio.run(run_category(args.category, args.verbose))
    else:
        runner = TestRunner(verbose=args.verbose)
        asyncio.run(runner.run_all_tests())


if __name__ == "__main__":
    main()
