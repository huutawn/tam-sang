import logging
import random
from typing import Dict
from PIL import Image
import io
import requests

from app.models.events import ExtractedKycData

logger = logging.getLogger(__name__)


class OCRService:
    """Mock OCR service for ID card text extraction"""

    # Mock data for demonstration
    MOCK_NAMES = [
        "NGUYEN VAN A",
        "TRAN THI B",
        "LE VAN C",
        "PHAM THI D",
        "HOANG VAN E",
    ]

    MOCK_ADDRESSES = [
        "123 Nguyen Hue Street, District 1, Ho Chi Minh City",
        "456 Le Loi Street, District 3, Ho Chi Minh City",
        "789 Tran Hung Dao Street, District 5, Ho Chi Minh City",
        "321 Vo Van Tan Street, District 3, Ho Chi Minh City",
    ]

    def __init__(self):
        logger.info("OCR Service initialized")

    async def download_image(self, url: str) -> bytes:
        """Download image from URL"""
        try:
            logger.info(f"Downloading image from: {url}")
            response = requests.get(url, timeout=30)
            response.raise_for_status()
            return response.content
        except Exception as e:
            logger.error(f"Failed to download image from {url}: {e}")
            raise

    async def extract_text_from_image(self, image_bytes: bytes) -> Dict[str, str]:
        """
        Mock OCR extraction from image bytes.
        In production, replace with real OCR library (Tesseract, Google Vision API, etc.)
        """
        try:
            # Validate image
            image = Image.open(io.BytesIO(image_bytes))
            logger.info(f"Image loaded successfully: {image.size}, {image.format}")

            # Mock OCR extraction
            # In production, use actual OCR here
            extracted_data = {
                "text": f"Mock OCR result for image {image.size}",
                "confidence": random.uniform(0.85, 0.99),
            }

            return extracted_data

        except Exception as e:
            logger.error(f"Failed to extract text from image: {e}")
            raise

    async def process_id_card(
        self, front_image_url: str, back_image_url: str
    ) -> ExtractedKycData:
        """
        Process front and back images of ID card and extract information.
        This is a MOCK implementation for demonstration.
        """
        try:
            logger.info("Processing ID card images")

            # Download images
            front_bytes = await self.download_image(front_image_url)
            back_bytes = await self.download_image(back_image_url)

            # Extract text (mock)
            front_data = await self.extract_text_from_image(front_bytes)
            back_data = await self.extract_text_from_image(back_bytes)

            # Generate mock extracted data
            # In production, parse actual OCR results
            extracted_data = ExtractedKycData(
                fullName=random.choice(self.MOCK_NAMES),
                dob=f"{random.randint(1, 28):02d}/{random.randint(1, 12):02d}/{random.randint(1970, 2000)}",
                idNumber=f"{random.randint(100000000000, 999999999999)}",
                idType="CITIZEN_ID",
                address=random.choice(self.MOCK_ADDRESSES),
            )

            logger.info(f"Successfully extracted KYC data: {extracted_data.fullName}")
            return extracted_data

        except Exception as e:
            logger.error(f"Failed to process ID card: {e}")
            raise


ocr_service = OCRService()
