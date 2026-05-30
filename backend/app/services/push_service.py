import json
import logging
from typing import Optional

from app.config import settings
from app.database import get_supabase

logger = logging.getLogger(__name__)


async def send_push(
    endpoint: str,
    p256dh: str,
    auth_key: str,
    title: str,
    body: str,
    data: Optional[dict] = None,
) -> bool:
    """Send a single push notification via pywebpush."""
    if not settings.VAPID_PRIVATE_KEY or not settings.VAPID_PUBLIC_KEY:
        logger.warning("VAPID keys not configured, skipping push notification")
        return False

    try:
        from pywebpush import webpush, WebPushException

        subscription_info = {
            "endpoint": endpoint,
            "keys": {
                "p256dh": p256dh,
                "auth": auth_key,
            },
        }

        payload = json.dumps(
            {
                "title": title,
                "body": body,
                "data": data or {},
            }
        )

        webpush(
            subscription_info=subscription_info,
            data=payload,
            vapid_private_key=settings.VAPID_PRIVATE_KEY,
            vapid_claims={
                "sub": f"mailto:{settings.VAPID_EMAIL}" if settings.VAPID_EMAIL else "mailto:admin@nhatro.app"
            },
        )
        logger.info(f"Push notification sent to endpoint: {endpoint[:50]}...")
        return True
    except Exception as e:
        error_str = str(e)
        # Handle expired/invalid subscriptions
        if "410" in error_str or "404" in error_str:
            logger.info(f"Removing invalid push subscription: {endpoint[:50]}...")
            _remove_subscription(endpoint)
        else:
            logger.error(f"Failed to send push notification: {e}")
        return False


async def send_push_to_user(
    profile_id: str,
    title: str,
    body: str,
    data: Optional[dict] = None,
) -> int:
    """
    Send push notification to all subscriptions for a user.
    Returns the number of successfully sent notifications.
    """
    if not settings.VAPID_PRIVATE_KEY or not settings.VAPID_PUBLIC_KEY:
        logger.warning("VAPID keys not configured, skipping push notifications")
        return 0

    try:
        supabase = get_supabase()
        response = (
            supabase.table("push_subscriptions")
            .select("*")
            .eq("profile_id", profile_id)
            .execute()
        )

        subscriptions = response.data or []
        if not subscriptions:
            logger.debug(f"No push subscriptions found for user {profile_id}")
            return 0

        sent_count = 0
        for sub in subscriptions:
            success = await send_push(
                endpoint=sub["endpoint"],
                p256dh=sub["p256dh"],
                auth_key=sub["auth_key"],
                title=title,
                body=body,
                data=data,
            )
            if success:
                sent_count += 1

        return sent_count
    except Exception as e:
        logger.error(f"Failed to send push to user {profile_id}: {e}")
        return 0


def _remove_subscription(endpoint: str):
    """Remove an invalid push subscription from the database."""
    try:
        supabase = get_supabase()
        supabase.table("push_subscriptions").delete().eq(
            "endpoint", endpoint
        ).execute()
    except Exception as e:
        logger.error(f"Failed to remove push subscription: {e}")
