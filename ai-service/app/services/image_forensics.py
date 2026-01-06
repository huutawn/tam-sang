import logging
from typing import Dict
from PIL import Image
from PIL.ExifTags import TAGS
import imagehash
import io

logger = logging.getLogger(__name__)


class ImageForensicsService:
    """
    Service để phát hiện ảnh giả mạo/chỉnh sửa
    
    Chức năng:
    1. Kiểm tra EXIF metadata - phát hiện phần mềm editing
    2. Perceptual hashing - phát hiện duplicate images
    """
    
    # Danh sách software editing phổ biến
    EDITING_SOFTWARE = [
        "Adobe Photoshop",
        "GIMP",
        "Paint.NET",
        "Affinity Photo",
        "Corel PaintShop",
        "PhotoScape",
        "Pixlr",
    ]
    
    def __init__(self):
        logger.info("Image Forensics Service initialized")
    
    def check_metadata(self, image_bytes: bytes) -> Dict:
        """
        Kiểm tra EXIF metadata của ảnh
        
        Args:
            image_bytes: Binary data của ảnh
            
        Returns:
            Dict với keys:
            - has_warning: bool - Có cảnh báo không
            - software: str - Phần mềm editing phát hiện được
            - details: str - Chi tiết về metadata
        """
        try:
            image = Image.open(io.BytesIO(image_bytes))
            
            # Lấy EXIF data
            exif_data = image._getexif()
            
            if exif_data is None:
                logger.warning("No EXIF data found in image")
                return {
                    "has_warning": True,
                    "software": "",
                    "details": "Missing EXIF data - possible screenshot or edited image"
                }
            
            # Parse EXIF tags
            exif = {}
            for tag_id, value in exif_data.items():
                tag = TAGS.get(tag_id, tag_id)
                exif[tag] = value
            
            # Kiểm tra Software tag
            software = exif.get("Software", "")
            
            # Detect editing software
            for editing_app in self.EDITING_SOFTWARE:
                if editing_app.lower() in str(software).lower():
                    logger.warning(f"Detected editing software: {editing_app}")
                    return {
                        "has_warning": True,
                        "software": editing_app,
                        "details": f"Image edited with {editing_app}"
                    }
            
            # Kiểm tra các tags khác
            model = exif.get("Model", "Unknown")
            make = exif.get("Make", "Unknown")
            datetime_original = exif.get("DateTimeOriginal", "Unknown")
            
            logger.info(f"EXIF check passed - Camera: {make} {model}")
            
            return {
                "has_warning": False,
                "software": software,
                "details": f"Original photo from {make} {model} at {datetime_original}"
            }
            
        except Exception as e:
            logger.error(f"Error checking metadata: {e}")
            return {
                "has_warning": True,
                "software": "",
                "details": f"Error reading EXIF: {str(e)}"
            }
    
    def check_duplicate(self, image_bytes: bytes) -> Dict:
        """
        Tính perceptual hash để phát hiện duplicate
        
        Args:
            image_bytes: Binary data của ảnh
            
        Returns:
            Dict với keys:
            - perceptual_hash: str - Hash của ảnh
            - is_duplicate: bool - Placeholder (cần database để compare)
        
        Note:
            Trong production, hash này sẽ được so sánh với database
            để phát hiện ảnh trùng lặp hoặc ảnh từ internet
        """
        try:
            image = Image.open(io.BytesIO(image_bytes))
            
            # Tính nhiều loại hash để độ chính xác cao hơn
            phash = str(imagehash.phash(image))
            dhash = str(imagehash.dhash(image))
            ahash = str(imagehash.average_hash(image))
            
            # Kết hợp các hash
            combined_hash = f"p:{phash}|d:{dhash}|a:{ahash}"
            
            logger.info(f"Computed perceptual hash: {phash}")
            
            # TODO: Compare với database để detect duplicate
            # Hiện tại chỉ return hash
            
            return {
                "perceptual_hash": combined_hash,
                "is_duplicate": False,  # Sẽ implement sau khi có database
            }
            
        except Exception as e:
            logger.error(f"Error computing hash: {e}")
            return {
                "perceptual_hash": "",
                "is_duplicate": False,
            }
    
    def analyze(self, image_bytes: bytes) -> Dict:
        """
        Phân tích tổng hợp: metadata + duplicate check
        
        Args:
            image_bytes: Binary data của ảnh
            
        Returns:
            Dict kết hợp cả metadata và hash info
        """
        metadata_result = self.check_metadata(image_bytes)
        duplicate_result = self.check_duplicate(image_bytes)
        
        return {
            **metadata_result,
            **duplicate_result
        }


# Singleton instance
image_forensics_service = ImageForensicsService()
