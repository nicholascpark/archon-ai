"""
LangMem-based background memory processor for Archon AI.

Uses LangMem SDK patterns for:
- Automatic memory extraction from conversations
- Debounced background processing (ReflectionExecutor)
- Memory consolidation and deduplication
- Integration with existing Chroma storage

Reference: https://langchain-ai.github.io/langmem/
"""
import asyncio
from typing import List, Dict, Any, Optional
from datetime import datetime
import threading
from collections import defaultdict

from pydantic import BaseModel, Field

from app.core.config import settings
from app.core.logging_config import logger

# LangMem imports - wrapped for graceful fallback
try:
    from langmem import create_memory_manager
    LANGMEM_AVAILABLE = True
except ImportError:
    LANGMEM_AVAILABLE = False
    logger.warning("LangMem not installed. Using fallback memory extraction.")


class ExtractedMemory(BaseModel):
    """A memory extracted from conversation."""
    content: str
    memory_type: str = "semantic"  # semantic, episodic, procedural
    confidence: float = 0.8
    source_turn: Optional[int] = None


class MemoryExtractionResult(BaseModel):
    """Result of memory extraction from a conversation."""
    memories: List[ExtractedMemory] = Field(default_factory=list)
    summary: Optional[str] = None
    key_topics: List[str] = Field(default_factory=list)
    processed_at: datetime = Field(default_factory=datetime.utcnow)


class ReflectionExecutor:
    """
    Debounced background processor for memory extraction.

    Prevents redundant processing when messages arrive rapidly by:
    - Maintaining a queue of pending tasks per user
    - Canceling outdated tasks when new ones arrive
    - Delaying execution to capture full conversation context

    Reference: https://langchain-ai.github.io/langmem/guides/delayed_processing/
    """

    def __init__(self, default_delay_seconds: float = 300):  # 5 min default
        """
        Initialize the executor.

        Args:
            default_delay_seconds: Default delay before processing (seconds)
        """
        self.default_delay = default_delay_seconds
        self._pending_tasks: Dict[str, asyncio.Task] = {}
        self._lock = threading.Lock()
        logger.info(f"ReflectionExecutor initialized with {default_delay_seconds}s delay")

    async def submit(
        self,
        user_id: str,
        messages: List[Dict[str, str]],
        callback: callable,
        delay_seconds: Optional[float] = None
    ) -> None:
        """
        Submit a conversation for background memory extraction.

        If there's already a pending task for this user, cancel it
        and schedule a new one with the updated conversation.

        Args:
            user_id: User identifier
            messages: Conversation messages in OpenAI format
            callback: Async function to call with extraction results
            delay_seconds: Override default delay
        """
        delay = delay_seconds or self.default_delay

        with self._lock:
            # Cancel existing task for this user
            if user_id in self._pending_tasks:
                existing_task = self._pending_tasks[user_id]
                if not existing_task.done():
                    existing_task.cancel()
                    logger.debug(f"Canceled pending extraction for user {user_id}")

            # Schedule new task
            task = asyncio.create_task(
                self._delayed_process(user_id, messages, callback, delay)
            )
            self._pending_tasks[user_id] = task
            logger.debug(f"Scheduled extraction for user {user_id} in {delay}s")

    async def _delayed_process(
        self,
        user_id: str,
        messages: List[Dict[str, str]],
        callback: callable,
        delay: float
    ) -> None:
        """Execute extraction after delay."""
        try:
            await asyncio.sleep(delay)

            logger.info(f"Starting memory extraction for user {user_id}")
            result = await extract_memories_from_conversation(messages)

            if result.memories:
                await callback(user_id, result)
                logger.info(
                    f"Extracted {len(result.memories)} memories for user {user_id}"
                )
            else:
                logger.debug(f"No memories extracted for user {user_id}")

        except asyncio.CancelledError:
            logger.debug(f"Extraction canceled for user {user_id}")
        except Exception as e:
            logger.error(f"Memory extraction failed for user {user_id}: {e}")
        finally:
            with self._lock:
                if user_id in self._pending_tasks:
                    del self._pending_tasks[user_id]

    def get_pending_count(self) -> int:
        """Get count of pending extraction tasks."""
        with self._lock:
            return len([t for t in self._pending_tasks.values() if not t.done()])


async def extract_memories_from_conversation(
    messages: List[Dict[str, str]],
    extraction_instructions: Optional[str] = None
) -> MemoryExtractionResult:
    """
    Extract memories from a conversation using LangMem or fallback.

    Args:
        messages: Conversation in OpenAI format [{"role": "user", "content": "..."}]
        extraction_instructions: Custom instructions for extraction

    Returns:
        MemoryExtractionResult with extracted memories
    """
    if LANGMEM_AVAILABLE:
        return await _extract_with_langmem(messages, extraction_instructions)
    else:
        return await _extract_with_fallback(messages)


