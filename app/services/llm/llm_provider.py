"""
Multi-provider LLM service with fallback support.

Supports:
- OpenAI (GPT-4.1-nano, GPT-4o-mini) - Primary for tool calling
- Google Gemini (2.0 Flash) - Fallback
- Groq (Llama models) - Alternative
"""
from typing import List, Optional, Any
from langchain_core.language_models.chat_models import BaseChatModel
from langchain_core.messages import BaseMessage
from app.core.config import settings
from app.core.logging_config import logger


class LLMProvider:
    """
    Multi-provider LLM service with automatic fallback.

    Priority order:
    1. OpenAI (best tool calling)
    2. Gemini (free fallback)
    3. Groq (fast, cheap)
    """

    def __init__(self):
        self.primary_model: Optional[BaseChatModel] = None
        self.fallback_model: Optional[BaseChatModel] = None
        self.provider_name: str = "none"

        self._initialize_providers()

    def _initialize_providers(self):
        """Initialize LLM providers based on LLM_PROVIDER setting."""
        provider = settings.LLM_PROVIDER.lower()

        # Initialize based on selected provider
        if provider == "openai" and settings.OPENAI_API_KEY:
            self._init_openai()
        elif provider == "gemini" and settings.GOOGLE_API_KEY:
            self._init_gemini()
        elif provider == "groq" and settings.GROQ_API_KEY:
            self._init_groq()

        # Add fallbacks
        if self.primary_model and not self.fallback_model:
            if settings.GOOGLE_API_KEY and provider != "gemini":
                self._init_gemini(as_fallback=True)
            elif settings.GROQ_API_KEY and provider != "groq":
                self._init_groq(as_fallback=True)

        if self.primary_model is None:
            raise RuntimeError("No LLM provider available. Check API keys and LLM_PROVIDER in .env")

    def _init_openai(self, as_fallback=False):
        try:
            from langchain_openai import ChatOpenAI
            model = ChatOpenAI(
                api_key=settings.OPENAI_API_KEY,
                model=settings.OPENAI_MODEL,
                temperature=settings.LLM_TEMPERATURE,
                max_tokens=settings.LLM_MAX_TOKENS,
            )
            if as_fallback:
                self.fallback_model = model
                logger.info(f"Fallback LLM: OpenAI {settings.OPENAI_MODEL}")
            else:
                self.primary_model = model
                self.provider_name = "openai"
                logger.info(f"Primary LLM: OpenAI {settings.OPENAI_MODEL}")
        except Exception as e:
            logger.warning(f"Failed to initialize OpenAI: {e}")

    def _init_gemini(self, as_fallback=False):
        try:
            from langchain_google_genai import ChatGoogleGenerativeAI
            model = ChatGoogleGenerativeAI(
                api_key=settings.GOOGLE_API_KEY,
                model=settings.GEMINI_MODEL,
                temperature=settings.LLM_TEMPERATURE,
                max_tokens=settings.LLM_MAX_TOKENS,
            )
            if as_fallback:
                self.fallback_model = model
                logger.info(f"Fallback LLM: Gemini {settings.GEMINI_MODEL}")
            else:
                self.primary_model = model
                self.provider_name = "gemini"
                logger.info(f"Primary LLM: Gemini {settings.GEMINI_MODEL}")
        except Exception as e:
            logger.warning(f"Failed to initialize Gemini: {e}")

    def _init_groq(self, as_fallback=False):
        try:
            from langchain_groq import ChatGroq
            model = ChatGroq(
                api_key=settings.GROQ_API_KEY,
                model_name=settings.GROQ_MODEL,
                temperature=settings.LLM_TEMPERATURE,
                max_tokens=settings.LLM_MAX_TOKENS,
            )
            if as_fallback:
                self.fallback_model = model
                logger.info(f"Fallback LLM: Groq {settings.GROQ_MODEL}")
            else:
                self.primary_model = model
                self.provider_name = "groq"
                logger.info(f"Primary LLM: Groq {settings.GROQ_MODEL}")
        except Exception as e:
            logger.warning(f"Failed to initialize Groq: {e}")

    @property
    def model(self) -> BaseChatModel:
        """Get the primary model for direct use."""
        return self.primary_model

    def invoke(self, messages: List[BaseMessage], **kwargs) -> Any:
        """
        Invoke the LLM with automatic fallback on error.
        """
        try:
            return self.primary_model.invoke(messages, **kwargs)
        except Exception as e:
            logger.warning(f"Primary LLM failed: {e}")
            if self.fallback_model:
                logger.info("Falling back to secondary LLM")
                return self.fallback_model.invoke(messages, **kwargs)
            raise

    async def ainvoke(self, messages: List[BaseMessage], **kwargs) -> Any:
        """
        Async invoke with fallback.
        """
        try:
            return await self.primary_model.ainvoke(messages, **kwargs)
        except Exception as e:
            logger.warning(f"Primary LLM failed: {e}")
            if self.fallback_model:
                logger.info("Falling back to secondary LLM")
                return await self.fallback_model.ainvoke(messages, **kwargs)
            raise

    def bind_tools(self, tools: List[Any]) -> BaseChatModel:
        """
        Bind tools to the primary model.
        """
        return self.primary_model.bind_tools(tools)

    def with_fallback(self, tools: Optional[List[Any]] = None):
        """
        Get model with fallback chain for tool calling.
        """
        if tools:
            primary = self.primary_model.bind_tools(tools)
            if self.fallback_model:
                fallback = self.fallback_model.bind_tools(tools)
                return primary.with_fallbacks([fallback])
            return primary
        else:
            if self.fallback_model:
                return self.primary_model.with_fallbacks([self.fallback_model])
            return self.primary_model


# Global instance
llm_provider = LLMProvider()
