import uuid
from typing import Optional

from fastapi import HTTPException, status

from app.database import get_supabase
from app.models.staff import StaffCreate, StaffUpdate, StaffRoleUpdate


def list_staff(
    org_id: str,
    role: Optional[str] = None,
    property_id: Optional[str] = None,
) -> list:
    """List staff members for the organization.

    Returns BOTH active staff (from profiles) and pending staff (from invitations
    where accepted_at IS NULL).
    """
    supabase = get_supabase()
    result = []

    # --- Active staff from profiles ---
    query = (
        supabase.table("profiles")
        .select("*")
        .eq("organization_id", org_id)
        .in_("role", ["manager", "accountant", "maintenance", "cleaner"])
    )

    if role:
        query = query.eq("role", role)

    response = query.order("created_at", desc=True).execute()
    profiles = response.data or []

    for profile in profiles:
        # Get assigned properties for property_name
        assignments_response = (
            supabase.table("staff_assignments")
            .select("property_id, properties(name)")
            .eq("profile_id", profile["id"])
            .execute()
        )

        property_name = None
        if assignments_response.data:
            for assignment in assignments_response.data:
                prop_data = assignment.get("properties")
                if prop_data and isinstance(prop_data, dict):
                    property_name = prop_data.get("name", "")
                    break
                elif prop_data and isinstance(prop_data, list) and prop_data:
                    property_name = prop_data[0].get("name", "")
                    break

        # Filter by property_id if specified
        if property_id:
            property_ids = [
                a.get("property_id") for a in (assignments_response.data or [])
            ]
            if property_id not in property_ids:
                continue

        result.append({
            "id": profile["id"],
            "full_name": profile.get("full_name", ""),
            "email": profile.get("email"),
            "role": profile.get("role", ""),
            "phone": profile.get("phone"),
            "property_name": property_name,
            "status": "active",
            "address": profile.get("address"),
            "notes": profile.get("notes"),
            "created_at": profile.get("created_at"),
        })

    # --- Pending staff from invitations ---
    inv_query = (
        supabase.table("invitations")
        .select("*, properties(name)")
        .eq("organization_id", org_id)
        .is_("accepted_at", "null")
    )

    if role:
        inv_query = inv_query.eq("role", role)

    inv_response = inv_query.order("created_at", desc=True).execute()
    invitations = inv_response.data or []

    for invitation in invitations:
        # Get property_name from joined properties
        inv_property_name = None
        prop_data = invitation.get("properties")
        if prop_data and isinstance(prop_data, dict):
            inv_property_name = prop_data.get("name", "")
        elif prop_data and isinstance(prop_data, list) and prop_data:
            inv_property_name = prop_data[0].get("name", "")

        # Filter by property_id if specified
        if property_id and invitation.get("property_id") != property_id:
            continue

        result.append({
            "id": invitation["id"],
            "full_name": invitation.get("full_name", ""),
            "email": invitation.get("email"),
            "role": invitation.get("role", ""),
            "phone": invitation.get("phone"),
            "property_name": inv_property_name,
            "status": "pending",
            "address": invitation.get("address"),
            "notes": invitation.get("notes"),
            "created_at": invitation.get("created_at"),
        })

    return result


def create_staff(org_id: str, data: StaffCreate) -> dict:
    """Create a new staff member by inserting into the invitations table.

    The staff member will be in 'pending' status until they sign up via Google Auth,
    at which point the invitation is automatically accepted.
    """
    supabase = get_supabase()

    invitation_id = str(uuid.uuid4())
    token = str(uuid.uuid4())

    invitation_data = {
        "id": invitation_id,
        "token": token,
        "email": data.email,
        "role": data.role,
        "organization_id": org_id,
        "property_id": data.property_id,
        "full_name": data.full_name,
        "phone": data.phone,
        "address": data.address,
        "notes": data.notes,
    }

    response = supabase.table("invitations").insert(invitation_data).execute()

    if not response.data:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to create staff member",
        )

    created = response.data[0]

    # Get property name if property_id provided
    property_name = None
    if data.property_id:
        prop_response = (
            supabase.table("properties")
            .select("name")
            .eq("id", data.property_id)
            .maybe_single()
            .execute()
        )
        if prop_response.data:
            property_name = prop_response.data.get("name")

    return {
        "id": created["id"],
        "full_name": created.get("full_name", ""),
        "email": created.get("email"),
        "role": created.get("role", ""),
        "phone": created.get("phone"),
        "property_name": property_name,
        "status": "pending",
        "address": created.get("address"),
        "notes": created.get("notes"),
        "created_at": created.get("created_at"),
    }


