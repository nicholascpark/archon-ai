#!/usr/bin/env python3
"""
CLI tool for the Archon AI Astrology Agent.

Features:
- Conversational onboarding (no forms!)
- Interactive chat with streaming responses
- Background memory extraction
- Persistent user profiles

Usage:
    python cli_agent.py              # Interactive mode (new or returning user)
    python cli_agent.py --user EMAIL # Load existing user by email
    python cli_agent.py --graph      # Generate graph PNG only
"""
import asyncio
import argparse
import sys
import uuid
from pathlib import Path

# Add project root to path
sys.path.insert(0, str(Path(__file__).parent))

from dotenv import load_dotenv
load_dotenv()

from langchain_core.messages import HumanMessage, AIMessage, ToolMessage

from app.agents.graph_agent import AstrologyGraphAgent
from app.agents.prompts import get_system_prompt
from app.services.memory import memory_service, OnboardingState
from app.services.astrology.kerykeion_service import kerykeion_service
from app.core.logging_config import logger


def print_header():
    """Print CLI header."""
    print("\n" + "=" * 60)
    print("       ARCHON AI - Your Personal Astrology Guide")
    print("=" * 60)
    print()


def print_welcome_new_user():
    """Print welcome message for new users."""
    print("  Welcome! I'm Archon, your personal astrology guide.")
    print()
    print("  To give you personalized insights, I'll need to know")
    print("  a bit about you. Just chat naturally - tell me your")
    print("  name, when and where you were born.")
    print()
    print("-" * 60)
    print("  Type anything to chat  |  'quit' to exit  |  'status' for profile")
    print("=" * 60)


def print_welcome_returning_user(profile):
    """Print welcome message for returning users."""
    name = profile.get_display_name()
    pronoun = profile.get_pronoun()

    print(f"  Welcome back, {name}!")

    if profile.natal_chart:
        planets = profile.natal_chart.get("planets", {})
        sun = planets.get("sun", {}).get("sign", "Unknown")
        moon = planets.get("moon", {}).get("sign", "Unknown")
        asc = profile.natal_chart.get("ascendant", {}).get("sign", "Unknown")
        print(f"  {sun} Sun | {moon} Moon | {asc} Rising")

    print()
    print("-" * 60)
    print("  Type anything to chat  |  'quit' to exit  |  'status' for profile")
    print("=" * 60)


def pretty_print_message(msg):
    """Pretty print a LangChain message."""
    if isinstance(msg, HumanMessage):
        print(f"\n You: {msg.content}")
    elif isinstance(msg, AIMessage):
        print(f"\n Archon: {msg.content}")
        if hasattr(msg, 'tool_calls') and msg.tool_calls:
            print(f"   [Tools: {[tc['name'] for tc in msg.tool_calls]}]")
    elif isinstance(msg, ToolMessage):
        print(f"\n [Tool {msg.name}]: {msg.content[:100]}...")


async def get_or_create_user(email: str = None) -> tuple:
    """
    Get existing user or create new one.

    Returns:
        (user_id, profile, is_new_user)
    """
    if email:
        # TODO: Look up user by email in database
        # For now, use email as user_id
        user_id = email.replace("@", "_at_").replace(".", "_")
    else:
        # Generate new user ID
        user_id = f"user_{uuid.uuid4().hex[:8]}"

    profile = await memory_service.get_or_create_profile(user_id)
    is_new = not profile.onboarding_complete

    return user_id, profile, is_new


async def compute_chart_if_ready(user_id: str, profile) -> dict:
    """
    Compute natal chart if we have enough data.

    Returns:
        Natal chart dict or empty dict if not ready
    """
    if profile.natal_chart:
        return profile.natal_chart

    if not profile.has_complete_birth_data():
        return {}

    try:
        birth_data = profile.birth_data
        chart = kerykeion_service.compute_natal_chart(
            birth_date=birth_data.date.isoformat(),
            birth_time=birth_data.time.isoformat() if birth_data.time else "12:00:00",
            latitude=birth_data.location.latitude,
            longitude=birth_data.location.longitude,
            name=profile.name or "User"
        )

        # Cache the chart
        await memory_service.update_profile(user_id, {
            "natal_chart": chart,
            "onboarding_complete": True
        })

        logger.info(f"Computed natal chart for user {user_id}")
        return chart

    except Exception as e:
        logger.error(f"Failed to compute chart: {e}")
        return {}


