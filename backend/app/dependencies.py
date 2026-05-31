"""Authentication dependencies for FastAPI.

Uses Supabase auth.get_user() to verify JWT tokens instead of local decode.
This ensures compatibility with any signing algorithm Supabase uses
(HS256, HS384, EdDSA, etc.) without needing to handle secrets ourselves.
"""
import logging
from typing import Any

from fastapi import Depends, HTTPException, status
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer

from app.database import get_supabase

logger = logging.getLogger("app")
security = HTTPBearer()


async def get_current_user(
    credentials: HTTPAuthorizationCredentials = Depends(security),
) -> dict[str, Any]:
    """Verify JWT token via Supabase and return user info with role from profiles table.
    
    Instead of decoding the JWT locally (which breaks with different algorithms
    like HS384, EdDSA, etc.), we call Supabase auth.get_user(token) which
    handles all verification server-side.
    """
    token = credentials.credentials

    try:
        supabase = get_supabase()
        user_response = supabase.auth.get_user(token)
        user = user_response.user

        if not user:
            raise ValueError("No user returned")

    except Exception as e:
        logger.error(f"Token verification failed: {type(e).__name__}: {e}")
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid or expired token",
            headers={"WWW-Authenticate": "Bearer"},
        )

    user_id = str(user.id)
    email = user.email or ""

    # Look up profile from database to get role and organization_id
    profile_response = (
        supabase.table("profiles")
        .select("role, organization_id, full_name")
        .eq("id", user_id)
        .maybe_single()
        .execute()
    )
    profile = profile_response.data if profile_response else None

    role = profile["role"] if profile else "renter"
    organization_id = profile["organization_id"] if profile else None

    return {
        "user_id": user_id,
        "email": email,
        "role": role,
        "organization_id": organization_id,
    }


def require_roles(roles: list[str]):
    """Dependency factory that checks if the current user has one of the required roles."""

    async def role_checker(
        current_user: dict[str, Any] = Depends(get_current_user),
    ) -> dict[str, Any]:
        if current_user["role"] not in roles:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail=f"Role '{current_user['role']}' is not authorized. Required: {roles}",
            )
        return current_user

    return role_checker