async def _extract_with_langmem(
    messages: List[Dict[str, str]],
    instructions: Optional[str] = None
) -> MemoryExtractionResult:
    """
    Use LangMem SDK for intelligent memory extraction.

    LangMem uses an LLM to identify significant information
    and determine what should be stored as long-term memory.
    """
    try:
        from langchain_openai import ChatOpenAI

        # Default extraction instructions for astrology context
        default_instructions = """
        Extract noteworthy information about the user from this conversation.
        Focus on:

        SEMANTIC (facts about the user):
        - Career/profession information
        - Relationship status or significant relationships
        - Life circumstances (moving, health, finances)
        - Personal traits or challenges they mention
        - Goals or aspirations

        EPISODIC (significant experiences discussed):
        - Major life events they're going through
        - Emotional states or concerns expressed
        - Specific situations they asked about
        - Key insights or advice that resonated with them

        PROCEDURAL (preferences):
        - Communication preferences (brief vs detailed)
        - Topics they're most interested in
        - How they like information presented

        Do NOT extract:
        - General astrology questions (these are reference, not personal)
        - Birth data (already stored in profile)
        - Redundant information already known
        """

        # Create LangMem memory manager
        model = ChatOpenAI(
            model=settings.OPENAI_MODEL or "gpt-4o-mini",
            temperature=0
        )

        memory_manager = create_memory_manager(
            model,
            instructions=instructions or default_instructions,
            enable_inserts=True
        )

        # Extract memories
        result = await memory_manager.ainvoke({"messages": messages})

        # Parse LangMem output into our format
        memories = []
        for mem in result.get("memories", []):
            memories.append(ExtractedMemory(
                content=mem.get("content", str(mem)),
                memory_type=_classify_memory_type(mem),
                confidence=mem.get("confidence", 0.8)
            ))

        # Extract topics from conversation
        key_topics = _extract_topics_from_messages(messages)

        return MemoryExtractionResult(
            memories=memories,
            summary=result.get("summary"),
            key_topics=key_topics
        )

    except Exception as e:
        logger.error(f"LangMem extraction failed: {e}")
        # Fall back to simple extraction
        return await _extract_with_fallback(messages)


async def _extract_with_fallback(
    messages: List[Dict[str, str]]
) -> MemoryExtractionResult:
    """
    Simple keyword-based memory extraction fallback.

    Used when LangMem is not available or fails.
    """
    memories = []
    key_topics = set()

    # Keywords that suggest significant personal information
    semantic_triggers = {
        "career": ["work", "job", "career", "profession", "company", "boss", "coworker"],
        "relationship": ["partner", "spouse", "married", "dating", "relationship", "boyfriend", "girlfriend", "husband", "wife"],
        "life_event": ["moving", "pregnant", "baby", "divorce", "wedding", "graduated", "retired"],
        "health": ["health", "doctor", "surgery", "illness", "anxiety", "depression"],
        "financial": ["money", "salary", "debt", "investment", "bought", "sold"]
    }

    episodic_triggers = {
        "concern": ["worried", "anxious", "stressed", "afraid", "nervous"],
        "excitement": ["excited", "looking forward", "can't wait", "thrilled"],
        "decision": ["thinking about", "considering", "should i", "planning to"]
    }

    for msg in messages:
        if msg.get("role") != "user":
            continue

        content = msg.get("content", "").lower()

        # Check for semantic memories
        for topic, triggers in semantic_triggers.items():
            if any(t in content for t in triggers):
                key_topics.add(topic)
                # Extract the sentence containing the trigger
                for sentence in content.split('.'):
                    if any(t in sentence for t in triggers):
                        memories.append(ExtractedMemory(
                            content=sentence.strip().capitalize(),
                            memory_type="semantic",
                            confidence=0.6
                        ))
                        break

        # Check for episodic memories
        for emotion, triggers in episodic_triggers.items():
            if any(t in content for t in triggers):
                key_topics.add(emotion)
                memories.append(ExtractedMemory(
                    content=f"User expressed {emotion}: {content[:100]}",
                    memory_type="episodic",
                    confidence=0.5
                ))

    return MemoryExtractionResult(
        memories=memories[:10],  # Limit to 10 memories per conversation
        key_topics=list(key_topics)
    )


def _classify_memory_type(memory: Dict[str, Any]) -> str:
    """Classify a memory as semantic, episodic, or procedural."""
    content = str(memory.get("content", "")).lower()

    # Procedural indicators
    if any(word in content for word in ["prefer", "like", "want", "style"]):
        return "procedural"

    # Episodic indicators (time-specific)
    if any(word in content for word in ["discussed", "mentioned", "said", "asked about"]):
        return "episodic"

    # Default to semantic (facts)
    return "semantic"


def _extract_topics_from_messages(messages: List[Dict[str, str]]) -> List[str]:
    """Extract key astrology topics discussed in conversation."""
    topic_keywords = {
        "transit": ["transit", "transits", "current", "today", "now"],
        "natal_chart": ["natal", "birth chart", "my chart", "placement"],
        "relationship": ["compatible", "synastry", "relationship", "partner"],
        "career": ["career", "job", "work", "profession"],
        "saturn_return": ["saturn return", "saturn"],
        "mercury_retrograde": ["mercury retrograde", "retrograde"],
        "moon": ["moon", "emotions", "feelings"],
        "venus": ["venus", "love", "relationships", "beauty"],
        "mars": ["mars", "energy", "action", "drive"]
    }

    found_topics = set()
    full_text = " ".join(m.get("content", "") for m in messages).lower()

    for topic, keywords in topic_keywords.items():
        if any(kw in full_text for kw in keywords):
            found_topics.add(topic)

    return list(found_topics)


# Global executor instance
reflection_executor = ReflectionExecutor(
    default_delay_seconds=float(getattr(settings, 'MEMORY_EXTRACTION_DELAY', 300))
)
