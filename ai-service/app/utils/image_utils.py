import logging
import requests
import tempfile
import os
from typing import List
from PIL import Image
import io

logger = logging.getLogger(__name__)


async def download_image(url: str) -> bytes:
    """
    Download image from URL
    
    Args:
        url: URL của ảnh
        
    Returns:
        bytes: Binary data của ảnh
        
    Raises:
        Exception: Nếu download thất bại
    """
    try:
        logger.info(f"Downloading image from: {url}")
        response = requests.get(url, timeout=30)
        response.raise_for_status()
        
        # Validate image
        image = Image.open(io.BytesIO(response.content))
        logger.info(f"Image downloaded successfully: {image.size}, {image.format}")
        
        return response.content
        
    except Exception as e:
        logger.error(f"Failed to download image from {url}: {e}")
        raise


def save_temp_image(image_bytes: bytes, prefix: str = "temp") -> str:
    """
    Save image bytes to temporary file
    
    Args:
        image_bytes: Binary data của ảnh
        prefix: Prefix cho temp file name
        
    Returns:
        str: Path to temporary file
    """
    try:
        temp_file = tempfile.NamedTemporaryFile(
            delete=False, 
            suffix=".jpg",
            prefix=f"{prefix}_"
        )
        
        image = Image.open(io.BytesIO(image_bytes))
        image.save(temp_file.name, format="JPEG")
        temp_file.close()
        
        logger.debug(f"Saved temporary image: {temp_file.name}")
        return temp_file.name
        
    except Exception as e:
        logger.error(f"Error saving temp image: {e}")
        raise


def cleanup_temp_files(paths: List[str]):
    """
    Delete temporary files
    
    Args:
        paths: List of file paths to delete
    """
    for file_path in paths:
        try:
            if file_path and os.path.exists(file_path):
                os.unlink(file_path)
                logger.debug(f"Cleaned up temp file: {file_path}")
        except Exception as e:
            logger.warning(f"Failed to cleanup temp file {file_path}: {e}")
