"""
Groq LLM provider service using LangChain.

Provides access to Groq's free tier with llama3-70b model.
"""
from typing import List, Optional, Dict, Any
from langchain_groq import ChatGroq
from langchain_core.messages import BaseMessage, SystemMessage, HumanMessage, AIMessage
from app.core.config import settings
from app.core.logging_config import logger


class GroqProvider:
    """
    Groq LLM provider for chat completions with tool calling support.

    Uses Groq's free tier (rate-limited but generous).
    """

    def __init__(self):
        self.model = ChatGroq(
            api_key=settings.GROQ_API_KEY,
            model_name=settings.GROQ_MODEL,
            temperature=settings.GROQ_TEMPERATURE,
            max_tokens=settings.GROQ_MAX_TOKENS,
        )
        logger.info(f"Groq provider initialized with model: {settings.GROQ_MODEL}")

    def create_chat_completion(
        self,
        messages: List[BaseMessage],
        tools: Optional[List[Any]] = None,
        stream: bool = False
    ) -> Any:
        """
        Create a chat completion with optional tool calling.

        Args:
            messages: List of chat messages
            tools: Optional list of tools for the LLM to use
            stream: Whether to stream the response

        Returns:
            AI message response or stream iterator
        """
        try:
            if tools:
                # Bind tools to the model for tool calling
                llm_with_tools = self.model.bind_tools(tools)
                response = llm_with_tools.invoke(messages)
            else:
                if stream:
                    return self.model.stream(messages)
                else:
                    response = self.model.invoke(messages)

            return response

        except Exception as e:
            logger.error(f"Groq API error: {e}")
            raise

    async def acreate_chat_completion(
        self,
        messages: List[BaseMessage],
        tools: Optional[List[Any]] = None,
        stream: bool = False
    ) -> Any:
        """
        Async version of create_chat_completion.

        Args:
            messages: List of chat messages
            tools: Optional list of tools for the LLM to use
            stream: Whether to stream the response

        Returns:
            AI message response or async stream iterator
        """
        try:
            if tools:
                llm_with_tools = self.model.bind_tools(tools)
                response = await llm_with_tools.ainvoke(messages)
            else:
                if stream:
                    return self.model.astream(messages)
                else:
                    response = await self.model.ainvoke(messages)

            return response

        except Exception as e:
            logger.error(f"Groq API error (async): {e}")
            raise


# Global instance
groq_provider = GroqProvider()