def get_onboarding_system_addition(state: OnboardingState) -> str:
    """Get system prompt addition for onboarding."""
    if state.is_complete:
        return ""

    missing = state.missing_required
    prompt = state.get_friendly_prompt()

    addition = f"""

IMPORTANT - ONBOARDING IN PROGRESS:
The user's profile is incomplete. Missing: {', '.join(missing)}

Your next suggested question: "{prompt}"

As you chat naturally, use the update_user_profile tool to save any personal
information they share (name, gender, birth date, birth time, birth location).

Be conversational - don't interrogate them. If they share multiple pieces of
info at once (e.g., "I'm Sarah, born June 15 1990 in NYC"), extract and save
each piece using the tool.

Once you have name, gender, birth date, and birth location, you can compute
their natal chart and provide personalized readings.
"""
    return addition


async def generate_opening(agent, graph, profile, onboarding_state):
    """Generate opening message based on user state."""
    print("\n Archon: ", end="", flush=True)

    if onboarding_state.is_complete and profile.natal_chart:
        # Returning user with complete profile
        opening_prompt = f"""Welcome back {profile.get_display_name()}!
        Give a warm, personalized greeting acknowledging their chart placements.
        Mention 1-2 current transits affecting them today.
        Keep it to 2-3 sentences."""
    else:
        # New user needing onboarding
        opening_prompt = """Welcome this new user warmly to Archon.
        Introduce yourself briefly as their astrology guide.
        Ask for their name in a friendly way.
        Keep it to 2-3 sentences - be welcoming but concise."""

    full_response = ""
    try:
        async for event in graph.astream_events(
            {
                "messages": [HumanMessage(content=opening_prompt)],
                "user_id": profile.id,
                "user_profile": profile.model_dump(),
                "natal_chart": profile.natal_chart or {},
                "next_action": "",
                "tool_outputs": [],
                "tokens_used": 0,
                "cost_usd": 0.0
            },
            version="v2"
        ):
            kind = event.get("event")
            if kind == "on_chat_model_stream":
                chunk = event.get("data", {}).get("chunk")
                if chunk and hasattr(chunk, 'content') and chunk.content:
                    print(chunk.content, end="", flush=True)
                    full_response += chunk.content

    except Exception as e:
        logger.error(f"Opening generation error: {e}")
        print("Hello! I'm Archon, your astrology guide. What's your name?")
        full_response = "Hello! I'm Archon, your astrology guide. What's your name?"

    print()
    return full_response


