"""
CLIP Service for Local AI Embedding

Uses OpenAI CLIP model for:
- Computing image embeddings
- Computing text embeddings
- Cross-modal similarity (text-image relevance)
"""

import logging
import asyncio
from typing import List, Tuple, Optional
from PIL import Image
from io import BytesIO

import torch
from transformers import CLIPProcessor, CLIPModel

from app.config import settings

logger = logging.getLogger(__name__)


class ClipService:
    """
    Service for CLIP-based embeddings and similarity computation
    
    Features:
    - Image embedding computation
    - Text embedding computation
    - Text-image similarity scoring
    - Batch processing support
    """
    
    def __init__(self):
        self.model: Optional[CLIPModel] = None
        self.processor: Optional[CLIPProcessor] = None
        self.device = "cuda" if torch.cuda.is_available() else "cpu"
        self._initialized = False
        logger.info(f"ClipService instance created (device: {self.device})")
    
    def initialize(self):
        """Load CLIP model and processor"""
        if self._initialized:
            return
        
        try:
            logger.info(f"Loading CLIP model: {settings.clip_model_name}")
            
            self.model = CLIPModel.from_pretrained(settings.clip_model_name)
            self.processor = CLIPProcessor.from_pretrained(settings.clip_model_name)
            
            self.model.to(self.device)
            self.model.eval()  # Set to evaluation mode
            
            self._initialized = True
            logger.info(f"CLIP model loaded successfully on {self.device}")
            
        except Exception as e:
            logger.error(f"Failed to load CLIP model: {e}")
            raise
    
    def compute_image_embedding(self, image_bytes: bytes) -> List[float]:
        """
        Compute CLIP embedding for an image
        
        Args:
            image_bytes: Raw image bytes
            
        Returns:
            List of 512 floats representing the image embedding
        """
        if not self._initialized:
            self.initialize()
        
        try:
            # Load and preprocess image
            image = Image.open(BytesIO(image_bytes)).convert("RGB")
            inputs = self.processor(images=image, return_tensors="pt")
            inputs = {k: v.to(self.device) for k, v in inputs.items()}
            
            # Compute embedding
            with torch.no_grad():
                image_features = self.model.get_image_features(**inputs)
                # Normalize embedding
                image_features = image_features / image_features.norm(p=2, dim=-1, keepdim=True)
            
            embedding = image_features.squeeze().cpu().numpy().tolist()
            logger.debug(f"Computed image embedding: {len(embedding)} dimensions")
            return embedding
            
        except Exception as e:
            logger.error(f"Failed to compute image embedding: {e}")
            raise
    
    def compute_text_embedding(self, text: str) -> List[float]:
        """
        Compute CLIP embedding for text
        
        Args:
            text: Input text string
            
        Returns:
            List of 512 floats representing the text embedding
        """
        if not self._initialized:
            self.initialize()
        
        try:
            # Preprocess text
            inputs = self.processor(text=[text], return_tensors="pt", padding=True, truncation=True)
            inputs = {k: v.to(self.device) for k, v in inputs.items()}
            
            # Compute embedding
            with torch.no_grad():
                text_features = self.model.get_text_features(**inputs)
                # Normalize embedding
                text_features = text_features / text_features.norm(p=2, dim=-1, keepdim=True)
            
            embedding = text_features.squeeze().cpu().numpy().tolist()
            logger.debug(f"Computed text embedding: {len(embedding)} dimensions")
            return embedding
            
        except Exception as e:
            logger.error(f"Failed to compute text embedding: {e}")
            raise
    
    def calculate_similarity(
        self, 
        embedding1: List[float], 
        embedding2: List[float]
    ) -> float:
        """
        Calculate cosine similarity between two embeddings
        
        Args:
            embedding1: First embedding vector
            embedding2: Second embedding vector
            
        Returns:
            Cosine similarity score (0.0 to 1.0)
        """
        try:
            vec1 = torch.tensor(embedding1)
            vec2 = torch.tensor(embedding2)
            
            similarity = torch.nn.functional.cosine_similarity(
                vec1.unsqueeze(0), 
                vec2.unsqueeze(0)
            )
            
            return float(similarity.item())
            
        except Exception as e:
            logger.error(f"Failed to calculate similarity: {e}")
            return 0.0
    
    def check_text_image_relevance(
        self, 
        image_bytes: bytes, 
        text: str,
        threshold: float = 0.25  # CLIP similarity threshold for relevance
    ) -> Tuple[float, bool, str]:
        """
        Check if an image is relevant to the given text
        
        Args:
            image_bytes: Raw image bytes
            text: Text to compare against
            threshold: Minimum similarity for relevance
            
        Returns:
            Tuple of (similarity_score, is_relevant, reasoning)
        """
        if not self._initialized:
            self.initialize()
        
        try:
            # Compute embeddings
            image_embedding = self.compute_image_embedding(image_bytes)
            text_embedding = self.compute_text_embedding(text)
            
            # Calculate similarity
            similarity = self.calculate_similarity(image_embedding, text_embedding)
            is_relevant = similarity >= threshold
            
            # Generate reasoning
            if similarity >= 0.35:
                reasoning = f"Ảnh có độ liên quan CAO với nội dung (similarity: {similarity:.2%})"
            elif similarity >= 0.25:
                reasoning = f"Ảnh có độ liên quan TRUNG BÌNH với nội dung (similarity: {similarity:.2%})"
            elif similarity >= 0.15:
                reasoning = f"Ảnh có độ liên quan THẤP với nội dung (similarity: {similarity:.2%})"
            else:
                reasoning = f"Ảnh KHÔNG liên quan với nội dung (similarity: {similarity:.2%})"
            
            logger.info(f"Text-image relevance: {similarity:.4f}, relevant: {is_relevant}")
            return similarity, is_relevant, reasoning
            
        except Exception as e:
            logger.error(f"Failed to check text-image relevance: {e}")
            return 0.0, False, f"Lỗi khi kiểm tra: {str(e)}"
    
    def compute_batch_image_embeddings(
        self, 
        images_bytes: List[bytes]
    ) -> List[List[float]]:
        """
        Compute CLIP embeddings for multiple images (batch processing)
        
        Args:
            images_bytes: List of raw image bytes
            
        Returns:
            List of embeddings (each is a list of 512 floats)
        """
        if not self._initialized:
            self.initialize()
        
        try:
            # Load and preprocess all images
            images = [
                Image.open(BytesIO(img_bytes)).convert("RGB") 
                for img_bytes in images_bytes
            ]
            
            inputs = self.processor(images=images, return_tensors="pt", padding=True)
            inputs = {k: v.to(self.device) for k, v in inputs.items()}
            
            # Compute embeddings
            with torch.no_grad():
                image_features = self.model.get_image_features(**inputs)
                image_features = image_features / image_features.norm(p=2, dim=-1, keepdim=True)
            
            embeddings = image_features.cpu().numpy().tolist()
            logger.info(f"Computed batch embeddings for {len(embeddings)} images")
            return embeddings
            
        except Exception as e:
            logger.error(f"Failed to compute batch embeddings: {e}")
            raise
    
    def analyze_scene_images(
        self,
        images_bytes: List[bytes],
        context_text: str
    ) -> Tuple[float, List[dict]]:
        """
        Analyze multiple scene images against context text
        
        Args:
            images_bytes: List of scene images
            context_text: Context text (withdrawal_reason)
            
        Returns:
            Tuple of (average_score, individual_results)
        """
        if not self._initialized:
            self.initialize()
        
        results = []
        total_score = 0.0
        
        for i, img_bytes in enumerate(images_bytes):
            try:
                similarity, is_relevant, reasoning = self.check_text_image_relevance(
                    img_bytes, context_text
                )
                results.append({
                    "image_index": i,
                    "similarity": similarity,
                    "is_relevant": is_relevant,
                    "reasoning": reasoning
                })
                total_score += similarity
                
            except Exception as e:
                logger.error(f"Failed to analyze image {i}: {e}")
                results.append({
                    "image_index": i,
                    "similarity": 0.0,
                    "is_relevant": False,
                    "reasoning": f"Lỗi phân tích: {str(e)}"
                })
        
        avg_score = (total_score / len(images_bytes)) if images_bytes else 0.0
        logger.info(f"Scene analysis complete: avg_score={avg_score:.4f}, {len(results)} images")
        
        return avg_score, results


# Singleton instance
clip_service = ClipService()
