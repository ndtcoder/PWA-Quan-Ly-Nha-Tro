from fastapi import APIRouter, Depends
from pydantic import BaseModel

from app.database import get_supabase
from app.dependencies import get_current_user

router = APIRouter(prefix="/push", tags=["push"])


class PushSubscribeRequest(BaseModel):
    endpoint: str
    p256dh: str
    auth: str


class PushUnsubscribeRequest(BaseModel):
    endpoint: str


@router.post("/subscribe")
async def subscribe_push(
    request: PushSubscribeRequest,
    current_user: dict = Depends(get_current_user),
):
    """Save push subscription for current user."""
    supabase = get_supabase()

    # Check if subscription already exists
    existing = (
        supabase.table("push_subscriptions")
        .select("id")
        .eq("endpoint", request.endpoint)
        .eq("profile_id", current_user["user_id"])
        .limit(1)
        .execute()
    )

    if existing.data:
        # Update existing subscription
        supabase.table("push_subscriptions").update(
            {
                "p256dh": request.p256dh,
                "auth_key": request.auth,
            }
        ).eq("endpoint", request.endpoint).eq(
            "profile_id", current_user["user_id"]
        ).execute()
        return {"message": "Push subscription updated"}

    # Create new subscription
    supabase.table("push_subscriptions").insert(
        {
            "profile_id": current_user["user_id"],
            "endpoint": request.endpoint,
            "p256dh": request.p256dh,
            "auth_key": request.auth,
        }
    ).execute()
    return {"message": "Push subscription created"}


@router.delete("/subscribe")
async def unsubscribe_push(
    request: PushUnsubscribeRequest,
    current_user: dict = Depends(get_current_user),
):
    """Remove push subscription for current user."""
    supabase = get_supabase()
    supabase.table("push_subscriptions").delete().eq(
        "endpoint", request.endpoint
    ).eq("profile_id", current_user["user_id"]).execute()
    return {"message": "Push subscription removed"}
