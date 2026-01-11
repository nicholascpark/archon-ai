"""
WebSocket route for real-time chat with the astrology agent.

This is the core of the user experience - users connect via WebSocket
and have a conversation with their personal AI astrologer.
"""
from fastapi import APIRouter, WebSocket, WebSocketDisconnect, Query
from typing import Dict
import json

from app.agents.graph_agent import astrology_graph_agent
from app.core.security import get_user_id_from_token
from app.core.logging_config import logger
from app.models.user import UserDB
from app.services.persistence.database import get_db_context
from langchain_core.messages import HumanMessage, AIMessage


async def generate_dynamic_welcome(
    user_profile: dict,
    natal_chart: dict,
    needs_onboarding: bool
) -> str:
    """
    Generate a dynamic, personalized welcome message using the LLM.

    For returning users: Greet by name, acknowledge chart placements, mention current transits.
    For new users: Warmly welcome and ask for their name.

    Args:
        user_profile: User's profile data
        natal_chart: User's natal chart data (may be None)
        needs_onboarding: Whether user needs to complete onboarding

    Returns:
        Dynamic welcome message from the agent
    """
    name = user_profile.get("name") or user_profile.get("username")

    if needs_onboarding:
        # New user - ask for name
        if name:
            opening_prompt = f"""The user {name} just connected. Welcome them back warmly.
            They still need to complete their birth info. Ask what their birthday is.
            Keep it to 2-3 sentences - be welcoming but concise."""
        else:
            opening_prompt = """A brand new user just connected to Archon.
            Welcome them warmly and introduce yourself briefly as their astrology guide.
            Ask for their name in a friendly way.
            Keep it to 2-3 sentences - be welcoming but concise."""
    else:
        # Returning user with complete profile
        natal_summary = astrology_graph_agent._create_natal_summary(natal_chart)
        opening_prompt = f"""Welcome back {name or 'friend'}!
        Their chart: {natal_summary}

        Give a warm, personalized greeting acknowledging their Sun/Moon signs.
        Mention 1-2 current transits affecting them today.
        Keep it to 2-3 sentences - warm and insightful."""

    try:
        # Build graph and generate response
        graph = astrology_graph_agent.build_graph(user_profile, natal_chart or {})

        result = await graph.ainvoke({
            "messages": [HumanMessage(content=opening_prompt)],
            "user_id": user_profile.get("id", ""),
            "user_profile": user_profile,
            "natal_chart": natal_chart or {},
            "next_action": "",
            "tool_outputs": [],
            "tokens_used": 0,
            "cost_usd": 0.0
        })

        # Extract response
        final_messages = result.get("messages", [])
        if final_messages:
            last_message = final_messages[-1]
            if isinstance(last_message, AIMessage):
                return last_message.content

        # Fallback to static message
        return _get_fallback_welcome(name, needs_onboarding, natal_chart)

    except Exception as e:
        logger.error(f"Error generating dynamic welcome: {e}")
        return _get_fallback_welcome(name, needs_onboarding, natal_chart)


def _get_fallback_welcome(name: str, needs_onboarding: bool, natal_chart: dict) -> str:
    """Fallback static welcome message if LLM fails."""
    if needs_onboarding:
        if name:
            return f"Hey {name}! Welcome to Archon. I'm your personal astrology guide. When's your birthday?"
        else:
            return "Welcome to Archon! I'm your personal astrology guide. What should I call you?"
    else:
        natal_summary = astrology_graph_agent._create_natal_summary(natal_chart) if natal_chart else ""
        greeting = f"Welcome back, {name}!" if name else "Welcome back!"
        if natal_summary:
            return f"{greeting}\n\nYour chart: {natal_summary}\n\nWhat's on your mind today?"
        return f"{greeting}\n\nWhat would you like to explore today?"

router = APIRouter()


