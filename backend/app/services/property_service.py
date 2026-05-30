import json
from typing import Optional

from fastapi import HTTPException, status

from app.database import get_supabase
from app.models.property import (
    PropertyCreate,
    PropertyUpdate,
    UnitCreate,
    UnitUpdate,
)


def list_properties(
    org_id: str,
    city: Optional[str] = None,
    property_type: Optional[str] = None,
) -> list:
    """List all properties for an organization, optionally filtered."""
    supabase = get_supabase()

    query = (
        supabase.table("properties")
        .select("*")
        .eq("organization_id", org_id)
        .eq("is_deleted", False)
    )

    if city:
        query = query.ilike("city", f"%{city}%")
    if property_type:
        query = query.eq("property_type", property_type)

    response = query.order("created_at", desc=True).execute()
    properties = response.data or []

    # Attach occupied_units count for each property
    for prop in properties:
        units_response = (
            supabase.table("units")
            .select("status")
            .eq("property_id", prop["id"])
            .eq("organization_id", org_id)
            .execute()
        )
        units = units_response.data or []
        prop["occupied_units"] = sum(1 for u in units if u.get("status") == "occupied")

    return properties


def create_property(data: PropertyCreate, user: dict) -> dict:
    """Create a new property."""
    supabase = get_supabase()

    property_data = {
        "name": data.name,
        "address": data.address,
        "ward": data.ward,
        "district": data.district,
        "city": data.city,
        "property_type": data.property_type,
        "description": data.description,
        "organization_id": user["organization_id"],
        "created_by": user["user_id"],
        "total_units": 0,
    }

    response = supabase.table("properties").insert(property_data).execute()
    prop = response.data[0]
    prop["occupied_units"] = 0
    return prop


def get_property(property_id: str, org_id: str) -> dict:
    """Get a single property with unit counts."""
    supabase = get_supabase()

    response = (
        supabase.table("properties")
        .select("*")
        .eq("id", property_id)
        .eq("organization_id", org_id)
        .eq("is_deleted", False)
        .single()
        .execute()
    )
    prop = response.data

    if not prop:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Property not found",
        )

    # Count units
    units_response = (
        supabase.table("units")
        .select("status")
        .eq("property_id", property_id)
        .eq("organization_id", org_id)
        .execute()
    )
    units = units_response.data or []
    prop["total_units"] = len(units)
    prop["occupied_units"] = sum(1 for u in units if u.get("status") == "occupied")

    return prop


def update_property(property_id: str, data: PropertyUpdate, org_id: str) -> dict:
    """Update a property with only the provided fields."""
    supabase = get_supabase()

    update_data = data.model_dump(exclude_none=True)
    if not update_data:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="No fields to update",
        )

    response = (
        supabase.table("properties")
        .update(update_data)
        .eq("id", property_id)
        .eq("organization_id", org_id)
        .eq("is_deleted", False)
        .execute()
    )

    if not response.data:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Property not found",
        )

    return response.data[0]


def delete_property(property_id: str, org_id: str) -> dict:
    """Soft delete a property. Returns 409 if active contracts exist on any unit."""
    supabase = get_supabase()

    # Check for active contracts on any unit of this property
    units_response = (
        supabase.table("units")
        .select("id")
        .eq("property_id", property_id)
        .eq("organization_id", org_id)
        .execute()
    )
    unit_ids = [u["id"] for u in (units_response.data or [])]

    if unit_ids:
        contracts_response = (
            supabase.table("contracts")
            .select("id")
            .in_("unit_id", unit_ids)
            .eq("status", "active")
            .execute()
        )
        if contracts_response.data:
            raise HTTPException(
                status_code=status.HTTP_409_CONFLICT,
                detail="Cannot delete property with active contracts",
            )

    # Soft delete
    response = (
        supabase.table("properties")
        .update({"is_deleted": True})
        .eq("id", property_id)
        .eq("organization_id", org_id)
        .execute()
    )

    if not response.data:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Property not found",
        )

    return {"message": "Property deleted successfully"}


def list_units(
    property_id: str,
    org_id: str,
    unit_status: Optional[str] = None,
) -> list:
    """List all units for a property, optionally filtered by status."""
    supabase = get_supabase()

    query = (
        supabase.table("units")
        .select("*")
        .eq("property_id", property_id)
        .eq("organization_id", org_id)
    )

    if unit_status:
        query = query.eq("status", unit_status)

    response = query.order("unit_number").execute()
    return response.data or []


