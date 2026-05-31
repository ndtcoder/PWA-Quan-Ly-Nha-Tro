from fastapi import APIRouter, Depends, HTTPException, Query, Request, status
from typing import Any
from slowapi import Limiter
from slowapi.util import get_remote_address

from app.dependencies import get_current_user, require_roles
from app.models.auth import (
    RegisterOwnerRequest,
    LoginRequest,
    InviteUserRequest,
    AcceptInviteRequest,
    AuthResponse,
    UserResponse,
    GoogleAuthRequest,
    GoogleAuthResponse,
)
from app.services import auth_service

router = APIRouter(prefix="/auth", tags=["auth"])

limiter = Limiter(key_func=get_remote_address)


@router.post("/register-owner", response_model=AuthResponse)
@limiter.limit("10/minute")
async def register_owner(request: Request, data: RegisterOwnerRequest):
    """Register a new property owner with their organization."""
    try:
        result = auth_service.register_owner(data)
        return result
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(e),
        )


@router.post("/login", response_model=AuthResponse)
@limiter.limit("10/minute")
async def login(request: Request, data: LoginRequest):
    """Login with email and password."""
    try:
        result = auth_service.login(data)
        return result
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid email or password",
        )


@router.post("/logout")
async def logout():
    """Logout - client discards token."""
    return {"message": "Logged out successfully"}


@router.get("/me", response_model=UserResponse)
async def get_me(current_user: dict[str, Any] = Depends(get_current_user)):
    """Get current user profile."""
    try:
        profile = auth_service.get_profile(current_user["user_id"])
        return profile
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Profile not found",
        )


@router.post("/invite")
async def invite_user(
    data: InviteUserRequest,
    current_user: dict[str, Any] = Depends(require_roles(["owner", "manager"])),
):
    """Invite a user to the organization (owner/manager only)."""
    try:
        result = auth_service.invite_user(data, current_user)
        return result
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(e),
        )


@router.post("/accept-invite", response_model=AuthResponse)
@limiter.limit("10/minute")
async def accept_invite(request: Request, data: AcceptInviteRequest):
    """Accept an invitation and create account."""
    try:
        result = auth_service.accept_invite(data)
        return result
    except ValueError as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(e),
        )
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(e),
        )


@router.get("/validate-invite")
async def validate_invite(token: str = Query(...)):
    """Validate an invitation token."""
    try:
        result = auth_service.validate_invite(token)
        return result
    except ValueError as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(e),
        )
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(e),
        )


@router.post("/google", response_model=GoogleAuthResponse)
@limiter.limit("10/minute")
async def google_auth(request: Request, data: GoogleAuthRequest):
    """Handle Google OAuth sign-in/sign-up via Supabase."""
    import logging
    logger = logging.getLogger("app")
    try:
        result = auth_service.google_auth(data)
        return result
    except ValueError as e:
        logger.error(f"Google auth ValueError: {e}")
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail=str(e),
        )
    except Exception as e:
        logger.error(f"Google auth error: {type(e).__name__}: {e}")
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(e),
        )
