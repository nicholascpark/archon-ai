"""
LangGraph agent for astrology conversations.

Uses LangGraph's StateGraph for proper agent orchestration with:
- State management
- Conditional routing
- Tool calling
- Middleware support (for future human-in-the-loop)
- Persistence capabilities

References:
- LangGraph Docs: https://docs.langchain.com/oss/python/langgraph/
- HITL Tutorial: https://medium.com/@kbdhunga/implementing-human-in-the-loop-with-langgraph-ccfde023385c
"""
from typing import TypedDict, Annotated, Sequence, Literal
from pathlib import Path
from langchain_core.messages import BaseMessage, HumanMessage, AIMessage, SystemMessage
from langgraph.graph import StateGraph, END, START
from langgraph.prebuilt import ToolNode
from langgraph.graph.message import add_messages

from app.agents.tools import AGENT_TOOLS, set_user_context
from app.agents.prompts import get_system_prompt
from app.services.llm.llm_provider import llm_provider
from app.core.logging_config import logger

# Path for the graph visualization
GRAPH_PNG_PATH = Path(__file__).parent.parent / "agent_graph.png"


class AstrologyAgentState(TypedDict):
    """
    State for the astrology agent graph.

    This state flows through all nodes and edges, maintaining conversation context.
    """
    # Messages history with automatic merging
    messages: Annotated[Sequence[BaseMessage], add_messages]

    # User context (loaded once per session)
    user_id: str
    user_profile: dict
    natal_chart: dict

    # Routing decision
    next_action: str  # "use_tools", "respond_directly", "end"

    # Tool results (if tools were called)
    tool_outputs: list

    # Metadata
    tokens_used: int
    cost_usd: float


