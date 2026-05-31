from typing import Optional

from fastapi import APIRouter, Depends, Query

from app.dependencies import get_current_user, require_roles
from app.models.staff import StaffCreate, StaffUpdate, StaffResponse, StaffRoleUpdate
from app.services import staff_service

router = APIRouter(prefix="/staff", tags=["staff"])


@router.get("", response_model=list[StaffResponse])
async def list_staff(
    role: Optional[str] = Query(None),
    property_id: Optional[str] = Query(None),
    current_user: dict = Depends(get_current_user),
):
    """List staff members for the organization (both active and pending)."""
    return staff_service.list_staff(
        org_id=current_user["organization_id"],
        role=role,
        property_id=property_id,
    )


@router.post("", response_model=StaffResponse, status_code=201)
async def create_staff(
    data: StaffCreate,
    current_user: dict = Depends(require_roles(["owner", "manager"])),
):
    """Create a new staff member (added as pending until they sign up)."""
    return staff_service.create_staff(
        org_id=current_user["organization_id"],
        data=data,
    )


@router.patch("/{staff_id}", response_model=StaffResponse)
async def update_staff(
    staff_id: str,
    data: StaffUpdate,
    current_user: dict = Depends(require_roles(["owner", "manager"])),
):
    """Update a staff member's information."""
    return staff_service.update_staff(
        staff_id=staff_id,
        data=data,
        org_id=current_user["organization_id"],
    )


@router.patch("/{staff_id}/role", response_model=StaffResponse)
async def update_staff_role(
    staff_id: str,
    data: StaffRoleUpdate,
    current_user: dict = Depends(require_roles(["owner", "manager"])),
):
    """Update a staff member's role (backwards compatibility)."""
    updated = staff_service.update_role(
        profile_id=staff_id,
        data=data,
        org_id=current_user["organization_id"],
    )
    return {
        "id": updated["id"],
        "full_name": updated.get("full_name", ""),
        "email": updated.get("email"),
        "role": updated.get("role", ""),
        "phone": updated.get("phone"),
        "property_name": None,
        "status": "active",
        "address": updated.get("address"),
        "notes": updated.get("notes"),
        "created_at": updated.get("created_at"),
    }


@router.delete("/{staff_id}")
async def deactivate_staff(
    staff_id: str,
    current_user: dict = Depends(require_roles(["owner", "manager"])),
):
    """Deactivate a staff member or remove a pending invitation."""
    return staff_service.deactivate_staff(
        profile_id=staff_id,
        org_id=current_user["organization_id"],
    )
