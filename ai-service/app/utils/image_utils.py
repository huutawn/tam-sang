"""
Image utility functions for downloading and managing temporary image files.

Uses httpx for non-blocking HTTP downloads to avoid blocking the asyncio
event loop (which would stall all concurrent coroutines in the same loop).
"""

import logging
import os
import tempfile
from typing import List

import httpx
from PIL import Image
import io

logger = logging.getLogger(__name__)

# ---------------------------------------------------------------------------
# Module-level HTTP client settings
# ---------------------------------------------------------------------------
_HTTP_TIMEOUT = httpx.Timeout(
    connect=10.0,   # TCP connect timeout
    read=30.0,      # Time to read response body
    write=10.0,     # Time to send request body
    pool=5.0,       # Time waiting for a connection from the pool
)


async def download_image(url: str) -> bytes:
    """
    Download an image from a URL using async HTTP.

    The function validates that the downloaded bytes represent a valid image
    by attempting to open it with Pillow before returning.

    Args:
        url: Fully-qualified URL of the image to download.

    Returns:
        Raw image bytes.

    Raises:
        httpx.HTTPStatusError: If the server returns a non-2xx status.
        PIL.UnidentifiedImageError: If the downloaded content is not a valid image.
        httpx.TimeoutException: If the request exceeds configured timeouts.
    """
    try:
        logger.info("Downloading image from: %s", url)

        async with httpx.AsyncClient(timeout=_HTTP_TIMEOUT) as client:
            response = await client.get(url)
            response.raise_for_status()

        # Validate that the content is actually an image.
        image = Image.open(io.BytesIO(response.content))
        logger.info(
            "Image downloaded successfully: size=%s, format=%s",
            image.size, image.format,
        )

        return response.content

    except httpx.HTTPStatusError as e:
        logger.error(
            "HTTP %s error downloading image from %s: %s",
            e.response.status_code, url, e,
        )
        raise
    except Exception as e:
        logger.error("Failed to download image from %s: %s", url, e)
        raise


def save_temp_image(image_bytes: bytes, prefix: str = "temp") -> str:
    """
    Persist image bytes to a temporary file on disk.

    This is required by libraries that only accept file paths (e.g. DeepFace).
    Callers are responsible for cleaning up the file via ``cleanup_temp_files``.

    Args:
        image_bytes: Raw image data.
        prefix: Filename prefix for the temp file.

    Returns:
        Absolute path to the created temporary file.
    """
    try:
        temp_file = tempfile.NamedTemporaryFile(
            delete=False,
            suffix=".jpg",
            prefix=f"{prefix}_",
        )

        image = Image.open(io.BytesIO(image_bytes))
        image.save(temp_file.name, format="JPEG")
        temp_file.close()

        logger.debug("Saved temporary image: %s", temp_file.name)
        return temp_file.name

    except Exception as e:
        logger.error("Error saving temp image: %s", e)
        raise


def cleanup_temp_files(paths: List[str]) -> None:
    """
    Remove temporary files from disk.

    Errors during deletion are logged but do not propagate — this function
    is designed to be called in ``finally`` blocks.

    Args:
        paths: Absolute paths of files to delete.
    """
    for file_path in paths:
        try:
            if file_path and os.path.exists(file_path):
                os.unlink(file_path)
                logger.debug("Cleaned up temp file: %s", file_path)
        except Exception as e:
            logger.warning("Failed to cleanup temp file %s: %s", file_path, e)
