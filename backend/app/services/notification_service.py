import logging
from typing import Optional
from uuid import uuid4

from app.database import get_supabase

logger = logging.getLogger(__name__)


async def send_notification(
    recipient_id: str,
    notification_type: str,
    title: str,
    body: str,
    data: Optional[dict] = None,
    channels: Optional[list[str]] = None,
    org_id: Optional[str] = None,
):
    """
    Send notification via specified channels.
    channels: ['in_app', 'email', 'push']
    """
    if channels is None:
        channels = ["in_app"]
    if data is None:
        data = {}

    # 1. Always save to notifications table (in_app)
    try:
        supabase = get_supabase()
        notification_record = {
            "id": str(uuid4()),
            "recipient_id": recipient_id,
            "type": notification_type,
            "title": title,
            "body": body,
            "data": data,
            "is_read": False,
            "organization_id": org_id,
        }
        supabase.table("notifications").insert(notification_record).execute()
        logger.info(f"Notification saved: {title} -> {recipient_id}")
    except Exception as e:
        logger.error(f"Failed to save notification: {e}")

    # 2. If 'email' in channels: call email_service
    if "email" in channels:
        try:
            from app.services.email_service import send_email_for_notification

            await send_email_for_notification(
                recipient_id=recipient_id,
                notification_type=notification_type,
                title=title,
                body=body,
                data=data,
            )
        except Exception as e:
            logger.error(f"Failed to send email notification: {e}")

    # 3. If 'push' in channels: call push_service
    if "push" in channels:
        try:
            from app.services.push_service import send_push_to_user

            await send_push_to_user(
                profile_id=recipient_id,
                title=title,
                body=body,
                data=data,
            )
        except Exception as e:
            logger.error(f"Failed to send push notification: {e}")
