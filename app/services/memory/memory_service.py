"""
Long-term memory service for Archon AI using LangMem patterns.

Provides:
- User profile storage and retrieval
- Semantic memory (facts about user)
- Episodic memory (past interactions)
- Conversation summarization
- Memory-aware context building
- Background memory extraction (LangMem)

Designed to work with:
- SQLite (development)
- PostgreSQL + pgvector (production via Supabase)

Reference:
- LangMem SDK: https://langchain-ai.github.io/langmem/
"""
import asyncio
import uuid
from datetime import datetime
from typing import Optional, List, Dict, Any
from pydantic import BaseModel

from app.core.config import settings
from app.core.logging_config import logger
from app.services.memory.models import (
    UserProfile,
    Memory,
    MemoryType,
    ConversationSummary,
    MemorySearchResult,
    OnboardingState,
    Location,
    BirthData,
)
from app.services.memory.chroma_service import chroma_service
from app.services.memory.langmem_processor import (
    reflection_executor,
    MemoryExtractionResult,
    ExtractedMemory,
)


class MemoryService:
    """
    Long-term memory service for personalized astrology interactions.

    Memory hierarchy:
    1. Profile (always loaded) - identity, birth data, preferences
    2. Semantic (on-demand) - facts about user's life
    3. Episodic (on-demand) - past conversation highlights
    4. Summaries (archived) - compressed conversation history
    """

    def __init__(self):
        self.profiles: Dict[str, UserProfile] = {}  # In-memory cache
        self.memories: Dict[str, List[Memory]] = {}  # user_id -> memories
        self.summaries: Dict[str, List[ConversationSummary]] = {}
        self._initialized = False
        logger.info("MemoryService initialized")

    # ==========================================
    # Profile Management
    # ==========================================

    async def get_or_create_profile(self, user_id: str) -> UserProfile:
        """
        Get existing profile or create new one for user.

        Args:
            user_id: Unique user identifier

        Returns:
            UserProfile instance
        """
        if user_id in self.profiles:
            return self.profiles[user_id]

        # Create new profile
        profile = UserProfile(id=user_id)
        self.profiles[user_id] = profile
        logger.info(f"Created new profile for user {user_id}")

        return profile

    async def update_profile(
        self,
        user_id: str,
        updates: Dict[str, Any]
    ) -> UserProfile:
        """
        Update user profile with new data.

        Args:
            user_id: User ID
            updates: Dictionary of fields to update

        Returns:
            Updated UserProfile
        """
        profile = await self.get_or_create_profile(user_id)

        for field, value in updates.items():
            if hasattr(profile, field):
                setattr(profile, field, value)

        profile.updated_at = datetime.utcnow()
        self.profiles[user_id] = profile

        logger.info(f"Updated profile for user {user_id}: {list(updates.keys())}")
        return profile

    async def set_birth_data(
        self,
        user_id: str,
        birth_date: str,
        birth_time: Optional[str],
        city: str,
        latitude: float,
        longitude: float,
        timezone: str,
        time_unknown: bool = False
    ) -> UserProfile:
        """
        Set user's birth data for natal chart computation.

        Args:
            user_id: User ID
            birth_date: Date string (YYYY-MM-DD)
            birth_time: Time string (HH:MM) or None
            city: Birth city name
            latitude: Birth latitude
            longitude: Birth longitude
            timezone: Birth timezone
            time_unknown: Whether user confirmed they don't know time

        Returns:
            Updated profile
        """
        from datetime import date, time as dt_time

        location = Location(
            city=city,
            latitude=latitude,
            longitude=longitude,
            timezone=timezone
        )

        birth_data = BirthData(
            date=date.fromisoformat(birth_date),
            time=dt_time.fromisoformat(birth_time) if birth_time else None,
            location=location,
            time_unknown=time_unknown
        )

        profile = await self.update_profile(user_id, {"birth_data": birth_data})
        logger.info(f"Set birth data for user {user_id}: {city}, {birth_date}")

        return profile

    async def set_current_location(
        self,
        user_id: str,
        city: str,
        latitude: float,
        longitude: float,
        timezone: str
    ) -> UserProfile:
        """
        Set user's current location for transit calculations.
        """
        location = Location(
            city=city,
            latitude=latitude,
            longitude=longitude,
            timezone=timezone
        )

        return await self.update_profile(user_id, {"current_location": location})

    def get_onboarding_state(self, user_id: str) -> OnboardingState:
        """
        Get current onboarding state for a user.

        Returns:
            OnboardingState with progress flags
        """
        profile = self.profiles.get(user_id)

        if not profile:
            return OnboardingState(user_id=user_id)

        return OnboardingState(
            user_id=user_id,
            has_name=profile.name is not None,
            has_gender=profile.gender is not None,
            has_birth_date=profile.birth_data is not None and profile.birth_data.date is not None,
            has_birth_time=profile.birth_data is not None and profile.birth_data.time is not None,
            has_birth_location=profile.birth_data is not None and profile.birth_data.location is not None,
            has_current_location=profile.current_location is not None
        )

    async def set_gender(self, user_id: str, gender: str) -> UserProfile:
        """
        Set user's gender for pronoun preferences.

        Args:
            user_id: User ID
            gender: Gender string (male, female, non_binary, other, prefer_not_to_say)

        Returns:
            Updated profile
        """
        from app.services.memory.models import Gender

        # Normalize gender input
        gender_map = {
            "male": Gender.MALE,
            "man": Gender.MALE,
            "boy": Gender.MALE,
            "he": Gender.MALE,
            "him": Gender.MALE,
            "he/him": Gender.MALE,
            "female": Gender.FEMALE,
            "woman": Gender.FEMALE,
            "girl": Gender.FEMALE,
            "she": Gender.FEMALE,
            "her": Gender.FEMALE,
            "she/her": Gender.FEMALE,
            "non-binary": Gender.NON_BINARY,
            "nonbinary": Gender.NON_BINARY,
            "non_binary": Gender.NON_BINARY,
            "they": Gender.NON_BINARY,
            "them": Gender.NON_BINARY,
            "they/them": Gender.NON_BINARY,
            "other": Gender.OTHER,
            "prefer not to say": Gender.PREFER_NOT_TO_SAY,
            "prefer_not_to_say": Gender.PREFER_NOT_TO_SAY,
        }

        normalized = gender_map.get(gender.lower().strip(), Gender.PREFER_NOT_TO_SAY)
        return await self.update_profile(user_id, {"gender": normalized})

    # ==========================================
    # Memory Storage & Retrieval
    # ==========================================

    async def store_memory(
        self,
        user_id: str,
        content: str,
        memory_type: MemoryType,
        metadata: Optional[Dict[str, Any]] = None,
        conversation_id: Optional[str] = None
    ) -> Memory:
        """
        Store a new memory for the user.

        Args:
            user_id: User ID
            content: Memory content
            memory_type: Type of memory (semantic, episodic, procedural)
            metadata: Additional metadata
            conversation_id: Source conversation ID

        Returns:
            Created Memory object
        """
        memory = Memory(
            id=str(uuid.uuid4()),
            user_id=user_id,
            type=memory_type,
            content=content,
            metadata=metadata or {},
            source_conversation_id=conversation_id
        )

        # Store in local cache
        if user_id not in self.memories:
            self.memories[user_id] = []
        self.memories[user_id].append(memory)

        # Also store in vector DB for semantic search
        await self._store_memory_vector(memory)

        logger.info(f"Stored {memory_type} memory for user {user_id}")
        return memory

    async def _store_memory_vector(self, memory: Memory):
        """Store memory in Chroma for vector search."""
        try:
            chroma_service.add_documents(
                user_id=memory.user_id,
                documents=[memory.content],
                metadatas=[{
                    "memory_id": memory.id,
                    "memory_type": memory.type,
                    "user_id": memory.user_id,
                    "extracted_at": memory.extracted_at.isoformat(),
                    **memory.metadata
                }],
                ids=[memory.id]
            )
        except Exception as e:
            logger.warning(f"Failed to store memory vector: {e}")

    async def search_memories(
        self,
        user_id: str,
        query: str,
        memory_types: Optional[List[MemoryType]] = None,
        limit: int = 5
    ) -> List[MemorySearchResult]:
        """
        Search user's memories semantically.

        Args:
            user_id: User ID
            query: Search query
            memory_types: Filter by memory types
            limit: Max results

        Returns:
            List of MemorySearchResult with relevance scores
        """
        try:
            # Search vector DB
            results = chroma_service.query(
                user_id=user_id,
                query_text=query,
                n_results=limit
            )

            # Convert to MemorySearchResult
            search_results = []
            for i, doc in enumerate(results['documents'][0]):
                metadata = results['metadatas'][0][i]
                distance = results['distances'][0][i]

                # Filter by memory type if specified
                if memory_types and metadata.get('memory_type') not in [t.value for t in memory_types]:
                    continue

                # Find or create Memory object
                memory = await self._get_memory_by_id(user_id, metadata.get('memory_id'))
                if memory:
                    # Convert distance to relevance (0-1 scale)
                    relevance = 1 - (distance / 2)
                    search_results.append(MemorySearchResult(
                        memory=memory,
                        relevance_score=relevance
                    ))

            logger.debug(f"Found {len(search_results)} memories for query: {query[:50]}")
            return search_results

        except Exception as e:
            logger.error(f"Memory search failed: {e}")
            return []

    async def _get_memory_by_id(self, user_id: str, memory_id: str) -> Optional[Memory]:
        """Get memory by ID from cache."""
        if user_id not in self.memories:
            return None

        for memory in self.memories[user_id]:
            if memory.id == memory_id:
                return memory
        return None

    def should_fetch_memories(self, query: str) -> bool:
        """
        Determine if we should fetch memories for this query.

        Only fetch for personal/historical questions to save tokens.
        """
        memory_triggers = [
            "remember", "last time", "you told me", "we discussed",
            "my situation", "going through", "mentioned before",
            "you said", "earlier", "before", "previously",
            "my life", "my career", "my relationship"
        ]
        query_lower = query.lower()
        return any(trigger in query_lower for trigger in memory_triggers)

    def should_store_memory(self, query: str, response: str) -> bool:
        """
        Determine if this interaction should create a memory.

        Store when user shares significant life information.
        """
        store_triggers = [
            "career", "job", "work", "promotion",
            "relationship", "partner", "dating", "married", "divorced",
            "moving", "moved", "relocating",
            "worried about", "anxious about", "excited about",
            "planning to", "thinking about", "considering",
            "health", "doctor", "pregnant", "baby",
            "money", "financial", "investment"
        ]
        query_lower = query.lower()
        return any(trigger in query_lower for trigger in store_triggers)

    # ==========================================
    # Conversation Summarization
    # ==========================================

    async def summarize_conversation(
        self,
        user_id: str,
        messages: List[Dict[str, str]],
        conversation_id: str
    ) -> ConversationSummary:
        """
        Create a compressed summary of a conversation.

        Args:
            user_id: User ID
            messages: List of messages [{role, content}]
            conversation_id: Conversation ID

        Returns:
            ConversationSummary
        """
        # For now, create a simple summary
        # In production, use LLM to generate intelligent summary
        summary_text = f"Conversation with {len(messages)} messages"
        key_topics = self._extract_topics(messages)

        summary = ConversationSummary(
            id=str(uuid.uuid4()),
            user_id=user_id,
            summary=summary_text,
            key_topics=key_topics,
            insights_extracted=[],
            message_count=len(messages),
            started_at=datetime.utcnow(),
            ended_at=datetime.utcnow()
        )

        # Store summary
        if user_id not in self.summaries:
            self.summaries[user_id] = []
        self.summaries[user_id].append(summary)

        logger.info(f"Created conversation summary for user {user_id}")
        return summary

    def _extract_topics(self, messages: List[Dict[str, str]]) -> List[str]:
        """Extract key topics from messages (simple keyword extraction)."""
        topic_keywords = [
            "transit", "career", "relationship", "love", "money",
            "health", "family", "saturn return", "mercury retrograde",
            "natal chart", "compatibility", "synastry"
        ]

        found_topics = set()
        for msg in messages:
            content = msg.get('content', '').lower()
            for topic in topic_keywords:
                if topic in content:
                    found_topics.add(topic)

        return list(found_topics)

    # ==========================================
    # Context Building
    # ==========================================

    async def build_memory_context(
        self,
        user_id: str,
        query: str
    ) -> Dict[str, Any]:
        """
        Build context from memories for the current query.

        Returns a dictionary with relevant memories if needed.
        """
        context = {
            "profile": None,
            "memories": [],
            "has_memories": False
        }

        # Always include profile
        profile = await self.get_or_create_profile(user_id)
        context["profile"] = profile

        # Only search memories if query warrants it
        if self.should_fetch_memories(query):
            memories = await self.search_memories(user_id, query, limit=3)
            if memories:
                context["memories"] = memories
                context["has_memories"] = True
                logger.debug(f"Added {len(memories)} memories to context")

        return context

    def format_memories_for_prompt(self, memories: List[MemorySearchResult]) -> str:
        """Format memories for inclusion in system prompt."""
        if not memories:
            return ""

        memory_text = "\n\nRelevant memories about this user:\n"
        for result in memories:
            memory_text += f"- {result.memory.content}\n"

        return memory_text

    # ==========================================
    # Background Memory Extraction (LangMem)
    # ==========================================

    async def schedule_memory_extraction(
        self,
        user_id: str,
        messages: List[Dict[str, str]],
        delay_seconds: Optional[float] = None
    ) -> None:
        """
        Schedule background memory extraction for a conversation.

        Uses ReflectionExecutor for debounced processing - if the user
        continues chatting, pending extraction is canceled and rescheduled
        with the updated conversation.

        Args:
            user_id: User ID
            messages: Conversation in OpenAI format
            delay_seconds: Override default delay (default: 5 min)
        """
        await reflection_executor.submit(
            user_id=user_id,
            messages=messages,
            callback=self._handle_extraction_result,
            delay_seconds=delay_seconds
        )
        logger.debug(f"Scheduled memory extraction for user {user_id}")

    async def _handle_extraction_result(
        self,
        user_id: str,
        result: MemoryExtractionResult
    ) -> None:
        """
        Handle results from background memory extraction.

        Stores extracted memories and creates conversation summary.
        """
        conversation_id = str(uuid.uuid4())

        # Store each extracted memory
        for extracted in result.memories:
            # Map to our MemoryType enum
            mem_type = {
                "semantic": MemoryType.SEMANTIC,
                "episodic": MemoryType.EPISODIC,
                "procedural": MemoryType.PROCEDURAL
            }.get(extracted.memory_type, MemoryType.SEMANTIC)

            await self.store_memory(
                user_id=user_id,
                content=extracted.content,
                memory_type=mem_type,
                metadata={
                    "confidence": extracted.confidence,
                    "source_turn": extracted.source_turn,
                    "extracted_by": "langmem"
                },
                conversation_id=conversation_id
            )

        # Store conversation summary if provided
        if result.summary or result.key_topics:
            summary = ConversationSummary(
                id=conversation_id,
                user_id=user_id,
                summary=result.summary or f"Conversation about: {', '.join(result.key_topics)}",
                key_topics=result.key_topics,
                insights_extracted=[m.content for m in result.memories[:5]],
                message_count=0,  # Not tracked in this flow
                started_at=result.processed_at,
                ended_at=result.processed_at,
                memory_ids=[m.id for m in result.memories] if hasattr(result.memories[0], 'id') else []
            )

            if user_id not in self.summaries:
                self.summaries[user_id] = []
            self.summaries[user_id].append(summary)

        logger.info(
            f"Processed extraction for user {user_id}: "
            f"{len(result.memories)} memories, topics: {result.key_topics}"
        )

    async def consolidate_memories(
        self,
        user_id: str,
        memory_type: Optional[MemoryType] = None
    ) -> int:
        """
        Consolidate similar memories to reduce redundancy.

        Groups similar memories and merges them into single entries.
        This helps keep memory retrieval precise and reduces storage.

        Args:
            user_id: User ID
            memory_type: Optional filter by memory type

        Returns:
            Number of memories consolidated
        """
        if user_id not in self.memories:
            return 0

        memories = self.memories[user_id]
        if memory_type:
            memories = [m for m in memories if m.type == memory_type]

        if len(memories) < 2:
            return 0

        # Group memories by semantic similarity (simple approach)
        # In production, use vector similarity clustering
        consolidated = 0
        seen_topics = set()

        for memory in memories[:]:  # Copy list for safe iteration
            # Simple deduplication by content overlap
            content_words = set(memory.content.lower().split())

            for topic in seen_topics:
                topic_words = set(topic.lower().split())
                overlap = len(content_words & topic_words) / max(len(content_words), 1)

                if overlap > 0.7:  # 70% word overlap = likely duplicate
                    # Remove duplicate
                    if memory in self.memories[user_id]:
                        self.memories[user_id].remove(memory)
                        consolidated += 1
                    break
            else:
                seen_topics.add(memory.content)

        if consolidated > 0:
            logger.info(f"Consolidated {consolidated} memories for user {user_id}")

        return consolidated

    async def get_memory_stats(self, user_id: str) -> Dict[str, Any]:
        """
        Get statistics about a user's memory store.

        Returns:
            Dict with memory counts by type, total size, etc.
        """
        stats = {
            "total_memories": 0,
            "by_type": {
                "semantic": 0,
                "episodic": 0,
                "procedural": 0
            },
            "total_summaries": 0,
            "pending_extractions": reflection_executor.get_pending_count()
        }

        if user_id in self.memories:
            memories = self.memories[user_id]
            stats["total_memories"] = len(memories)
            for mem in memories:
                mem_type = mem.type if isinstance(mem.type, str) else mem.type.value
                if mem_type in stats["by_type"]:
                    stats["by_type"][mem_type] += 1

        if user_id in self.summaries:
            stats["total_summaries"] = len(self.summaries[user_id])

        return stats


# Global instance
memory_service = MemoryService()
