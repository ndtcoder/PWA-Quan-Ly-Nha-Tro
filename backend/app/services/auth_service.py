import uuid
from datetime import datetime, timedelta, timezone
from typing import Optional

from slugify import slugify

from app.database import get_supabase
from app.models.auth import (
    RegisterOwnerRequest,
    LoginRequest,
    InviteUserRequest,
    AcceptInviteRequest,
    GoogleAuthRequest,
)


def _ensure_unique_slug(supabase, base_slug: str) -> str:
    """Generate a unique slug, appending a number if the base is taken."""
    slug = base_slug
    counter = 1
    while True:
        existing = (
            supabase.table("organizations")
            .select("id")
            .eq("slug", slug)
            .execute()
        )
        if not existing.data:
            return slug
        slug = f"{base_slug}-{counter}"
        counter += 1


def register_owner(data: RegisterOwnerRequest) -> dict:
    """Register a new owner: create auth user, organization, and profile."""
    supabase = get_supabase()

    # Create auth user in Supabase
    auth_response = supabase.auth.admin.create_user(
        {
            "email": data.email,
            "password": data.password,
            "email_confirm": True,
        }
    )
    user = auth_response.user
    user_id = user.id

    # Create organization
    base_slug = slugify(data.organization_name)
    if not base_slug:
        base_slug = "org"
    org_slug = _ensure_unique_slug(supabase, base_slug)
    org_data = {
        "id": str(uuid.uuid4()),
        "name": data.organization_name,
        "slug": org_slug,
    }
    supabase.table("organizations").insert(org_data).execute()

    # Create profile (no email column - email is in auth.users)
    profile_data = {
        "id": str(user_id),
        "full_name": data.full_name,
        "role": "owner",
        "organization_id": org_data["id"],
    }
    supabase.table("profiles").insert(profile_data).execute()

    # Sign in to get access token
    sign_in_response = supabase.auth.sign_in_with_password(
        {"email": data.email, "password": data.password}
    )

    return {
        "access_token": sign_in_response.session.access_token,
        "user": {
            "id": str(user_id),
            "email": data.email,
            "role": "owner",
            "organization_id": org_data["id"],
            "full_name": data.full_name,
        },
    }


def login(data: LoginRequest) -> dict:
    """Login with email and password."""
    supabase = get_supabase()

    sign_in_response = supabase.auth.sign_in_with_password(
        {"email": data.email, "password": data.password}
    )

    user_id = sign_in_response.user.id

    # Fetch profile
    profile_response = (
        supabase.table("profiles")
        .select("*")
        .eq("id", str(user_id))
        .single()
        .execute()
    )
    profile = profile_response.data

    return {
        "access_token": sign_in_response.session.access_token,
        "user": {
            "id": str(user_id),
            "email": data.email,
            "role": profile.get("role", "renter"),
            "organization_id": profile.get("organization_id", ""),
            "full_name": profile.get("full_name"),
        },
    }


def get_profile(user_id: str) -> dict:
    """Fetch user profile from profiles table."""
    supabase = get_supabase()

    profile_response = (
        supabase.table("profiles")
        .select("*")
        .eq("id", user_id)
        .single()
        .execute()
    )
    profile = profile_response.data

    # Get email from Supabase auth user (not stored in profiles table)
    user_response = supabase.auth.admin.get_user_by_id(user_id)
    email = user_response.user.email if user_response.user else ""

    return {
        "id": profile["id"],
        "email": email,
        "role": profile["role"],
        "organization_id": profile["organization_id"],
        "full_name": profile.get("full_name"),
    }


def invite_user(data: InviteUserRequest, current_user: dict) -> dict:
    """Create an invitation record with a UUID token, expires in 48h."""
    supabase = get_supabase()

    token = str(uuid.uuid4())
    expires_at = (datetime.now(timezone.utc) + timedelta(hours=48)).isoformat()

    invitation_data = {
        "id": str(uuid.uuid4()),
        "email": data.email,
        "role": data.role,
        "token": token,
        "organization_id": current_user["organization_id"],
        "invited_by": current_user["user_id"],
        "property_id": str(data.property_id) if data.property_id else None,
        "expires_at": expires_at,
    }
    supabase.table("invitations").insert(invitation_data).execute()

    # Mock email sending
    print(f"[MOCK EMAIL] Invitation sent to {data.email} with token: {token}")

    return {
        "message": "Invitation sent successfully",
        "email": data.email,
        "token": token,
        "expires_at": expires_at,
    }