class AstrologyGraphAgent:
    """
    LangGraph-based astrology agent.

    Graph flow:
    START → load_context → route_query → [use_tools | respond_directly] → generate_response → END

    Features:
    - Automatic state management
    - Conditional routing based on user query
    - Tool calling when needed
    - Support for middleware (HITL, logging, etc.)
    - Streaming capabilities
    """

    def __init__(self):
        self.tools = AGENT_TOOLS
        # Use LLM with fallback support for resilience
        self.llm = llm_provider.with_fallback()
        self.graph = None
        logger.info(f"AstrologyGraphAgent initialized with {llm_provider.provider_name}")

        # Generate graph visualization on init
        self._generate_graph_png()

    def build_graph(self, user_profile: dict, natal_chart: dict):
        """
        Build the LangGraph StateGraph for this user session.

        Args:
            user_profile: User's profile data
            natal_chart: User's natal chart data

        Returns:
            Compiled graph ready for execution
        """
        # Create state graph
        workflow = StateGraph(AstrologyAgentState)

        # Add nodes
        workflow.add_node("route_query", self.route_query_node)
        workflow.add_node("use_tools", self.use_tools_node)
        workflow.add_node("generate_response", self.generate_response_node)

        # Add edges
        workflow.add_edge(START, "route_query")

        # Conditional routing from route_query
        workflow.add_conditional_edges(
            "route_query",
            self.should_use_tools,
            {
                "use_tools": "use_tools",
                "respond_directly": "generate_response"
            }
        )

        # After using tools, generate response
        workflow.add_edge("use_tools", "generate_response")

        # End after generating response
        workflow.add_edge("generate_response", END)

        # Compile graph
        self.graph = workflow.compile()

        # Set user context for tools
        natal_summary = self._create_natal_summary(natal_chart)
        set_user_context(
            user_id=user_profile.get("id", ""),
            natal_chart_data=natal_chart,
            user_profile=user_profile
        )

        # Store context in instance for nodes to access
        self.user_profile = user_profile
        self.natal_chart = natal_chart
        self.natal_summary = natal_summary

        return self.graph

    def _generate_graph_png(self):
        """
        Generate PNG visualization of the agent graph.

        This creates a visual representation of the LangGraph workflow
        and saves it to app/agent_graph.png for documentation.
        """
        try:
            # Build a temporary graph just for visualization
            workflow = StateGraph(AstrologyAgentState)

            # Add nodes
            workflow.add_node("route_query", lambda x: x)
            workflow.add_node("use_tools", lambda x: x)
            workflow.add_node("generate_response", lambda x: x)

            # Add edges
            workflow.add_edge(START, "route_query")
            workflow.add_conditional_edges(
                "route_query",
                lambda x: x.get("next_action", "respond_directly"),
                {
                    "use_tools": "use_tools",
                    "respond_directly": "generate_response"
                }
            )
            workflow.add_edge("use_tools", "generate_response")
            workflow.add_edge("generate_response", END)

            # Compile and generate PNG
            temp_graph = workflow.compile()
            png_data = temp_graph.get_graph().draw_mermaid_png()

            # Save to app directory
            with open(GRAPH_PNG_PATH, 'wb') as f:
                f.write(png_data)

            logger.info(f"Graph visualization saved to {GRAPH_PNG_PATH}")

        except Exception as e:
            # Don't fail initialization if PNG generation fails
            logger.warning(f"Could not generate graph PNG: {e}")

    # Node implementations

    def route_query_node(self, state: AstrologyAgentState) -> dict:
        """
        Route the query to determine if tools are needed.

        Now ALWAYS routes to use_tools so the LLM can decide whether to:
        - Call update_user_profile for onboarding data
        - Call get_current_transits for timing questions
        - Call get_onboarding_status to check what's needed
        - Or just respond directly

        The LLM has the intelligence to decide - we shouldn't second-guess it.
        """
        messages = state["messages"]
        last_message = messages[-1].content if messages else ""

        logger.info(f"Routing query: {last_message[:100]}")

        # ALWAYS use tools - let the LLM decide what to call
        # This ensures profile updates, transits, etc. are all handled properly
        next_action = "use_tools"

        logger.info(f"Routing decision: {next_action}")

        return {
            "next_action": next_action,
            "tool_outputs": []
        }

    def should_use_tools(self, state: AstrologyAgentState) -> Literal["use_tools", "respond_directly"]:
        """
        Conditional edge function to determine routing.

        Returns:
            "use_tools" or "respond_directly"
        """
        return state["next_action"]

    async def use_tools_node(self, state: AstrologyAgentState) -> dict:
        """
        Execute tools based on the query.

        This node calls the appropriate tools (transits, synastry, memory search)
        and stores the results in state. Uses async to support async tools like
        update_user_profile.
        """
        messages = state["messages"]
        last_message = messages[-1].content if messages else ""

        logger.info("Executing tools node")

        # Bind tools to LLM and let it decide which to call
        llm_with_tools = self.llm.bind_tools(self.tools)

        # Get system prompt with user context
        system_prompt = get_system_prompt(self.user_profile, self.natal_summary)

        # Create messages with system prompt
        tool_messages = [
            SystemMessage(content=system_prompt),
            *messages
        ]

        # Invoke LLM with tools (async)
        response = await llm_with_tools.ainvoke(tool_messages)

        # Check if tools were called
        tool_outputs = []
        if hasattr(response, 'tool_calls') and response.tool_calls:
            logger.info(f"Tools called: {[tc['name'] for tc in response.tool_calls]}")

            # Execute tools (async to support async tools)
            tool_node = ToolNode(self.tools)
            tool_results = await tool_node.ainvoke({"messages": [response]})
            tool_outputs = tool_results.get("messages", [])

        return {
            "messages": [response] + tool_outputs,
            "tool_outputs": tool_outputs
        }

    async def generate_response_node(self, state: AstrologyAgentState) -> dict:
        """
        Generate final response to user.

        This node takes all context (including tool results) and generates
        a personalized astrological response.
        """
        messages = state["messages"]

        logger.info("Generating final response")

        # Get system prompt
        system_prompt = get_system_prompt(self.user_profile, self.natal_summary)

        # Create full message history with system prompt
        full_messages = [
            SystemMessage(content=system_prompt),
            *messages
        ]

        # Generate response (async)
        response = await self.llm.ainvoke(full_messages)

        logger.info("Response generated")

        return {
            "messages": [response],
            "tokens_used": state.get("tokens_used", 0) + 1000,  # Placeholder
            "cost_usd": state.get("cost_usd", 0.0) + 0.0001  # Placeholder
        }

    # Execution methods

    async def chat(
        self,
        message: str,
        user_profile: dict,
        natal_chart: dict,
        chat_history: list = None
    ) -> str:
        """
        Process a chat message through the graph.

        Args:
            message: User's message
            user_profile: User's profile data
            natal_chart: User's natal chart data
            chat_history: Previous messages

        Returns:
            Agent's response
        """
        # Build graph for this session
        graph = self.build_graph(user_profile, natal_chart)

        # Prepare messages
        if chat_history is None:
            chat_history = []

        messages = chat_history + [HumanMessage(content=message)]

        # Execute graph
        result = await graph.ainvoke({
            "messages": messages,
            "user_id": user_profile.get("id", ""),
            "user_profile": user_profile,
            "natal_chart": natal_chart,
            "next_action": "",
            "tool_outputs": [],
            "tokens_used": 0,
            "cost_usd": 0.0
        })

        # Extract final response
        final_messages = result["messages"]
        if final_messages:
            last_message = final_messages[-1]
            if isinstance(last_message, AIMessage):
                return last_message.content

        return "I'm sorry, I couldn't generate a response."

    async def chat_stream(self, message: str, user_profile: dict, natal_chart: dict, chat_history: list = None):
        """
        Stream responses through the graph.

        Args:
            message: User's message
            user_profile: User's profile data
            natal_chart: User's natal chart data
            chat_history: Previous messages

        Yields:
            Chunks of the agent's response
        """
        graph = self.build_graph(user_profile, natal_chart)

        if chat_history is None:
            chat_history = []

        messages = chat_history + [HumanMessage(content=message)]

        # Stream events from graph
        async for event in graph.astream_events(
            {
                "messages": messages,
                "user_id": user_profile.get("id", ""),
                "user_profile": user_profile,
                "natal_chart": natal_chart,
                "next_action": "",
                "tool_outputs": [],
                "tokens_used": 0,
                "cost_usd": 0.0
            },
            version="v1"
        ):
            kind = event.get("event")
            if kind == "on_chat_model_stream":
                content = event.get("data", {}).get("chunk", {}).content
                if content:
                    yield content

    def _create_natal_summary(self, natal_chart: dict) -> str:
        """Create concise natal chart summary for system prompt"""
        if not natal_chart:
            return "No chart data yet - user needs to provide birth info"

        planets = natal_chart.get("planets", {})

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
astrology_graph_agent = AstrologyGraphAgent()
