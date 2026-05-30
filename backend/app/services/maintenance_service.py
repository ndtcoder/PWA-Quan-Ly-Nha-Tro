from typing import Optional
from datetime import datetime

from fastapi import HTTPException, status

from app.database import get_supabase
from app.models.maintenance import (
    MaintenanceCreate,
    MaintenanceResolve,
    MaintenanceRate,
)


def validate_create(data: MaintenanceCreate, current_user: dict) -> None:
    """Validate maintenance request creation based on scope and role."""
    role = current_user["role"]

    if data.scope == "unit":
        if not data.unit_id:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="unit_id is required when scope is 'unit'",
            )
        if role == "renter":
            # Check renter has active contract for that unit
            supabase = get_supabase()
            contract_resp = (
                supabase.table("contracts")
                .select("id")
                .eq("unit_id", data.unit_id)
                .eq("renter_id", current_user["user_id"])
                .eq("status", "active")
                .execute()
            )
            if not contract_resp.data:
                raise HTTPException(
                    status_code=status.HTTP_403_FORBIDDEN,
                    detail="Renter does not have an active contract for this unit",
                )

    elif data.scope == "property":
        if role not in ("owner", "manager"):
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Only owner or manager can create property-level maintenance requests",
            )
        if not data.location_detail:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="location_detail is required when scope is 'property'",
            )


def create_request(data: MaintenanceCreate, org_id: str, user: dict) -> dict:
    """Create a new maintenance request."""
    validate_create(data, user)

    supabase = get_supabase()

    insert_data = {
        "scope": data.scope,
        "property_id": data.property_id,
        "unit_id": data.unit_id if data.scope == "unit" else None,
        "title": data.title,
        "description": data.description,
        "location_detail": data.location_detail,
        "category": data.category,
        "priority": data.priority,
        "photos": data.photos or [],
        "submitted_by": user["user_id"],
        "submitter_role": user["role"],
        "status": "open",
        "organization_id": org_id,
        "resolution_photos": [],
        "cost": 0,
    }

    response = supabase.table("maintenance_requests").insert(insert_data).execute()
    request = response.data[0]
    return _enrich_request(request, supabase)


def list_requests(
    org_id: str,
    user: dict,
    scope: Optional[str] = None,
    status_filter: Optional[str] = None,
    property_id: Optional[str] = None,
    unit_id: Optional[str] = None,
    category: Optional[str] = None,
    priority: Optional[str] = None,
) -> list:
    """List maintenance requests with role-based access control."""
    supabase = get_supabase()
    role = user["role"]
    user_id = user["user_id"]

    query = (
        supabase.table("maintenance_requests")
        .select("*")
        .eq("organization_id", org_id)
    )

    # Role-based filtering
    if role == "renter":
        query = query.eq("scope", "unit").eq("submitted_by", user_id)
    elif role in ("maintenance", "cleaner"):
        # Staff sees assigned requests
        query = query.eq("assigned_to", user_id)

    # Additional filters
    if scope:
        query = query.eq("scope", scope)
    if status_filter:
        query = query.eq("status", status_filter)
    if property_id:
        query = query.eq("property_id", property_id)
    if unit_id:
        query = query.eq("unit_id", unit_id)
    if category:
        query = query.eq("category", category)
    if priority:
        query = query.eq("priority", priority)

    response = query.order("created_at", desc=True).execute()
    requests = response.data or []

    return [_enrich_request(req, supabase) for req in requests]


def get_request(request_id: str, org_id: str, user: dict) -> dict:
    """Get a single maintenance request with access control."""
    supabase = get_supabase()

    response = (
        supabase.table("maintenance_requests")
        .select("*")
        .eq("id", request_id)
        .eq("organization_id", org_id)
        .single()
        .execute()
    )

    if not response.data:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Maintenance request not found",
        )

    request = response.data
    role = user["role"]

    # Access control
    if role == "renter" and request["submitted_by"] != user["user_id"]:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Access denied",
        )
    if role in ("maintenance", "cleaner"):
        if request.get("assigned_to") != user["user_id"]:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Access denied",
            )

    return _enrich_request(request, supabase)


def assign_request(request_id: str, assigned_to: str, org_id: str) -> dict:
    """Assign a maintenance request to a staff member."""
    supabase = get_supabase()

    update_data = {
        "assigned_to": assigned_to,
        "assigned_at": datetime.utcnow().isoformat(),
        "status": "assigned",
    }

    response = (
        supabase.table("maintenance_requests")
        .update(update_data)
        .eq("id", request_id)
        .eq("organization_id", org_id)
        .execute()
    )

    if not response.data:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Maintenance request not found",
        )

    return _enrich_request(response.data[0], supabase)


def update_status(request_id: str, new_status: str, org_id: str) -> dict:
    """Update maintenance request status to 'in_progress'."""
    supabase = get_supabase()

    response = (
        supabase.table("maintenance_requests")
        .update({"status": new_status})
        .eq("id", request_id)
        .eq("organization_id", org_id)
        .execute()
    )

    if not response.data:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Maintenance request not found",
        )

    return _enrich_request(response.data[0], supabase)


