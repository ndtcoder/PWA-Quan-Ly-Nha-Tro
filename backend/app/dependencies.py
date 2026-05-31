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
    import hmac
    import hashlib
    import json
    logger = logging.getLogger("app")
    
    token = credentials.credentials
    
    # Supabase JWT secrets are base64-encoded HMAC keys.
    # python-jose with cryptography backend gets confused when passing
    # the raw base64 string for HS384/HS512 (tries to parse as PEM).
    # Solution: decode the JWT manually using hmac for verification,
    # then parse the payload.
    
    try:
        parts = token.split(".")
        if len(parts) != 3:
            raise ValueError("Invalid JWT format")
        
        header_b64, payload_b64, signature_b64 = parts
        
        # Decode header to get algorithm
        # Add padding if needed
        header_padded = header_b64 + "=" * (4 - len(header_b64) % 4)
        header_json = base64.urlsafe_b64decode(header_padded)
        header_data = json.loads(header_json)
        token_alg = header_data.get("alg", "HS256")
        
        # Determine hash function from algorithm
        hash_funcs = {
            "HS256": hashlib.sha256,
            "HS384": hashlib.sha384,
            "HS512": hashlib.sha512,
        }
        
        if token_alg not in hash_funcs:
            raise ValueError(f"Unsupported algorithm: {token_alg}")
        
        # Get the secret as bytes (base64 decode the Supabase secret)
        try:
            secret_bytes = base64.b64decode(settings.JWT_SECRET)
        except Exception:
            secret_bytes = settings.JWT_SECRET.encode("utf-8")
        
        # Verify signature
        signing_input = f"{header_b64}.{payload_b64}".encode("utf-8")
        expected_sig = hmac.new(secret_bytes, signing_input, hash_funcs[token_alg]).digest()
        
        # Decode actual signature
        sig_padded = signature_b64 + "=" * (4 - len(signature_b64) % 4)
        actual_sig = base64.urlsafe_b64decode(sig_padded)
        
        if not hmac.compare_digest(expected_sig, actual_sig):
            raise ValueError("Invalid signature")
        
        # Decode payload
        payload_padded = payload_b64 + "=" * (4 - len(payload_b64) % 4)
        payload_json = base64.urlsafe_b64decode(payload_padded)
        payload = json.loads(payload_json)
        
    except Exception as e:
        logger.error(f"JWT decode failed: {type(e).__name__}: {e}")
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