async def interactive_chat(user_email: str = None):
    """Run interactive chat with conversational onboarding."""
    print_header()

    # Get or create user
    user_id, profile, is_new = await get_or_create_user(user_email)
    onboarding_state = memory_service.get_onboarding_state(user_id)

    if is_new:
        print_welcome_new_user()
    else:
        print_welcome_returning_user(profile)

    # Initialize agent
    agent = AstrologyGraphAgent()
    natal_chart = profile.natal_chart or {}
    graph = agent.build_graph(profile.model_dump(), natal_chart)

    chat_history = []

    # Generate opening
    opening = await generate_opening(agent, graph, profile, onboarding_state)
    if opening:
        chat_history.append(AIMessage(content=opening))

    # Track conversation for background memory extraction
    conversation_messages = []

    while True:
        try:
            # Get user input
            user_input = input("\n You: ").strip()

            if not user_input:
                continue

            if user_input.lower() == 'quit':
                # Schedule background memory extraction before exit
                if conversation_messages:
                    await memory_service.schedule_memory_extraction(
                        user_id=user_id,
                        messages=conversation_messages,
                        delay_seconds=5  # Short delay for CLI
                    )
                    print("\n Saving conversation memories...")
                    await asyncio.sleep(6)  # Wait for extraction

                print("\n May the stars guide you. Goodbye!")
                break

            if user_input.lower() == 'status':
                state = memory_service.get_onboarding_state(user_id)
                print(f"\n Profile Status: {state.completion_percentage}% complete")
                if state.missing_required:
                    print(f"   Missing: {', '.join(state.missing_required)}")
                if profile.natal_chart:
                    print("   Natal chart: Computed")
                else:
                    print("   Natal chart: Not yet computed")
                stats = await memory_service.get_memory_stats(user_id)
                print(f"   Memories stored: {stats['total_memories']}")
                continue

            if user_input.lower() == 'clear':
                chat_history = []
                conversation_messages = []
                print(" Chat history cleared.")
                continue

            # Refresh profile and check if chart can be computed
            profile = await memory_service.get_or_create_profile(user_id)
            natal_chart = await compute_chart_if_ready(user_id, profile)
            onboarding_state = memory_service.get_onboarding_state(user_id)

            # Rebuild graph with updated context
            graph = agent.build_graph(profile.model_dump(), natal_chart)

            # Add user message to history
            messages = chat_history + [HumanMessage(content=user_input)]

            # Track for memory extraction
            conversation_messages.append({"role": "user", "content": user_input})

            print("\n Archon: ", end="", flush=True)

            # Stream response
            full_response = ""
            async for event in graph.astream_events(
                {
                    "messages": messages,
                    "user_id": user_id,
                    "user_profile": profile.model_dump(),
                    "natal_chart": natal_chart,
                    "next_action": "",
                    "tool_outputs": [],
                    "tokens_used": 0,
                    "cost_usd": 0.0
                },
                version="v2"
            ):
                kind = event.get("event")

                if kind == "on_chat_model_stream":
                    chunk = event.get("data", {}).get("chunk")
                    if chunk and hasattr(chunk, 'content') and chunk.content:
                        print(chunk.content, end="", flush=True)
                        full_response += chunk.content

                elif kind == "on_tool_start":
                    tool_name = event.get("name", "unknown")
                    if tool_name != "get_onboarding_status":
                        print(f"\n   [{tool_name}]", end="", flush=True)

                elif kind == "on_tool_end":
                    pass  # Don't print tool outputs

            print()

            # Update chat history
            if full_response:
                chat_history.append(HumanMessage(content=user_input))
                chat_history.append(AIMessage(content=full_response))
                conversation_messages.append({"role": "assistant", "content": full_response})

            # Check if profile was updated during conversation
            updated_profile = await memory_service.get_or_create_profile(user_id)
            if updated_profile.has_complete_birth_data() and not updated_profile.natal_chart:
                # Chart can now be computed!
                natal_chart = await compute_chart_if_ready(user_id, updated_profile)
                if natal_chart:
                    planets = natal_chart.get("planets", {})
                    sun = planets.get("sun", {}).get("sign", "Unknown")
                    moon = planets.get("moon", {}).get("sign", "Unknown")
                    print(f"\n   [Chart computed! {sun} Sun, {moon} Moon]")

        except KeyboardInterrupt:
            print("\n\n Interrupted. Goodbye!")
            break
        except Exception as e:
            print(f"\n Error: {e}")
            logger.exception("Chat error")


def generate_graph_png(output_path: str = "app/agent_graph.png"):
    """Generate PNG visualization of the graph."""
    print("Generating graph visualization...")

    agent = AstrologyGraphAgent()
    # Use empty profile/chart for visualization
    graph = agent.build_graph({}, {})

    try:
        png_data = graph.get_graph().draw_mermaid_png()

        with open(output_path, 'wb') as f:
            f.write(png_data)

        print(f" Graph PNG saved to: {output_path}")
        print(f"   Size: {len(png_data):,} bytes")
        return True
    except Exception as e:
        print(f" Failed to generate PNG: {e}")
        return False


def main():
    parser = argparse.ArgumentParser(
        description="CLI tool for the Archon AI Astrology Agent"
    )
    parser.add_argument(
        "--user", "-u",
        type=str,
        help="User email to load existing profile"
    )
    parser.add_argument(
        "--graph",
        action="store_true",
        help="Generate graph PNG visualization"
    )
    parser.add_argument(
        "--output", "-o",
        type=str,
        default="app/agent_graph.png",
        help="Output path for graph PNG"
    )

    args = parser.parse_args()

    if args.graph:
        generate_graph_png(args.output)
    else:
        asyncio.run(interactive_chat(args.user))


if __name__ == "__main__":
    main()
