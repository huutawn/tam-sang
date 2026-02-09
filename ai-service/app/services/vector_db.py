"""
Vector Database Service for pgvector operations

Handles storing and querying CLIP embeddings in PostgreSQL with pgvector extension.
Used for image deduplication and cross-modal retrieval.
"""

import logging
import asyncio
from typing import List, Optional, Tuple
from uuid import UUID
import asyncpg
from pgvector.asyncpg import register_vector

from app.config import settings

logger = logging.getLogger(__name__)


class VectorDBService:
    """
    Service for interacting with pgvector database
    
    Features:
    - Store CLIP embeddings for proof images
    - Find similar images (deduplication)
    - Query embeddings by campaign
    """
    
    def __init__(self):
        self.pool: Optional[asyncpg.Pool] = None
        self._initialized = False
        logger.info("VectorDBService instance created")
    
    async def initialize(self):
        """Initialize database connection pool"""
        if self._initialized:
            return
            
        try:
            logger.info(f"Connecting to pgvector database: {settings.vector_db_host}:{settings.vector_db_port}/{settings.vector_db_name}")
            
            self.pool = await asyncpg.create_pool(
                host=settings.vector_db_host,
                port=settings.vector_db_port,
                database=settings.vector_db_name,
                user=settings.vector_db_user,
                password=settings.vector_db_password,
                min_size=2,
                max_size=10,
                init=self._init_connection
            )
            
            self._initialized = True
            logger.info("VectorDBService initialized successfully")
            
        except Exception as e:
            logger.error(f"Failed to initialize VectorDBService: {e}")
            raise
    
    async def _init_connection(self, conn: asyncpg.Connection):
        """Initialize pgvector extension for each connection"""
        await register_vector(conn)
    
    async def close(self):
        """Close database connection pool"""
        if self.pool:
            await self.pool.close()
            self._initialized = False
            logger.info("VectorDBService connection pool closed")
    
    async def store_embedding(
        self,
        campaign_id: UUID,
        image_url: str,
        embedding: List[float],
        perceptual_hash: Optional[str] = None
    ) -> UUID:
        """
        Store a CLIP embedding for a proof image
        
        Args:
            campaign_id: Campaign UUID
            image_url: URL of the image
            embedding: CLIP embedding vector (512 dimensions)
            perceptual_hash: Optional perceptual hash for fast lookup
            
        Returns:
            UUID of the stored embedding record
        """
        if not self._initialized:
            await self.initialize()
        
        try:
            async with self.pool.acquire() as conn:
                result = await conn.fetchrow(
                    """
                    INSERT INTO proof_embeddings (campaign_id, image_url, embedding, perceptual_hash)
                    VALUES ($1, $2, $3, $4)
                    RETURNING id
                    """,
                    campaign_id,
                    image_url,
                    embedding,
                    perceptual_hash
                )
                
                embedding_id = result['id']
                logger.info(f"Stored embedding {embedding_id} for campaign {campaign_id}")
                return embedding_id
                
        except Exception as e:
            logger.error(f"Failed to store embedding: {e}")
            raise
    
    async def find_similar(
        self,
        embedding: List[float],
        threshold: float = None,
        limit: int = 5,
        exclude_campaign_id: Optional[UUID] = None
    ) -> List[Tuple[UUID, str, float]]:
        """
        Find similar images using cosine similarity
        
        Args:
            embedding: Query embedding vector
            threshold: Similarity threshold (default from settings)
            limit: Maximum number of results
            exclude_campaign_id: Optionally exclude a specific campaign
            
        Returns:
            List of (id, image_url, similarity_score) tuples
        """
        if not self._initialized:
            await self.initialize()
        
        threshold = threshold or settings.similarity_threshold
        
        try:
            async with self.pool.acquire() as conn:
                if exclude_campaign_id:
                    results = await conn.fetch(
                        """
                        SELECT id, image_url, 1 - (embedding <=> $1) as similarity
                        FROM proof_embeddings
                        WHERE campaign_id != $2
                        AND 1 - (embedding <=> $1) >= $3
                        ORDER BY similarity DESC
                        LIMIT $4
                        """,
                        embedding,
                        exclude_campaign_id,
                        threshold,
                        limit
                    )
                else:
                    results = await conn.fetch(
                        """
                        SELECT id, image_url, 1 - (embedding <=> $1) as similarity
                        FROM proof_embeddings
                        WHERE 1 - (embedding <=> $1) >= $2
                        ORDER BY similarity DESC
                        LIMIT $3
                        """,
                        embedding,
                        threshold,
                        limit
                    )
                
                similar_images = [
                    (row['id'], row['image_url'], float(row['similarity']))
                    for row in results
                ]
                
                logger.info(f"Found {len(similar_images)} similar images above threshold {threshold}")
                return similar_images
                
        except Exception as e:
            logger.error(f"Failed to find similar embeddings: {e}")
            raise
    
    async def check_duplicate(
        self,
        embedding: List[float],
        perceptual_hash: Optional[str] = None
    ) -> Tuple[bool, Optional[str]]:
        """
        Check if an image is a duplicate
        
        Uses both perceptual hash (fast) and embedding similarity (accurate)
        
        Args:
            embedding: CLIP embedding of the image
            perceptual_hash: Optional perceptual hash for fast check
            
        Returns:
            Tuple of (is_duplicate: bool, matching_url: Optional[str])
        """
        if not self._initialized:
            await self.initialize()
        
        try:
            async with self.pool.acquire() as conn:
                # Fast check using perceptual hash
                if perceptual_hash:
                    hash_match = await conn.fetchrow(
                        """
                        SELECT image_url FROM proof_embeddings
                        WHERE perceptual_hash = $1
                        LIMIT 1
                        """,
                        perceptual_hash
                    )
                    if hash_match:
                        logger.warning(f"Duplicate detected via perceptual hash: {hash_match['image_url']}")
                        return True, hash_match['image_url']
                
                # Accurate check using embedding similarity (threshold 0.98 for near-exact match)
                similar = await self.find_similar(embedding, threshold=0.98, limit=1)
                if similar:
                    _, url, similarity = similar[0]
                    logger.warning(f"Duplicate detected via embedding (similarity={similarity:.4f}): {url}")
                    return True, url
                
                return False, None
                
        except Exception as e:
            logger.error(f"Failed to check duplicate: {e}")
            return False, None
    
    async def get_campaign_embedding_count(self, campaign_id: UUID) -> int:
        """Get the number of embeddings stored for a campaign"""
        if not self._initialized:
            await self.initialize()
        
        try:
            async with self.pool.acquire() as conn:
                result = await conn.fetchval(
                    "SELECT COUNT(*) FROM proof_embeddings WHERE campaign_id = $1",
                    campaign_id
                )
                return result
                
        except Exception as e:
            logger.error(f"Failed to get embedding count: {e}")
            return 0


# Singleton instance
vector_db_service = VectorDBService()
