"""Authentication dependencies for FastAPI.

Uses PyJWT (not python-jose) to decode Supabase JWTs.
python-jose's cryptography backend has a known issue with HS384/HS512
and base64-encoded secrets (tries to parse as PEM).
"""
import base64
import logging
from typing import Any

import jwt as pyjwt
from fastapi import Depends, HTTPException, status
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer

from app.config import settings
from app.database import get_supabase

logger = logging.getLogger("app")
security = HTTPBearer()

# Pre-compute the secret bytes at module load time.
# Supabase JWT secrets are base64-encoded.
try:
    _JWT_SECRET_BYTES = base64.b64decode(settings.JWT_SECRET)
except Exception:
    _JWT_SECRET_BYTES = settings.JWT_SECRET.encode("utf-8")


async def get_current_user(
    credentials: HTTPAuthorizationCredentials = Depends(security),
) -> dict[str, Any]:
    """Decode Supabase JWT and return user info with role from profiles table."""
    token = credentials.credentials

    try:
        payload = pyjwt.decode(
            token,
            _JWT_SECRET_BYTES,
            algorithms=["HS256", "HS384", "HS512"],
            options={"verify_aud": False},
        )
    except pyjwt.ExpiredSignatureError:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Token has expired",
            headers={"WWW-Authenticate": "Bearer"},
        )
    except pyjwt.InvalidTokenError as e:
        logger.error(f"JWT decode failed: {type(e).__name__}: {e}")
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid token",
            headers={"WWW-Authenticate": "Bearer"},
        )

    user_id = payload.get("sub")
    email = payload.get("email")

    if not user_id:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid token payload",
            headers={"WWW-Authenticate": "Bearer"},
        )

    # Look up profile from database to get role and organization_id
    supabase = get_supabase()
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
