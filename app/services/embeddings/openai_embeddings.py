"""
OpenAI Embeddings Service

Provides text embeddings using OpenAI's text-embedding-3-small model.
Cost: ~$0.02 per 1M tokens (~$0.00009 per conversation)
"""
from typing import List
import openai
from tenacity import retry, stop_after_attempt, wait_exponential
from app.core.config import settings
from app.core.logging_config import logger


class OpenAIEmbeddingsService:
    """Service for generating text embeddings using OpenAI API"""

    def __init__(self):
        """Initialize OpenAI embeddings service"""
        self.client = openai.OpenAI(api_key=settings.OPENAI_API_KEY)
        self.model = settings.EMBEDDING_MODEL
        self.dimensions = settings.EMBEDDING_DIMENSIONS

    @retry(
        stop=stop_after_attempt(3),
        wait=wait_exponential(multiplier=1, min=2, max=10),
        reraise=True
    )
    def embed_text(self, text: str) -> List[float]:
        """
        Generate embedding for a single text string.

        Args:
            text: Text to embed

        Returns:
            List of floats representing the embedding vector

        Raises:
            Exception: If API call fails after retries
        """
        try:
            response = self.client.embeddings.create(
                model=self.model,
                input=text,
                dimensions=self.dimensions
            )
            embedding = response.data[0].embedding
            logger.debug(f"Generated embedding for text (length: {len(text)} chars)")
            return embedding

        except Exception as e:
            logger.error(f"Failed to generate embedding: {e}")
            raise

    @retry(
        stop=stop_after_attempt(3),
        wait=wait_exponential(multiplier=1, min=2, max=10),
        reraise=True
    )
    def embed_texts(self, texts: List[str]) -> List[List[float]]:
        """
        Generate embeddings for multiple texts in a single API call.

        Args:
            texts: List of texts to embed

        Returns:
            List of embedding vectors (one per text)

        Raises:
            Exception: If API call fails after retries
        """
        if not texts:
            return []

        try:
            response = self.client.embeddings.create(
                model=self.model,
                input=texts,
                dimensions=self.dimensions
            )
            embeddings = [data.embedding for data in response.data]
            logger.debug(f"Generated {len(embeddings)} embeddings")
            return embeddings

        except Exception as e:
            logger.error(f"Failed to generate batch embeddings: {e}")
            raise

    def embed_documents(self, documents: List[str]) -> List[List[float]]:
        """
        Convenience method for embedding multiple documents.

        Args:
            documents: List of document texts to embed

        Returns:
            List of embedding vectors
        """
        return self.embed_texts(documents)

    def embed_query(self, query: str) -> List[float]:
        """
        Convenience method for embedding a search query.

        Args:
            query: Query text to embed

        Returns:
            Embedding vector
        """
        return self.embed_text(query)


# Global instance
embeddings_service = OpenAIEmbeddingsService()
