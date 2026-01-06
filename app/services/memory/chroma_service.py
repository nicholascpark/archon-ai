"""
Chroma DB Service for Semantic Memory

Provides user-isolated vector storage for natal chart data and conversation memories.
Each user gets their own collection for multi-tenant data isolation.
"""
from typing import List, Dict, Optional, Any
import chromadb
from chromadb.config import Settings as ChromaSettings
from chromadb.utils import embedding_functions
from app.core.config import settings
from app.core.logging_config import logger
from app.services.embeddings import embeddings_service


class ChromaDBService:
    """Service for managing user-specific vector collections in Chroma DB"""

    def __init__(self):
        """Initialize Chroma DB client with persistent storage"""
        self.client = chromadb.PersistentClient(
            path=settings.CHROMA_PERSIST_DIRECTORY,
            settings=ChromaSettings(
                anonymized_telemetry=False,
                allow_reset=True
            )
        )
        logger.info(f"Initialized Chroma DB at {settings.CHROMA_PERSIST_DIRECTORY}")

    def get_user_collection_name(self, user_id: str) -> str:
        """
        Generate isolated collection name for a user.

        Args:
            user_id: User's unique ID

        Returns:
            Collection name: "user_{user_id}_astrology"
        """
        # Sanitize user_id for collection name (alphanumeric + underscore only)
        sanitized_id = "".join(c if c.isalnum() or c == "_" else "_" for c in user_id)
        return f"{settings.CHROMA_COLLECTION_PREFIX}{sanitized_id}_astrology"

    def get_or_create_user_collection(self, user_id: str):
        """
        Get or create a user's isolated vector collection.

        Args:
            user_id: User's unique ID

        Returns:
            ChromaDB collection instance
        """
        collection_name = self.get_user_collection_name(user_id)

        # Create custom embedding function that uses our OpenAI service
        embedding_function = embedding_functions.OpenAIEmbeddingFunction(
            api_key=settings.OPENAI_API_KEY,
            model_name=settings.EMBEDDING_MODEL
        )

        try:
            collection = self.client.get_or_create_collection(
                name=collection_name,
                embedding_function=embedding_function,
                metadata={
                    "user_id": user_id,
                    "description": "Natal chart data and conversation memories",
                    "distance_metric": settings.CHROMA_DISTANCE_METRIC
                }
            )
            logger.debug(f"Retrieved collection for user {user_id}")
            return collection

        except Exception as e:
            logger.error(f"Failed to get/create collection for user {user_id}: {e}")
            raise

    def add_documents(
        self,
        user_id: str,
        documents: List[str],
        metadatas: Optional[List[Dict[str, Any]]] = None,
        ids: Optional[List[str]] = None
    ) -> None:
        """
        Add documents to user's vector collection.

        Args:
            user_id: User's unique ID
            documents: List of text documents to store
            metadatas: Optional metadata for each document
            ids: Optional custom IDs (will generate if not provided)
        """
        collection = self.get_or_create_user_collection(user_id)

        # Generate IDs if not provided
        if ids is None:
            import uuid
            ids = [str(uuid.uuid4()) for _ in documents]

        # Ensure metadatas list exists
        if metadatas is None:
            metadatas = [{"user_id": user_id} for _ in documents]
        else:
            # Add user_id to all metadata entries for safety
            for metadata in metadatas:
                metadata["user_id"] = user_id

        try:
            collection.add(
                documents=documents,
                metadatas=metadatas,
                ids=ids
            )
            logger.info(f"Added {len(documents)} documents for user {user_id}")

        except Exception as e:
            logger.error(f"Failed to add documents for user {user_id}: {e}")
            raise

    def query(
        self,
        user_id: str,
        query_text: str,
        n_results: int = None,
        where: Optional[Dict[str, Any]] = None
    ) -> Dict[str, Any]:
        """
        Query user's vector collection with semantic search.

        Args:
            user_id: User's unique ID
            query_text: Text to search for
            n_results: Number of results to return (default: RAG_TOP_K from settings)
            where: Optional metadata filters

        Returns:
            Dictionary with keys: 'documents', 'metadatas', 'distances', 'ids'
        """
        collection = self.get_or_create_user_collection(user_id)

        if n_results is None:
            n_results = settings.RAG_TOP_K

        # Add user_id filter to ensure data isolation
        if where is None:
            where = {"user_id": user_id}
        else:
            where["user_id"] = user_id

        try:
            results = collection.query(
                query_texts=[query_text],
                n_results=n_results,
                where=where
            )

            # Filter by similarity threshold
            filtered_results = self._filter_by_similarity(results)

            logger.debug(
                f"Query for user {user_id} returned {len(filtered_results['documents'][0])} results"
            )
            return filtered_results

        except Exception as e:
            logger.error(f"Failed to query collection for user {user_id}: {e}")
            raise

    def _filter_by_similarity(self, results: Dict[str, Any]) -> Dict[str, Any]:
        """
        Filter results by minimum similarity threshold.

        Args:
            results: Raw Chroma query results

        Returns:
            Filtered results
        """
        if not results['distances'] or not results['distances'][0]:
            return results

        # Convert distances to similarities (cosine distance: 0 = identical, 2 = opposite)
        # Similarity = 1 - (distance / 2)
        similarities = [1 - (d / 2) for d in results['distances'][0]]

        # Filter based on threshold
        min_similarity = settings.RAG_MIN_SIMILARITY
        filtered_indices = [
            i for i, sim in enumerate(similarities)
            if sim >= min_similarity
        ]

        # Reconstruct results with filtered indices
        filtered_results = {
            'documents': [[results['documents'][0][i] for i in filtered_indices]],
            'metadatas': [[results['metadatas'][0][i] for i in filtered_indices]],
            'distances': [[results['distances'][0][i] for i in filtered_indices]],
            'ids': [[results['ids'][0][i] for i in filtered_indices]]
        }

        return filtered_results

    def delete_documents(
        self,
        user_id: str,
        ids: Optional[List[str]] = None,
        where: Optional[Dict[str, Any]] = None
    ) -> None:
        """
        Delete documents from user's collection.

        Args:
            user_id: User's unique ID
            ids: Specific document IDs to delete
            where: Metadata filter for deletion
        """
        collection = self.get_or_create_user_collection(user_id)

        # Ensure user_id filter for safety
        if where is not None:
            where["user_id"] = user_id

        try:
            collection.delete(ids=ids, where=where)
            logger.info(f"Deleted documents for user {user_id}")

        except Exception as e:
            logger.error(f"Failed to delete documents for user {user_id}: {e}")
            raise

    def delete_user_collection(self, user_id: str) -> None:
        """
        Completely delete a user's vector collection.
        Use with caution!

        Args:
            user_id: User's unique ID
        """
        collection_name = self.get_user_collection_name(user_id)

        try:
            self.client.delete_collection(name=collection_name)
            logger.warning(f"Deleted entire collection for user {user_id}")

        except Exception as e:
            logger.error(f"Failed to delete collection for user {user_id}: {e}")
            raise

    def get_collection_count(self, user_id: str) -> int:
        """
        Get number of documents in user's collection.

        Args:
            user_id: User's unique ID

        Returns:
            Number of documents
        """
        collection = self.get_or_create_user_collection(user_id)
        return collection.count()

    def list_all_collections(self) -> List[str]:
        """
        List all collections in the database.
        Useful for admin/debugging.

        Returns:
            List of collection names
        """
        collections = self.client.list_collections()
        return [col.name for col in collections]


# Global instance
chroma_service = ChromaDBService()
