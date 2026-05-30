import time
import logging
import re
from starlette.middleware.base import BaseHTTPMiddleware
from starlette.requests import Request

logger = logging.getLogger("app")


class LoggingMiddleware(BaseHTTPMiddleware):
    async def dispatch(self, request: Request, call_next):
        start_time = time.time()
        response = await call_next(request)
        duration = time.time() - start_time

        # Log: method, path, status, duration (NO body, NO token)
        logger.info(
            f"{request.method} {request.url.path} - {response.status_code} - {duration:.3f}s"
        )
        return response


def mask_sensitive_data(text: str) -> str:
    """Mask CCCD/ID numbers in text: 123456789012 -> 123***012"""
    return re.sub(r'(\d{3})\d{6}(\d{3})', r'\1***\2', text)
