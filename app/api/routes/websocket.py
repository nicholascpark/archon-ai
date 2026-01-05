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

        # Load natal chart
        natal_chart_data = None
        if user.natal_chart_data:
            try:
                natal_chart_data = json.loads(user.natal_chart_data)
            except:
                pass

        if not natal_chart_data:
            await websocket.close(code=1008, reason="Natal chart not available")
            return

        # Prepare user profile dict
        user_profile = {
            "id": user.id,
            "email": user.email,
            "username": user.username,
            "birth_date": user.birth_date,
            "birth_time": user.birth_time,
            "birth_location": user.birth_location,
            "current_latitude": user.current_latitude,
            "current_longitude": user.current_longitude
        }

    # Accept connection
    await manager.connect(user_id, websocket)

    # Initialize chat history for this user
    if user_id not in chat_histories:
        chat_histories[user_id] = []

    # Send welcome message
    from app.agents.prompts import get_welcome_message
    natal_summary = astrology_graph_agent._create_natal_summary(natal_chart_data)
    welcome_msg = get_welcome_message(natal_summary)

    await manager.send_message(user_id, {
        "type": "welcome",
        "content": welcome_msg
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

                # Get agent response (using LangGraph agent)
                try:
                    response = await astrology_graph_agent.chat(
                        message=content,
                        user_profile=user_profile,
                        natal_chart=natal_chart_data,
                        chat_history=chat_histories[user_id]
                    )

                    # Add assistant response to history
                    chat_histories[user_id].append(AIMessage(content=response))

                    # Send response to client
                    await manager.send_message(user_id, {
                        "type": "response",
                        "content": response,
                        "metadata": {
                            "timestamp": str(json.dumps({"now": True}))
                        }
                    })

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
