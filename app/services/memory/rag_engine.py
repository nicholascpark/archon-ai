"""
RAG (Retrieval-Augmented Generation) Engine

Manages natal chart data storage and retrieval for personalized astrological insights.
"""
from typing import List, Dict, Any, Optional
from datetime import datetime
import json
from app.core.logging_config import logger
from app.services.memory.chroma_service import chroma_service


class RAGEngine:
    """RAG engine for natal chart and conversation memory retrieval"""

    def __init__(self):
        """Initialize RAG engine with Chroma service"""
        self.chroma = chroma_service

    def store_natal_chart(
        self,
        user_id: str,
        natal_chart_data: Dict[str, Any]
    ) -> None:
        """
        Store natal chart data in vector database for semantic retrieval.

        Args:
            user_id: User's unique ID
            natal_chart_data: Full natal chart from Kerykeion
        """
        documents = []
        metadatas = []
        ids = []

        # Extract and store each planet placement
        if "planets" in natal_chart_data:
            for planet_name, planet_data in natal_chart_data["planets"].items():
                # Create descriptive text for embedding
                doc_text = self._format_planet_placement(planet_name, planet_data)
                documents.append(doc_text)
                metadatas.append({
                    "type": "planet_placement",
                    "category": "natal_chart",
                    "planet": planet_name,
                    "sign": planet_data.get("sign", ""),
                    "house": str(planet_data.get("house", "")),
                    "timestamp": datetime.utcnow().isoformat()
                })
                ids.append(f"{user_id}_planet_{planet_name}")

        # Store house cusps
        if "houses" in natal_chart_data:
            for i, house_data in enumerate(natal_chart_data["houses"], start=1):
                doc_text = self._format_house_cusp(i, house_data)
                documents.append(doc_text)
                metadatas.append({
                    "type": "house_cusp",
                    "category": "natal_chart",
                    "house_number": str(i),
                    "sign": house_data.get("sign", ""),
                    "timestamp": datetime.utcnow().isoformat()
                })
                ids.append(f"{user_id}_house_{i}")

        # Store major aspects
        if "aspects" in natal_chart_data:
            for aspect in natal_chart_data["aspects"]:
                doc_text = self._format_aspect(aspect)
                documents.append(doc_text)
                metadatas.append({
                    "type": "aspect",
                    "category": "natal_chart",
                    "aspect_type": aspect.get("type", ""),
                    "planet1": aspect.get("planet1", ""),
                    "planet2": aspect.get("planet2", ""),
                    "timestamp": datetime.utcnow().isoformat()
                })
                ids.append(f"{user_id}_aspect_{aspect.get('planet1')}_{aspect.get('planet2')}")

        # Store natal chart summary
        summary = self._create_chart_summary(natal_chart_data)
        documents.append(summary)
        metadatas.append({
            "type": "chart_summary",
            "category": "natal_chart",
            "timestamp": datetime.utcnow().isoformat()
        })
        ids.append(f"{user_id}_summary")

        # Add all documents to Chroma
        if documents:
            self.chroma.add_documents(
                user_id=user_id,
                documents=documents,
                metadatas=metadatas,
                ids=ids
            )
            logger.info(f"Stored {len(documents)} natal chart documents for user {user_id}")

    def _format_planet_placement(self, planet: str, data: Dict[str, Any]) -> str:
        """Format planet placement as natural text for embedding"""
        sign = data.get("sign", "Unknown")
        house = data.get("house", "Unknown")
        degree = data.get("position", 0)

        return (
            f"{planet} in {sign} in the {house} house at {degree:.2f} degrees. "
            f"This placement influences {planet.lower()}'s expression through {sign}'s qualities "
            f"and manifests in the {house} house life area."
        )

    def _format_house_cusp(self, house_num: int, data: Dict[str, Any]) -> str:
        """Format house cusp as natural text"""
        sign = data.get("sign", "Unknown")
        degree = data.get("position", 0)

        return (
            f"The {house_num} house cusp is in {sign} at {degree:.2f} degrees. "
            f"This house governs life themes expressed through {sign}'s energy."
        )

    def _format_aspect(self, aspect: Dict[str, Any]) -> str:
        """Format aspect as natural text"""
        planet1 = aspect.get("planet1", "")
        planet2 = aspect.get("planet2", "")
        aspect_type = aspect.get("type", "")
        orb = aspect.get("orb", 0)

        return (
            f"{planet1} forms a {aspect_type} aspect with {planet2} "
            f"with an orb of {orb:.2f} degrees. This creates a dynamic "
            f"relationship between these planetary energies."
        )

    def _create_chart_summary(self, chart_data: Dict[str, Any]) -> str:
        """Create overall chart summary"""
        sun = chart_data.get("planets", {}).get("Sun", {})
        moon = chart_data.get("planets", {}).get("Moon", {})
        ascendant = chart_data.get("planets", {}).get("Ascendant", {})

        sun_sign = sun.get("sign", "Unknown")
        moon_sign = moon.get("sign", "Unknown")
        rising_sign = ascendant.get("sign", "Unknown")

        return (
            f"Natal chart with Sun in {sun_sign}, Moon in {moon_sign}, "
            f"and {rising_sign} rising. The chart represents the blueprint "
            f"of personality, emotions, and life path."
        )

    def retrieve_chart_context(
        self,
        user_id: str,
        query: str,
        n_results: int = 3
    ) -> List[str]:
        """
        Retrieve relevant natal chart information based on query.

        Args:
            user_id: User's unique ID
            query: Search query (e.g., "Tell me about my Sun placement")
            n_results: Number of results to return

        Returns:
            List of relevant document texts
        """
        results = self.chroma.query(
            user_id=user_id,
            query_text=query,
            n_results=n_results,
            where={"category": "natal_chart"}
        )

        if results and results['documents'] and results['documents'][0]:
            logger.debug(f"Retrieved {len(results['documents'][0])} chart contexts for query: {query}")
            return results['documents'][0]

        logger.debug("No chart context found for query")
        return []

    def store_conversation_memory(
        self,
        user_id: str,
        message: str,
        role: str,
        metadata: Optional[Dict[str, Any]] = None
    ) -> None:
        """
        Store important conversation insights for future reference.

        Args:
            user_id: User's unique ID
            message: Message content
            role: 'user' or 'assistant'
            metadata: Additional metadata (topics, entities, etc.)
        """
        if metadata is None:
            metadata = {}

        metadata.update({
            "type": "conversation",
            "category": "memory",
            "role": role,
            "timestamp": datetime.utcnow().isoformat()
        })

        import uuid
        doc_id = f"{user_id}_conv_{uuid.uuid4()}"

        self.chroma.add_documents(
            user_id=user_id,
            documents=[message],
            metadatas=[metadata],
            ids=[doc_id]
        )

        logger.debug(f"Stored conversation memory for user {user_id}")

    def retrieve_conversation_context(
        self,
        user_id: str,
        query: str,
        n_results: int = 3
    ) -> List[str]:
        """
        Retrieve relevant past conversation insights.

        Args:
            user_id: User's unique ID
            query: Search query
            n_results: Number of results to return

        Returns:
            List of relevant conversation snippets
        """
        results = self.chroma.query(
            user_id=user_id,
            query_text=query,
            n_results=n_results,
            where={"category": "memory"}
        )

        if results and results['documents'] and results['documents'][0]:
            logger.debug(f"Retrieved {len(results['documents'][0])} conversation contexts")
            return results['documents'][0]

        return []

    def get_user_memory_stats(self, user_id: str) -> Dict[str, int]:
        """
        Get statistics about user's stored memories.

        Args:
            user_id: User's unique ID

        Returns:
            Dictionary with memory counts by category
        """
        total_count = self.chroma.get_collection_count(user_id)

        return {
            "total_documents": total_count,
            "user_id": user_id
        }

    def clear_user_memories(self, user_id: str, category: Optional[str] = None) -> None:
        """
        Clear user's memories, optionally filtered by category.

        Args:
            user_id: User's unique ID
            category: Optional category to delete (natal_chart, memory, etc.)
        """
        if category:
            self.chroma.delete_documents(
                user_id=user_id,
                where={"category": category}
            )
            logger.info(f"Cleared {category} memories for user {user_id}")
        else:
            self.chroma.delete_user_collection(user_id)
            logger.warning(f"Cleared ALL memories for user {user_id}")


# Global instance
rag_engine = RAGEngine()