def accept_invite(data: AcceptInviteRequest) -> dict:
    """Validate invite token, create auth user, create profile."""
    supabase = get_supabase()

    # Validate token
    invite_response = (
        supabase.table("invitations")
        .select("*")
        .eq("token", data.token)
        .single()
        .execute()
    )
    invitation = invite_response.data

    if not invitation:
        raise ValueError("Invalid invitation token")

    # Check expiration
    expires_at = datetime.fromisoformat(invitation["expires_at"].replace("Z", "+00:00"))
    if datetime.now(timezone.utc) > expires_at:
        raise ValueError("Invitation has expired")

    # Create auth user
    auth_response = supabase.auth.admin.create_user(
        {
            "email": invitation["email"],
            "password": data.password,
            "email_confirm": True,
        }
    )
    user = auth_response.user
    user_id = user.id

    # Create profile (no email column - email is in auth.users)
    profile_data = {
        "id": str(user_id),
        "full_name": data.full_name,
        "role": invitation["role"],
        "organization_id": invitation["organization_id"],
    }
    supabase.table("profiles").insert(profile_data).execute()

    # If property_id exists, create staff assignment
    if invitation.get("property_id"):
        assignment_data = {
            "id": str(uuid.uuid4()),
            "user_id": str(user_id),
            "property_id": invitation["property_id"],
            "role": invitation["role"],
        }
        supabase.table("staff_assignments").insert(assignment_data).execute()

    # Delete invitation
    supabase.table("invitations").delete().eq("token", data.token).execute()

    # Sign in to get token
    sign_in_response = supabase.auth.sign_in_with_password(
        {"email": invitation["email"], "password": data.password}
    )

    return {
        "access_token": sign_in_response.session.access_token,
        "user": {
            "id": str(user_id),
            "email": invitation["email"],
            "role": invitation["role"],
            "organization_id": invitation["organization_id"],
            "full_name": data.full_name,
        },
    }


def validate_invite(token: str) -> dict:
    """Check if invitation token exists and is not expired."""
    supabase = get_supabase()

    invite_response = (
        supabase.table("invitations")
        .select("*")
        .eq("token", token)
        .single()
        .execute()
    )
    invitation = invite_response.data

    if not invitation:
        raise ValueError("Invalid invitation token")

    # Check expiration
    expires_at = datetime.fromisoformat(invitation["expires_at"].replace("Z", "+00:00"))
    if datetime.now(timezone.utc) > expires_at:
        raise ValueError("Invitation has expired")

    return {
        "email": invitation["email"],
        "role": invitation["role"],
        "organization_id": invitation["organization_id"],
    }


def google_auth(data: GoogleAuthRequest) -> dict:
    """Handle Google OAuth sign-in/sign-up.

    Uses the Supabase access token from the OAuth flow to get the user,
    then ensures a profile and organization exist.
    """
    supabase = get_supabase()

    # Use the access token to get the authenticated user from Supabase
    user_response = supabase.auth.get_user(data.access_token)
    user = user_response.user

    if not user:
        raise ValueError("Invalid access token")

    user_id = str(user.id)
    email = user.email or ""
    # Use the provided full_name, or fall back to user_metadata from Google
    full_name = data.full_name or (
        user.user_metadata.get("full_name")
        or user.user_metadata.get("name")
        or email.split("@")[0]
    )

    # Check if profile already exists
    profile_response = (
        supabase.table("profiles")
        .select("*")
        .eq("id", user_id)
        .maybe_single()
        .execute()
    )
    profile = profile_response.data if profile_response else None

    if profile:
        # Existing user - return profile
        return {
            "access_token": data.access_token,
            "user": {
                "id": user_id,
                "email": email,
                "role": profile.get("role", "owner"),
                "organization_id": profile.get("organization_id", ""),
                "full_name": profile.get("full_name", full_name),
            },
            "needs_org_setup": False,
        }

    # New user - create organization and profile
    org_name = full_name if full_name else email.split("@")[0]
    base_slug = slugify(org_name)
    if not base_slug:
        base_slug = slugify(email.split("@")[0]) or "org"
    org_slug = _ensure_unique_slug(supabase, base_slug)
    org_data = {
        "id": str(uuid.uuid4()),
        "name": org_name,
        "slug": org_slug,
    }
    supabase.table("organizations").insert(org_data).execute()

    # Create profile with owner role (no email column - email is in auth.users)
    profile_data = {
        "id": user_id,
        "full_name": full_name,
        "role": "owner",
        "organization_id": org_data["id"],
    }
    supabase.table("profiles").insert(profile_data).execute()

    return {
        "access_token": data.access_token,
        "user": {
            "id": user_id,
            "email": email,
            "role": "owner",
            "organization_id": org_data["id"],
            "full_name": full_name,
        },
        "needs_org_setup": True,
    }