def resolve_request(request_id: str, data: MaintenanceResolve, org_id: str) -> dict:
    """Resolve a maintenance request."""
    supabase = get_supabase()

    update_data = {
        "status": "resolved",
        "resolved_at": datetime.utcnow().isoformat(),
        "resolution_notes": data.resolution_notes,
        "cost": data.cost,
        "resolution_photos": data.resolution_photos or [],
    }

    response = (
        supabase.table("maintenance_requests")
        .update(update_data)
        .eq("id", request_id)
        .eq("organization_id", org_id)
        .execute()
    )

    if not response.data:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Maintenance request not found",
        )

    return _enrich_request(response.data[0], supabase)


def rate_request(
    request_id: str, data: MaintenanceRate, org_id: str, user_id: str
) -> dict:
    """Rate a resolved maintenance request (only by the renter who submitted)."""
    supabase = get_supabase()

    # Get the request first
    req_resp = (
        supabase.table("maintenance_requests")
        .select("*")
        .eq("id", request_id)
        .eq("organization_id", org_id)
        .single()
        .execute()
    )

    if not req_resp.data:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Maintenance request not found",
        )

    request = req_resp.data

    if request["submitted_by"] != user_id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Only the submitter can rate this request",
        )

    if request["scope"] != "unit":
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Only unit-level requests can be rated",
        )

    if request["status"] != "resolved":
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Can only rate resolved requests",
        )

    update_data = {
        "renter_rating": data.rating,
        "renter_feedback": data.feedback,
    }

    response = (
        supabase.table("maintenance_requests")
        .update(update_data)
        .eq("id", request_id)
        .eq("organization_id", org_id)
        .execute()
    )

    return _enrich_request(response.data[0], supabase)


def get_property_maintenance(property_id: str, org_id: str) -> list:
    """Get all maintenance requests for a property (both scopes)."""
    supabase = get_supabase()

    response = (
        supabase.table("maintenance_requests")
        .select("*")
        .eq("property_id", property_id)
        .eq("organization_id", org_id)
        .order("created_at", desc=True)
        .execute()
    )

    requests = response.data or []
    return [_enrich_request(req, supabase) for req in requests]


def get_unit_maintenance_history(unit_id: str, org_id: str) -> list:
    """Get unit-level maintenance requests only."""
    supabase = get_supabase()

    response = (
        supabase.table("maintenance_requests")
        .select("*")
        .eq("unit_id", unit_id)
        .eq("scope", "unit")
        .eq("organization_id", org_id)
        .order("created_at", desc=True)
        .execute()
    )

    requests = response.data or []
    return [_enrich_request(req, supabase) for req in requests]


def _enrich_request(request: dict, supabase) -> dict:
    """Enrich a maintenance request with related names."""
    property_name = None
    unit_number = None
    submitter_name = None
    assigned_to_name = None

    if request.get("property_id"):
        prop_resp = (
            supabase.table("properties")
            .select("name")
            .eq("id", request["property_id"])
            .single()
            .execute()
        )
        if prop_resp.data:
            property_name = prop_resp.data["name"]

    if request.get("unit_id"):
        unit_resp = (
            supabase.table("units")
            .select("unit_number")
            .eq("id", request["unit_id"])
            .single()
            .execute()
        )
        if unit_resp.data:
            unit_number = unit_resp.data["unit_number"]

    if request.get("submitted_by"):
        profile_resp = (
            supabase.table("profiles")
            .select("full_name")
            .eq("id", request["submitted_by"])
            .single()
            .execute()
        )
        if profile_resp.data:
            submitter_name = profile_resp.data["full_name"]

    if request.get("assigned_to"):
        profile_resp = (
            supabase.table("profiles")
            .select("full_name")
            .eq("id", request["assigned_to"])
            .single()
            .execute()
        )
        if profile_resp.data:
            assigned_to_name = profile_resp.data["full_name"]

    return {
        "id": request["id"],
        "scope": request["scope"],
        "property_id": request["property_id"],
        "property_name": property_name,
        "unit_id": request.get("unit_id"),
        "unit_number": unit_number,
        "submitted_by": request["submitted_by"],
        "submitter_name": submitter_name,
        "submitter_role": request.get("submitter_role"),
        "title": request["title"],
        "description": request.get("description"),
        "location_detail": request.get("location_detail"),
        "category": request["category"],
        "priority": request.get("priority", "normal"),
        "status": request.get("status", "open"),
        "photos": request.get("photos", []),
        "assigned_to": request.get("assigned_to"),
        "assigned_to_name": assigned_to_name,
        "assigned_at": request.get("assigned_at"),
        "resolved_at": request.get("resolved_at"),
        "resolution_notes": request.get("resolution_notes"),
        "resolution_photos": request.get("resolution_photos", []),
        "cost": request.get("cost", 0),
        "renter_rating": request.get("renter_rating"),
        "renter_feedback": request.get("renter_feedback"),
        "created_at": request.get("created_at"),
        "updated_at": request.get("updated_at"),
    }
