from slugify import slugify

from app.database import get_supabase
from app.models.organization import OrganizationUpdate


def get_organization(org_id: str) -> dict:
    """Fetch organization by ID."""
    supabase = get_supabase()

    response = (
        supabase.table("organizations")
        .select("*")
        .eq("id", org_id)
        .single()
        .execute()
    )
    org = response.data

    return {
        "id": org["id"],
        "name": org["name"],
        "slug": org.get("slug", ""),
        "subscription_plan": org.get("subscription_plan"),
        "created_at": org.get("created_at"),
    }


def update_organization(org_id: str, data: OrganizationUpdate) -> dict:
    """Update organization name and slug.

    If slug is not provided, it is auto-generated from the name.
    Checks slug uniqueness (excluding the current org).
    """
    supabase = get_supabase()

    # Generate slug from name if not provided
    new_slug = data.slug if data.slug else slugify(data.name)

    # Check slug uniqueness (exclude current org)
    existing = (
        supabase.table("organizations")
        .select("id")
        .eq("slug", new_slug)
        .neq("id", org_id)
        .execute()
    )

    if existing.data and len(existing.data) > 0:
        raise ValueError("Slug already taken by another organization")

    # Update organization
    update_data = {
        "name": data.name,
        "slug": new_slug,
    }

    response = (
        supabase.table("organizations")
        .update(update_data)
        .eq("id", org_id)
        .execute()
    )

    updated_org = response.data[0] if response.data else None

    if not updated_org:
        raise ValueError("Organization not found")

    return {
        "id": updated_org["id"],
        "name": updated_org["name"],
        "slug": updated_org.get("slug", ""),
        "subscription_plan": updated_org.get("subscription_plan"),
        "created_at": updated_org.get("created_at"),
    }
