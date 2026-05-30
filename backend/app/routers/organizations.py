from fastapi import APIRouter, Depends, HTTPException, status
from typing import Any

from app.dependencies import get_current_user, require_roles
from app.models.organization import OrganizationUpdate, OrganizationResponse
from app.services import organization_service

router = APIRouter(prefix="/organizations", tags=["organizations"])


@router.get("/me", response_model=OrganizationResponse)
async def get_my_organization(
    current_user: dict[str, Any] = Depends(get_current_user),
):
    """Get the current user's organization details."""
    org_id = current_user.get("organization_id")
    if not org_id:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="No organization found for this user",
        )
    try:
        result = organization_service.get_organization(org_id)
        return result
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Organization not found",
        )


@router.patch("", response_model=OrganizationResponse)
async def update_organization(
    data: OrganizationUpdate,
    current_user: dict[str, Any] = Depends(require_roles(["owner"])),
):
    """Update the current user's organization (owner only)."""
    org_id = current_user.get("organization_id")
    if not org_id:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="No organization found for this user",
        )
    try:
        result = organization_service.update_organization(org_id, data)
        return result
    except ValueError as e:
        error_msg = str(e)
        if "Slug already taken" in error_msg:
            raise HTTPException(
                status_code=status.HTTP_409_CONFLICT,
                detail=error_msg,
            )
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=error_msg,
        )
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(e),
        )
