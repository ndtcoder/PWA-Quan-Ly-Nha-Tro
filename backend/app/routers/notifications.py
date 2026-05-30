from typing import Optional

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel

from app.database import get_supabase
from app.dependencies import get_current_user

router = APIRouter(prefix="/notifications", tags=["notifications"])


class MarkReadRequest(BaseModel):
    ids: Optional[list[str]] = None
    all: Optional[bool] = False


class UnreadCountResponse(BaseModel):
    count: int


@router.get("/unread-count")
async def get_unread_count(
    current_user: dict = Depends(get_current_user),
):
    """Get count of unread notifications for current user."""
    supabase = get_supabase()
    response = (
        supabase.table("notifications")
        .select("id", count="exact")
        .eq("recipient_id", current_user["user_id"])
        .eq("is_read", False)
        .execute()
    )
    return {"count": response.count or 0}


@router.get("")
async def get_notifications(
    current_user: dict = Depends(get_current_user),
):
    """Get last 50 notifications for current user, ordered by created_at DESC."""
    supabase = get_supabase()
    response = (
        supabase.table("notifications")
        .select("*")
        .eq("recipient_id", current_user["user_id"])
        .order("created_at", desc=True)
        .limit(50)
        .execute()
    )
    return response.data or []


@router.patch("/mark-read")
async def mark_notifications_read(
    request: MarkReadRequest,
    current_user: dict = Depends(get_current_user),
):
    """Mark notifications as read. Either by IDs or mark all as read."""
    supabase = get_supabase()

    if request.all:
        supabase.table("notifications").update({"is_read": True}).eq(
            "recipient_id", current_user["user_id"]
        ).eq("is_read", False).execute()
        return {"message": "All notifications marked as read"}

    if request.ids:
        for notification_id in request.ids:
            supabase.table("notifications").update({"is_read": True}).eq(
                "id", notification_id
            ).eq("recipient_id", current_user["user_id"]).execute()
        return {"message": f"{len(request.ids)} notifications marked as read"}

    raise HTTPException(status_code=400, detail="Provide 'ids' or set 'all' to true")
