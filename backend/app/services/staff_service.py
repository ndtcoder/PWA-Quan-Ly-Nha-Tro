from typing import Optional

from fastapi import HTTPException, status

from app.database import get_supabase
from app.models.staff import StaffRoleUpdate


def list_staff(
    org_id: str,
    role: Optional[str] = None,
    property_id: Optional[str] = None,
) -> list:
    """List staff members for the organization with optional filters."""
    supabase = get_supabase()

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

    result = []
    for profile in profiles:
        # Get assigned properties
        assignments_response = (
            supabase.table("staff_assignments")
            .select("property_id, properties(name)")
            .eq("profile_id", profile["id"])
            .execute()
        )
        assigned_properties = []
        if assignments_response.data:
            for assignment in assignments_response.data:
                prop_data = assignment.get("properties")
                if prop_data and isinstance(prop_data, dict):
                    assigned_properties.append(prop_data.get("name", ""))
                elif prop_data and isinstance(prop_data, list) and prop_data:
                    assigned_properties.append(prop_data[0].get("name", ""))

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
            "is_active": profile.get("is_active", True),
            "assigned_properties": assigned_properties,
            "created_at": profile.get("created_at"),
        })

    return result


def update_role(profile_id: str, data: StaffRoleUpdate, org_id: str) -> dict:
    """Update a staff member's role."""
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
    """Deactivate a staff member."""
    supabase = get_supabase()

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