class ConnectionManager:
    """
    Manages WebSocket connections for users.

    Keeps track of active connections and user sessions.
    """

    def __init__(self):
        self.active_connections: Dict[str, WebSocket] = {}

    async def connect(self, user_id: str, websocket: WebSocket):
        """Accept WebSocket connection and store it"""
        await websocket.accept()
        self.active_connections[user_id] = websocket
        logger.info(f"WebSocket connected for user {user_id}")

    def disconnect(self, user_id: str):
        """Remove WebSocket connection"""
        if user_id in self.active_connections:
            del self.active_connections[user_id]
            logger.info(f"WebSocket disconnected for user {user_id}")

    async def send_message(self, user_id: str, message: dict):
        """Send a message to a specific user"""
        if user_id in self.active_connections:
            await self.active_connections[user_id].send_json(message)

    async def send_text(self, user_id: str, text: str):
        """Send text message to a specific user"""
        if user_id in self.active_connections:
            await self.active_connections[user_id].send_text(text)


# Global connection manager
manager = ConnectionManager()

# In-memory chat history storage (in production, use database or Redis)
chat_histories: Dict[str, list] = {}


@router.websocket("/chat")
async def websocket_chat(
    websocket: WebSocket,
    token: str = Query(..., description="JWT authentication token")
):
    """
    WebSocket endpoint for real-time astrological chat.

    Flow:
    1. Client connects with JWT token
    2. Server loads user profile + natal chart
    3. Chat begins - user sends messages, agent responds
    4. Agent has permanent access to user's birth data + chart

    Message Format (Client → Server):
    {
        "type": "message",
        "content": "What's my focus this week?"
    }

    Message Format (Server → Client):
    {
        "type": "response",
        "content": "Based on your transits...",
        "metadata": {
            "tokens_used": 450,
            "tools_called": ["get_current_transits"]
        }
    }
    """
    # Verify token and get user
    user_id = get_user_id_from_token(token)

    if not user_id:
        await websocket.close(code=1008, reason="Invalid authentication token")
        return

    # Load user from database
    with get_db_context() as db:
        user = db.query(UserDB).filter(UserDB.id == user_id).first()

        if not user:
            await websocket.close(code=1008, reason="User not found")
            return

        # Load natal chart (may be None for new users)
        natal_chart_data = None
        if user.natal_chart_data:
            try:
                natal_chart_data = json.loads(user.natal_chart_data)
            except:
                pass

        # Check if user needs onboarding (no birth data yet)
        needs_onboarding = not (user.birth_date and user.birth_latitude and user.birth_longitude)

        # Prepare user profile dict
        user_profile = {
            "id": user.id,
            "email": user.email,
            "username": user.username,
            "name": user.name,
            "gender": user.gender,
            "birth_date": user.birth_date,
            "birth_time": user.birth_time,
            "birth_location": user.birth_location,
            "birth_latitude": user.birth_latitude,
            "birth_longitude": user.birth_longitude,
            "current_latitude": user.current_latitude,
            "current_longitude": user.current_longitude,
            "needs_onboarding": needs_onboarding
        }

    # Accept connection
    await manager.connect(user_id, websocket)

    # Initialize chat history for this user
    if user_id not in chat_histories:
        chat_histories[user_id] = []

    # Generate and send dynamic welcome message
    # This uses the LLM to create personalized greetings with current transits
    welcome_msg = await generate_dynamic_welcome(
        user_profile=user_profile,
        natal_chart=natal_chart_data,
        needs_onboarding=needs_onboarding
    )

    await manager.send_message(user_id, {
        "type": "welcome",
        "content": welcome_msg,
        "needs_onboarding": needs_onboarding
    })

    try:
        while True:
            # Receive message from client
            data = await websocket.receive_text()

            try:
                message_data = json.loads(data)
                message_type = message_data.get("type", "message")
                content = message_data.get("content", "")

                if not content:
                    continue

                logger.info(f"Received message from user {user_id}: {content[:100]}")

                # Add user message to history
                chat_histories[user_id].append(HumanMessage(content=content))

                # Limit chat history to last 10 messages (cost control)
                chat_histories[user_id] = chat_histories[user_id][-10:]

                # Send typing indicator
                await manager.send_message(user_id, {
                    "type": "typing",
                    "is_typing": True
                })

                # Get agent response with streaming (shows tool calls + response)
                try:
                    # Reload user data from database to get latest natal chart
                    # This is necessary because update_user_profile may have computed the natal chart
                    with get_db_context() as db:
                        fresh_user = db.query(UserDB).filter(UserDB.id == user_id).first()
                        if fresh_user:
                            # Update natal chart data if it exists now
                            if fresh_user.natal_chart_data:
                                try:
                                    natal_chart_data = json.loads(fresh_user.natal_chart_data)
                                except:
                                    pass
                            # Update user profile with latest data
                            user_profile = {
                                "id": fresh_user.id,
                                "email": fresh_user.email,
                                "username": fresh_user.username,
                                "name": fresh_user.name,
                                "gender": fresh_user.gender,
                                "birth_date": fresh_user.birth_date,
                                "birth_time": fresh_user.birth_time,
                                "birth_location": fresh_user.birth_location,
                                "birth_latitude": fresh_user.birth_latitude,
                                "birth_longitude": fresh_user.birth_longitude,
                                "current_latitude": fresh_user.current_latitude,
                                "current_longitude": fresh_user.current_longitude,
                                "needs_onboarding": not (fresh_user.birth_date and fresh_user.birth_latitude and fresh_user.birth_longitude)
                            }

                    # Build graph for this request
                    graph = astrology_graph_agent.build_graph(user_profile, natal_chart_data or {})

                    # Track streaming state
                    full_response = ""
                    stream_started = False

                    # Stream events from the graph
                    async for event in graph.astream_events(
                        {
                            "messages": chat_histories[user_id] + [HumanMessage(content=content)],
                            "user_id": user_id,
                            "user_profile": user_profile,
                            "natal_chart": natal_chart_data or {},
                            "next_action": "",
                            "tool_outputs": [],
                            "tokens_used": 0,
                            "cost_usd": 0.0
                        },
                        version="v2"
                    ):
                        kind = event.get("event")

                        # Tool call started - notify frontend
                        if kind == "on_tool_start":
                            tool_name = event.get("name", "unknown")
                            await manager.send_message(user_id, {
                                "type": "tool_call",
                                "tool": tool_name,
                                "status": "started"
                            })
                            logger.info(f"Tool started: {tool_name}")

                        # Tool call completed
                        elif kind == "on_tool_end":
                            tool_name = event.get("name", "unknown")
                            await manager.send_message(user_id, {
                                "type": "tool_call",
                                "tool": tool_name,
                                "status": "completed"
                            })

                        # Streaming response chunks
                        elif kind == "on_chat_model_stream":
                            chunk = event.get("data", {}).get("chunk")
                            if chunk and hasattr(chunk, 'content') and chunk.content:
                                # Start streaming if not already
                                if not stream_started:
                                    await manager.send_message(user_id, {
                                        "type": "stream_start"
                                    })
                                    stream_started = True

                                # Send chunk
                                await manager.send_message(user_id, {
                                    "type": "stream_chunk",
                                    "content": chunk.content
                                })
                                full_response += chunk.content

                    # End streaming
                    if stream_started:
                        await manager.send_message(user_id, {
                            "type": "stream_end"
                        })

                    # If no streaming occurred, send complete message
                    if not stream_started and full_response:
                        await manager.send_message(user_id, {
                            "type": "message",
                            "content": full_response
                        })

                    # Add to history if we got a response
                    if full_response:
                        chat_histories[user_id].append(HumanMessage(content=content))
                        chat_histories[user_id].append(AIMessage(content=full_response))

                    logger.info(f"Sent response to user {user_id}")

                except Exception as e:
                    logger.error(f"Agent error for user {user_id}: {e}")
                    await manager.send_message(user_id, {
                        "type": "error",
                        "content": "I encountered an error processing your message. Please try again."
                    })

            except json.JSONDecodeError:
                # Handle plain text messages
                await manager.send_message(user_id, {
                    "type": "error",
                    "content": "Invalid message format. Please send JSON."
                })

    except WebSocketDisconnect:
        manager.disconnect(user_id)
        logger.info(f"WebSocket disconnected for user {user_id}")

    except Exception as e:
        logger.error(f"WebSocket error for user {user_id}: {e}")
        manager.disconnect(user_id)


@router.get("/active-connections")
async def get_active_connections():
    """
    Get count of active WebSocket connections (admin endpoint).
    """
    return {
        "active_connections": len(manager.active_connections),
        "user_ids": list(manager.active_connections.keys())
    }
