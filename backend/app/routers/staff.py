from typing import Optional

from fastapi import APIRouter, Depends, Query

from app.dependencies import get_current_user, require_roles
from app.models.staff import StaffResponse, StaffRoleUpdate, StaffInvite
from app.services import staff_service

router = APIRouter(prefix="/staff", tags=["staff"])


@router.get("", response_model=list[StaffResponse])
async def list_staff(
    role: Optional[str] = Query(None),
    property_id: Optional[str] = Query(None),
    current_user: dict = Depends(get_current_user),
):
    """List staff members for the organization."""
    return staff_service.list_staff(
        org_id=current_user["organization_id"],
        role=role,
        property_id=property_id,
    )


@router.post("/invite", status_code=201)
async def invite_staff(
    data: StaffInvite,
    current_user: dict = Depends(require_roles(["owner", "manager"])),
):
    """Invite a new staff member via email."""
    # Reuse the auth invite flow concept
    from app.database import get_supabase
    supabase = get_supabase()

    # Create an invitation record
    invitation_data = {
        "email": data.email,
        "role": data.role,
        "organization_id": current_user["organization_id"],
        "invited_by": current_user["user_id"],
        "status": "pending",
    }

    response = supabase.table("invitations").insert(invitation_data).execute()

    # If property_id is provided, we store it for later assignment
    if data.property_id and response.data:
        invitation_id = response.data[0]["id"]
        supabase.table("invitation_properties").insert({
            "invitation_id": invitation_id,
            "property_id": data.property_id,
        }).execute()

    return {"message": f"Invitation sent to {data.email}"}


@router.patch("/{staff_id}/role", response_model=StaffResponse)
async def update_staff_role(
    staff_id: str,
    data: StaffRoleUpdate,
    current_user: dict = Depends(require_roles(["owner", "manager"])),
):
    """Update a staff member's role."""
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
        "is_active": updated.get("is_active", True),
        "assigned_properties": [],
        "created_at": updated.get("created_at"),
    }


@router.delete("/{staff_id}")
async def deactivate_staff(
    staff_id: str,
    current_user: dict = Depends(require_roles(["owner", "manager"])),
):
    """Deactivate a staff member."""
    return staff_service.deactivate_staff(
        profile_id=staff_id,
        org_id=current_user["organization_id"],
    )
