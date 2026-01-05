"""
Simple LangChain agent for astrology conversations.

This is a straightforward agent that:
1. Has user's natal chart always loaded in context
2. Has access to 3 simple tools (transits, synastry, memory search)
3. Uses Groq LLM with tool calling
4. No complex state machines - just clean tool calling!
"""
from typing import Dict, Any, List, AsyncGenerator
from langchain_core.messages import BaseMessage, SystemMessage, HumanMessage, AIMessage
from langchain.agents import AgentExecutor, create_tool_calling_agent
from langchain_core.prompts import ChatPromptTemplate, MessagesPlaceholder

from app.agents.tools import AGENT_TOOLS, set_user_context
from app.agents.prompts import get_system_prompt
from app.services.llm.groq_provider import groq_provider
from app.core.logging_config import logger


class AstrologyAgent:
    """
    Simple astrology agent with tool calling.

    The agent always has access to the user's natal chart and profile.
    It can call tools as needed to answer questions about transits,
    synastry, or chart details.
    """

    def __init__(self):
        self.llm = groq_provider.model
        self.tools = AGENT_TOOLS
        logger.info("AstrologyAgent initialized")

    def create_agent_executor(
        self,
        user_profile: Dict[str, Any],
        natal_chart: Dict[str, Any]
    ) -> AgentExecutor:
        """
        Create an agent executor with user context.

        Args:
            user_profile: User's profile data
            natal_chart: User's natal chart data

        Returns:
            Configured AgentExecutor
        """
        # Set user context for tools
        natal_summary = self._create_natal_summary(natal_chart)
        set_user_context(
            user_id=user_profile.get("id", ""),
            natal_chart_data=natal_chart,
            user_profile=user_profile
        )

        # Create system prompt with user context
        system_prompt = get_system_prompt(user_profile, natal_summary)

        # Create prompt template
        prompt = ChatPromptTemplate.from_messages([
            ("system", system_prompt),
            MessagesPlaceholder(variable_name="chat_history"),
            ("human", "{input}"),
            MessagesPlaceholder(variable_name="agent_scratchpad")
        ])

        # Create agent
        agent = create_tool_calling_agent(self.llm, self.tools, prompt)

        # Create executor
        agent_executor = AgentExecutor(
            agent=agent,
            tools=self.tools,
            verbose=True,
            handle_parsing_errors=True,
            max_iterations=3  # Limit iterations to control costs
        )

        return agent_executor

    async def chat(
        self,
        message: str,
        user_profile: Dict[str, Any],
        natal_chart: Dict[str, Any],
        chat_history: List[BaseMessage] = None
    ) -> str:
        """
        Process a chat message and return response.

        Args:
            message: User's message
            user_profile: User's profile data
            natal_chart: User's natal chart data
            chat_history: Previous messages in conversation

        Returns:
            Agent's response
        """
        try:
            # Create agent executor with user context
            agent_executor = self.create_agent_executor(user_profile, natal_chart)

            # Prepare chat history
            if chat_history is None:
                chat_history = []

            # Invoke agent
            response = await agent_executor.ainvoke({
                "input": message,
                "chat_history": chat_history
            })

            # Extract output
            output = response.get("output", "I'm sorry, I couldn't process that request.")

            logger.info(f"Agent response generated for user {user_profile.get('id')}")
            return output

        except Exception as e:
            logger.error(f"Error in agent chat: {e}")
            return f"I encountered an error processing your request. Please try again."

    async def chat_stream(
        self,
        message: str,
        user_profile: Dict[str, Any],
        natal_chart: Dict[str, Any],
        chat_history: List[BaseMessage] = None
    ) -> AsyncGenerator[str, None]:
        """
        Process a chat message and stream the response.

        Args:
            message: User's message
            user_profile: User's profile data
            natal_chart: User's natal chart data
            chat_history: Previous messages in conversation

        Yields:
            Chunks of the agent's response
        """
        try:
            # Create agent executor
            agent_executor = self.create_agent_executor(user_profile, natal_chart)

            # Prepare chat history
            if chat_history is None:
                chat_history = []

            # Stream agent response
            async for event in agent_executor.astream_events(
                {"input": message, "chat_history": chat_history},
                version="v1"
            ):
                kind = event.get("event")
                if kind == "on_chat_model_stream":
                    content = event.get("data", {}).get("chunk", {}).content
                    if content:
                        yield content

        except Exception as e:
            logger.error(f"Error in agent chat stream: {e}")
            yield f"Error: {str(e)}"

    def _create_natal_summary(self, natal_chart: Dict[str, Any]) -> str:
        """
        Create a concise summary of the natal chart for the system prompt.

        Args:
            natal_chart: Full natal chart data

        Returns:
            Brief summary string (e.g., "Sun Aries 10H, Moon Cancer 1H, Rising Leo")
        """
        planets = natal_chart.get("planets", {})

        # Extract key placements
        sun = planets.get("sun", {})
        moon = planets.get("moon", {})
        mercury = planets.get("mercury", {})
        venus = planets.get("venus", {})
        mars = planets.get("mars", {})

        summary_parts = []

        if sun:
            summary_parts.append(f"Sun {sun.get('sign', '')} {sun.get('house', '')}H")
        if moon:
            summary_parts.append(f"Moon {moon.get('sign', '')} {moon.get('house', '')}H")
        if mercury:
            summary_parts.append(f"Mercury {mercury.get('sign', '')}")
        if venus:
            summary_parts.append(f"Venus {venus.get('sign', '')}")
        if mars:
            summary_parts.append(f"Mars {mars.get('sign', '')}")

        return ", ".join(summary_parts) if summary_parts else "Chart data available"


# Global agent instance
astrology_agent = AstrologyAgent()
