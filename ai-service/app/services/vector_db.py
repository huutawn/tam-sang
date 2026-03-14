"""
Vector database service for CLIP embeddings and duplicate lookup.

Day 3 focus:
- keep CLIP embeddings as one signal
- add perceptual-hash exact/near matching
- return a richer duplicate verdict instead of a single boolean
"""

import logging
from dataclasses import dataclass
from typing import List, Optional, Tuple
from uuid import UUID

import asyncpg
from pgvector.asyncpg import register_vector

from app.config import settings
from app.services.image_forensics import image_forensics_service

logger = logging.getLogger(__name__)


@dataclass(frozen=True)
class DuplicateLookupResult:
    is_duplicate: bool = False
    match_type: str = "none"
    risk_level: str = "none"
    matching_url: Optional[str] = None
    similarity: Optional[float] = None
    perceptual_similarity: Optional[float] = None
    notes: str = ""


class VectorDBService:
    """Store CLIP embeddings and query global duplicate evidence."""

    HASH_RECENT_LOOKUP_LIMIT = 200
    HASH_NEAR_DUPLICATE_THRESHOLD = 0.92
    EMBEDDING_MEDIUM_DUPLICATE_THRESHOLD = 0.985
    EMBEDDING_HIGH_DUPLICATE_THRESHOLD = 0.995

    def __init__(self):
        self.pool: Optional[asyncpg.Pool] = None
        self._initialized = False
        logger.info("VectorDBService instance created")

    async def initialize(self):
        """Initialize database connection pool."""
        if self._initialized:
            return

        logger.info(
            "Connecting to pgvector database: %s:%s/%s",
            settings.vector_db_host,
            settings.vector_db_port,
            settings.vector_db_name,
        )

        self.pool = await asyncpg.create_pool(
            host=settings.vector_db_host,
            port=settings.vector_db_port,
            database=settings.vector_db_name,
            user=settings.vector_db_user,
            password=settings.vector_db_password,
            min_size=2,
            max_size=10,
            init=self._init_connection,
        )

        self._initialized = True
        logger.info("VectorDBService initialized successfully")

    async def _init_connection(self, conn: asyncpg.Connection):
        await register_vector(conn)

    async def close(self):
        if self.pool:
            await self.pool.close()
            self._initialized = False
            logger.info("VectorDBService connection pool closed")

    async def store_embedding(
        self,
        campaign_id: UUID,
        image_url: str,
        embedding: List[float],
        perceptual_hash: Optional[str] = None,
    ) -> UUID:
        if not self._initialized:
            await self.initialize()

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
                perceptual_hash,
            )

            embedding_id = result["id"]
            logger.info("Stored embedding %s for campaign %s", embedding_id, campaign_id)
            return embedding_id

    async def find_similar(
        self,
        embedding: List[float],
        threshold: float | None = None,
        limit: int = 5,
        exclude_campaign_id: Optional[UUID] = None,
    ) -> List[Tuple[UUID, str, float]]:
        if not self._initialized:
            await self.initialize()

        threshold = threshold or settings.similarity_threshold

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
                    limit,
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
                    limit,
                )

        similar_images = [
            (row["id"], row["image_url"], float(row["similarity"]))
            for row in results
        ]
        logger.info("Found %s similar images above threshold %s", len(similar_images), threshold)
        return similar_images

    async def _find_hash_duplicate(self, perceptual_hash: str) -> DuplicateLookupResult:
        if not perceptual_hash:
            return DuplicateLookupResult()

        async with self.pool.acquire() as conn:
            exact_match = await conn.fetchrow(
                """
                SELECT image_url
                FROM proof_embeddings
                WHERE perceptual_hash = $1
                LIMIT 1
                """,
                perceptual_hash,
            )
            if exact_match:
                url = exact_match["image_url"]
                logger.warning("Duplicate detected via exact perceptual hash: %s", url)
                return DuplicateLookupResult(
                    is_duplicate=True,
                    match_type="exact_hash",
                    risk_level="high",
                    matching_url=url,
                    similarity=1.0,
                    perceptual_similarity=1.0,
                    notes="Anh trung hash perceptual chinh xac voi du lieu da luu.",
                )

            recent_hash_rows = await conn.fetch(
                """
                SELECT image_url, perceptual_hash
                FROM proof_embeddings
                WHERE perceptual_hash IS NOT NULL
                ORDER BY created_at DESC
                LIMIT $1
                """,
                self.HASH_RECENT_LOOKUP_LIMIT,
            )

        best_match: Optional[DuplicateLookupResult] = None
        for row in recent_hash_rows:
            comparison = image_forensics_service.compare_hashes(
                perceptual_hash,
                row["perceptual_hash"],
            )
            similarity = comparison["average_similarity"]
            if not comparison["is_near_duplicate"] or similarity < self.HASH_NEAR_DUPLICATE_THRESHOLD:
                continue

            candidate = DuplicateLookupResult(
                is_duplicate=True,
                match_type="near_hash",
                risk_level="medium",
                matching_url=row["image_url"],
                similarity=similarity,
                perceptual_similarity=similarity,
                notes=f"Anh co perceptual-hash rat gan du lieu cu ({similarity:.2%}).",
            )
            if best_match is None or (candidate.similarity or 0.0) > (best_match.similarity or 0.0):
                best_match = candidate

        if best_match:
            logger.warning(
                "Near-duplicate detected via perceptual hash (similarity=%.4f): %s",
                best_match.similarity or 0.0,
                best_match.matching_url,
            )
            return best_match

        return DuplicateLookupResult()

    async def check_duplicate(
        self,
        embedding: List[float],
        perceptual_hash: Optional[str] = None,
    ) -> DuplicateLookupResult:
        """
        Check if an image is a duplicate using multiple signals.

        Priority:
        1. exact/near perceptual hash
        2. very high embedding similarity
        """
        if not self._initialized:
            await self.initialize()

        try:
            hash_duplicate = await self._find_hash_duplicate(perceptual_hash or "")
            if hash_duplicate.is_duplicate:
                return hash_duplicate

            similar = await self.find_similar(
                embedding,
                threshold=self.EMBEDDING_MEDIUM_DUPLICATE_THRESHOLD,
                limit=1,
            )
            if similar:
                _, url, similarity = similar[0]
                risk_level = (
                    "high"
                    if similarity >= self.EMBEDDING_HIGH_DUPLICATE_THRESHOLD
                    else "medium"
                )
                logger.warning(
                    "Duplicate detected via CLIP embedding (similarity=%.4f): %s",
                    similarity,
                    url,
                )
                return DuplicateLookupResult(
                    is_duplicate=True,
                    match_type="embedding",
                    risk_level=risk_level,
                    matching_url=url,
                    similarity=similarity,
                    notes=f"Embedding CLIP rat gan voi du lieu cu ({similarity:.2%}).",
                )

            return DuplicateLookupResult()
        except Exception as exc:
            logger.error("Failed to check duplicate: %s", exc)
            return DuplicateLookupResult(
                is_duplicate=False,
                match_type="error",
                risk_level="unknown",
                notes=f"Loi duplicate lookup: {exc}",
            )

    async def get_campaign_embedding_count(self, campaign_id: UUID) -> int:
        if not self._initialized:
            await self.initialize()

        try:
            async with self.pool.acquire() as conn:
                result = await conn.fetchval(
                    "SELECT COUNT(*) FROM proof_embeddings WHERE campaign_id = $1",
                    campaign_id,
                )
                return result
        except Exception as exc:
            logger.error("Failed to get embedding count: %s", exc)
            return 0


vector_db_service = VectorDBService()