def update_staff(staff_id: str, data: StaffUpdate, org_id: str) -> dict:
    """Update a staff member. Checks profiles first (active), then invitations (pending)."""
    supabase = get_supabase()

    update_data = data.model_dump(exclude_none=True)
    if not update_data:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="No fields to update",
        )

    # Try profiles table first (active staff)
    profile_response = (
        supabase.table("profiles")
        .select("id")
        .eq("id", staff_id)
        .eq("organization_id", org_id)
        .maybe_single()
        .execute()
    )

    if profile_response.data:
        # Active staff - update profile
        # property_id is not a direct profile field; handle assignment separately
        profile_update = {
            k: v for k, v in update_data.items() if k != "property_id"
        }
        if profile_update:
            supabase.table("profiles").update(profile_update).eq(
                "id", staff_id
            ).eq("organization_id", org_id).execute()

        # Handle property assignment update
        if "property_id" in update_data:
            new_property_id = update_data["property_id"]
            # Remove existing assignments
            supabase.table("staff_assignments").delete().eq(
                "profile_id", staff_id
            ).execute()
            # Create new assignment if property_id provided
            if new_property_id:
                assignment_data = {
                    "id": str(uuid.uuid4()),
                    "profile_id": staff_id,
                    "property_id": new_property_id,
                    "role": update_data.get("role") or profile_response.data.get("role", ""),
                }
                supabase.table("staff_assignments").insert(assignment_data).execute()

        # Fetch updated profile
        updated_response = (
            supabase.table("profiles")
            .select("*")
            .eq("id", staff_id)
            .single()
            .execute()
        )
        updated = updated_response.data

        # Get property name
        property_name = None
        assignments = (
            supabase.table("staff_assignments")
            .select("properties(name)")
            .eq("profile_id", staff_id)
            .execute()
        )
        if assignments.data:
            prop_data = assignments.data[0].get("properties")
            if prop_data and isinstance(prop_data, dict):
                property_name = prop_data.get("name")

        return {
            "id": updated["id"],
            "full_name": updated.get("full_name", ""),
            "email": updated.get("email"),
            "role": updated.get("role", ""),
            "phone": updated.get("phone"),
            "property_name": property_name,
            "status": "active",
            "address": updated.get("address"),
            "notes": updated.get("notes"),
            "created_at": updated.get("created_at"),
        }

    # Try invitations table (pending staff)
    invitation_response = (
        supabase.table("invitations")
        .select("id")
        .eq("id", staff_id)
        .eq("organization_id", org_id)
        .is_("accepted_at", "null")
        .maybe_single()
        .execute()
    )

    if invitation_response.data:
        # Pending staff - update invitation
        supabase.table("invitations").update(update_data).eq(
            "id", staff_id
        ).eq("organization_id", org_id).execute()

        # Fetch updated invitation
        updated_response = (
            supabase.table("invitations")
            .select("*, properties(name)")
            .eq("id", staff_id)
            .single()
            .execute()
        )
        updated = updated_response.data

        property_name = None
        prop_data = updated.get("properties")
        if prop_data and isinstance(prop_data, dict):
            property_name = prop_data.get("name")

        return {
            "id": updated["id"],
            "full_name": updated.get("full_name", ""),
            "email": updated.get("email"),
            "role": updated.get("role", ""),
            "phone": updated.get("phone"),
            "property_name": property_name,
            "status": "pending",
            "address": updated.get("address"),
            "notes": updated.get("notes"),
            "created_at": updated.get("created_at"),
        }

    raise HTTPException(
        status_code=status.HTTP_404_NOT_FOUND,
        detail="Staff member not found",
    )


def update_role(profile_id: str, data: StaffRoleUpdate, org_id: str) -> dict:
    """Update a staff member's role (backwards compatibility)."""
    supabase = get_supabase()

    # Verify profile belongs to org
    profile_response = (
        supabase.table("profiles")
        .select("id, full_name, email")
        .eq("id", profile_id)
        .eq("organization_id", org_id)
        .single()
        .execute()
    )

    if not profile_response.data:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Staff member not found",
        )

    response = (
        supabase.table("profiles")
        .update({"role": data.role})
        .eq("id", profile_id)
        .eq("organization_id", org_id)
        .execute()
    )

    if not response.data:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Staff member not found",
        )

    return response.data[0]


def deactivate_staff(profile_id: str, org_id: str) -> dict:
    """Deactivate a staff member or delete a pending invitation."""
    supabase = get_supabase()

    # Check invitations table first (pending staff)
    invitation_response = (
        supabase.table("invitations")
        .select("id")
        .eq("id", profile_id)
        .eq("organization_id", org_id)
        .is_("accepted_at", "null")
        .maybe_single()
        .execute()
    )

    if invitation_response.data:
        # Delete pending invitation
        supabase.table("invitations").delete().eq("id", profile_id).eq(
            "organization_id", org_id
        ).execute()
        return {"message": "Pending staff member removed"}

    # Fall back to profiles table (active staff)
    response = (
        supabase.table("profiles")
        .update({"is_active": False})
        .eq("id", profile_id)
        .eq("organization_id", org_id)
        .execute()
    )

    if not response.data:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Staff member not found",
        )

    return {"message": "Staff member deactivated"}
