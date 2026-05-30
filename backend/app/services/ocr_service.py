"""OCR service for meter reading detection using Google Vision API."""

import re
from typing import Optional


def ocr_meter_image(image_bytes: bytes) -> dict:
    """
    Call Google Vision API for text detection on meter image.
    Returns: {detected_value, confidence, raw_text, all_numbers_found}

    If Google Vision API key is not configured, return a mock result for development.
    """
    from app.config import settings

    if not settings.GOOGLE_VISION_API_KEY:
        # Mock OCR for development - return a reasonable fake value
        return {
            "detected_value": None,
            "confidence": 0.0,
            "raw_text": "Mock: No Google Vision API key configured",
            "all_numbers_found": [],
        }

    try:
        from google.cloud import vision
        import base64

        # Use REST-style approach with API key
        client = vision.ImageAnnotatorClient()
        image = vision.Image(content=image_bytes)

        response = client.text_detection(image=image)
        texts = response.text_annotations

        if not texts:
            return {
                "detected_value": None,
                "confidence": 0.0,
                "raw_text": "",
                "all_numbers_found": [],
            }

        raw_text = texts[0].description if texts else ""
        numbers = parse_meter_numbers(raw_text)
        confidence = estimate_confidence(numbers, raw_text)

        # Take the largest number as the meter reading (cumulative readings are always largest)
        detected_value = max(numbers) if numbers else None

        return {
            "detected_value": detected_value,
            "confidence": confidence,
            "raw_text": raw_text,
            "all_numbers_found": numbers,
        }
    except Exception as e:
        return {
            "detected_value": None,
            "confidence": 0.0,
            "raw_text": str(e),
            "all_numbers_found": [],
        }


def parse_meter_numbers(text: str) -> list[float]:
    """Extract potential meter reading numbers from OCR text."""
    # Find numbers with 4-7 digits, optionally with decimal
    pattern = r"\b(\d{4,7})(?:[.,](\d{1,2}))?\b"
    matches = re.findall(pattern, text)
    numbers = []
    for whole, decimal in matches:
        if decimal:
            numbers.append(float(f"{whole}.{decimal}"))
        else:
            numbers.append(float(whole))
    return numbers


def estimate_confidence(numbers_found: list[float], raw_text: str) -> float:
    """Estimate confidence based on OCR results quality."""
    if not numbers_found:
        return 0.0
    if len(numbers_found) == 1:
        return 0.92  # Single clear number is very reliable
    if len(numbers_found) == 2:
        return 0.85
    if len(numbers_found) <= 4:
        return 0.70
    return 0.50  # Too many numbers, unclear