def create_unit(property_id: str, data: UnitCreate, org_id: str) -> dict:
    """Create a unit for a property and update total_units count."""
    supabase = get_supabase()

    # Verify property exists and belongs to the org
    prop_response = (
        supabase.table("properties")
        .select("id, total_units")
        .eq("id", property_id)
        .eq("organization_id", org_id)
        .eq("is_deleted", False)
        .single()
        .execute()
    )

    if not prop_response.data:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Property not found",
        )

    # Serialize amenities as JSON
    amenities_value = data.amenities if isinstance(data.amenities, list) else []

    unit_data = {
        "property_id": property_id,
        "organization_id": org_id,
        "unit_number": data.unit_number,
        "floor": data.floor,
        "area_sqm": data.area_sqm,
        "base_rent": data.base_rent,
        "deposit_amount": data.deposit_amount,
        "max_occupants": data.max_occupants,
        "amenities": json.dumps(amenities_value),
        "notes": data.notes,
        "status": "vacant",
    }

    response = supabase.table("units").insert(unit_data).execute()
    unit = response.data[0]

    # Update property total_units count
    current_total = prop_response.data.get("total_units", 0) or 0
    supabase.table("properties").update(
        {"total_units": current_total + 1}
    ).eq("id", property_id).execute()

    return unit


def get_unit(unit_id: str, org_id: str) -> dict:
    """Get a unit with current renter name if occupied."""
    supabase = get_supabase()

    response = (
        supabase.table("units")
        .select("*")
        .eq("id", unit_id)
        .eq("organization_id", org_id)
        .single()
        .execute()
    )
    unit = response.data

    if not unit:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Unit not found",
        )

    # Get current renter if occupied
    unit["current_renter_name"] = None
    if unit.get("status") == "occupied":
        contract_response = (
            supabase.table("contracts")
            .select("renter_id")
            .eq("unit_id", unit_id)
            .eq("status", "active")
            .limit(1)
            .execute()
        )
        if contract_response.data:
            renter_id = contract_response.data[0]["renter_id"]
            renter_response = (
                supabase.table("renter_profiles")
                .select("full_name")
                .eq("id", renter_id)
                .single()
                .execute()
            )
            if renter_response.data:
                unit["current_renter_name"] = renter_response.data["full_name"]

    return unit


def update_unit(unit_id: str, data: UnitUpdate, org_id: str) -> dict:
    """Update a unit with only the provided fields."""
    supabase = get_supabase()

    update_data = data.model_dump(exclude_none=True)
    if not update_data:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="No fields to update",
        )

    # Serialize amenities if present
    if "amenities" in update_data:
        update_data["amenities"] = json.dumps(update_data["amenities"])

    response = (
        supabase.table("units")
        .update(update_data)
        .eq("id", unit_id)
        .eq("organization_id", org_id)
        .execute()
    )

    if not response.data:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Unit not found",
        )

    return response.data[0]


def delete_unit(unit_id: str, org_id: str) -> dict:
    """Delete a unit. Returns 409 if unit is occupied."""
    supabase = get_supabase()

    # Check unit status
    unit_response = (
        supabase.table("units")
        .select("id, status, property_id")
        .eq("id", unit_id)
        .eq("organization_id", org_id)
        .single()
        .execute()
    )

    if not unit_response.data:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Unit not found",
        )

    if unit_response.data["status"] == "occupied":
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="Cannot delete an occupied unit",
        )

    property_id = unit_response.data["property_id"]

    # Delete unit
    supabase.table("units").delete().eq("id", unit_id).eq(
        "organization_id", org_id
    ).execute()

    # Update property total_units count
    prop_response = (
        supabase.table("properties")
        .select("total_units")
        .eq("id", property_id)
        .single()
        .execute()
    )
    if prop_response.data:
        current_total = prop_response.data.get("total_units", 1) or 1
        supabase.table("properties").update(
            {"total_units": max(0, current_total - 1)}
        ).eq("id", property_id).execute()

    return {"message": "Unit deleted successfully"}


def get_unit_history(unit_id: str, org_id: str) -> list:
    """Get contract history for a unit."""
    supabase = get_supabase()

    # Verify unit exists
    unit_response = (
        supabase.table("units")
        .select("id")
        .eq("id", unit_id)
        .eq("organization_id", org_id)
        .single()
        .execute()
    )

    if not unit_response.data:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Unit not found",
        )

    # Get all contracts for this unit
    contracts_response = (
        supabase.table("contracts")
        .select("id, contract_number, renter_id, start_date, end_date, status, monthly_rent")
        .eq("unit_id", unit_id)
        .eq("organization_id", org_id)
        .order("start_date", desc=True)
        .execute()
    )
    contracts = contracts_response.data or []

    # Enrich with renter names
    history = []
    for contract in contracts:
        renter_name = "Unknown"
        if contract.get("renter_id"):
            renter_response = (
                supabase.table("renter_profiles")
                .select("full_name")
                .eq("id", contract["renter_id"])
                .single()
                .execute()
            )
            if renter_response.data:
                renter_name = renter_response.data["full_name"]

        history.append({
            "id": contract["id"],
            "contract_number": contract.get("contract_number"),
            "renter_name": renter_name,
            "start_date": contract["start_date"],
            "end_date": contract["end_date"],
            "status": contract["status"],
            "monthly_rent": float(contract["monthly_rent"]),
        })

    return history
