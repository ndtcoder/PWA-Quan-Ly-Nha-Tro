from functools import wraps
from typing import Any

from fastapi import Depends, HTTPException, status
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer
from jose import JWTError, jwt

from app.config import settings
from app.database import get_supabase

security = HTTPBearer()


async def get_current_user(
    credentials: HTTPAuthorizationCredentials = Depends(security),
) -> dict[str, Any]:
    """Decode JWT token and return the current user information.
    
    Reads role and organization_id from the profiles table since
    Supabase JWT user_metadata doesn't contain these by default.
    """
    import logging
    import base64
    logger = logging.getLogger("app")
    
    token = credentials.credentials
    
    # Supabase JWTs can use HS256 or HS384 depending on the project config.
    # Read the actual algorithm from the token header.
    allowed_algorithms = ["HS256", "HS384", "HS512"]
    
    try:
        header = jwt.get_unverified_header(token)
        token_alg = header.get("alg", "HS256")
        logger.debug(f"JWT token algorithm: {token_alg}")
    except Exception:
        token_alg = None

    payload = None
    last_error = None
    
    # Try with the raw secret string
    for alg_list in [[token_alg] if token_alg else allowed_algorithms, allowed_algorithms]:
        try:
            payload = jwt.decode(
                token,
                settings.JWT_SECRET,
                algorithms=alg_list,
                options={"verify_aud": False},
            )
            break
        except JWTError as e:
            last_error = e
    
    # If raw secret failed, try base64-decoded secret
    if payload is None:
        try:
            decoded_secret = base64.b64decode(settings.JWT_SECRET)
            alg_list = [token_alg] if token_alg else allowed_algorithms
            payload = jwt.decode(
                token,
                decoded_secret,
                algorithms=alg_list,
                options={"verify_aud": False},
            )
        except Exception as e:
            logger.error(f"JWT decode failed (alg={token_alg}): {type(e).__name__}: {e}")
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Invalid or expired token",
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
