ALLOWED_IMAGE_TYPES = ["image/jpeg", "image/png", "image/webp"]
MAX_IMAGE_SIZE = 10 * 1024 * 1024  # 10MB
MAX_ID_PHOTO_SIZE = 20 * 1024 * 1024  # 20MB

import uuid
import os


def validate_image_upload(
    file_content_type: str, file_size: int, max_size: int = MAX_IMAGE_SIZE
) -> tuple[bool, str]:
    """Validate image upload. Returns (is_valid, error_message)."""
    if file_content_type not in ALLOWED_IMAGE_TYPES:
        return False, f"Invalid file type. Allowed: {', '.join(ALLOWED_IMAGE_TYPES)}"
    if file_size > max_size:
        return False, f"File too large. Maximum: {max_size // (1024*1024)}MB"
    return True, ""


def generate_safe_filename(original_filename: str) -> str:
    """Generate a random filename preserving extension."""
    ext = os.path.splitext(original_filename)[1].lower() or '.jpg'
    return f"{uuid.uuid4().hex}{ext}"
