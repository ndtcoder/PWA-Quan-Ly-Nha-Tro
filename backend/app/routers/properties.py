from typing import Optional

from fastapi import APIRouter, Depends, Query

from app.dependencies import get_current_user, require_roles
from app.models.property import (
    PropertyCreate,
    PropertyUpdate,
    PropertyResponse,
    UnitCreate,
    UnitUpdate,
    UnitResponse,
    UnitHistoryResponse,
)
from app.services import property_service

router = APIRouter(prefix="/properties", tags=["properties"])

# Separate router for unit endpoints not nested under properties
units_router = APIRouter(prefix="/units", tags=["units"])


# ============================================================
# PROPERTY ENDPOINTS
# ============================================================


@router.get("", response_model=list[PropertyResponse])
async def list_properties(
    city: Optional[str] = Query(None),
    property_type: Optional[str] = Query(None),
    current_user: dict = Depends(get_current_user),
):
    """List all properties for the user's organization."""
    return property_service.list_properties(
        org_id=current_user["organization_id"],
        city=city,
        property_type=property_type,
    )


@router.post("", response_model=PropertyResponse, status_code=201)
async def create_property(
    data: PropertyCreate,
    current_user: dict = Depends(require_roles(["owner"])),
):
    """Create a new property (owner only)."""
    return property_service.create_property(data=data, user=current_user)


@router.get("/{property_id}", response_model=PropertyResponse)
async def get_property(
    property_id: str,
    current_user: dict = Depends(get_current_user),
):
    """Get property details with unit counts."""
    return property_service.get_property(
        property_id=property_id,
        org_id=current_user["organization_id"],
    )


@router.patch("/{property_id}", response_model=PropertyResponse)
async def update_property(
    property_id: str,
    data: PropertyUpdate,
    current_user: dict = Depends(require_roles(["owner"])),
):
    """Update a property (owner only)."""
    return property_service.update_property(
        property_id=property_id,
        data=data,
        org_id=current_user["organization_id"],
    )


@router.delete("/{property_id}")
async def delete_property(
    property_id: str,
    current_user: dict = Depends(require_roles(["owner"])),
):
    """Soft delete a property (owner only). Returns 409 if active contracts exist."""
    return property_service.delete_property(
        property_id=property_id,
        org_id=current_user["organization_id"],
    )


# ============================================================
# UNIT ENDPOINTS (nested under property)
# ============================================================


@router.get("/{property_id}/units", response_model=list[UnitResponse])
async def list_units(
    property_id: str,
    status: Optional[str] = Query(None),
    current_user: dict = Depends(get_current_user),
):
    """List all units for a property."""
    return property_service.list_units(
        property_id=property_id,
        org_id=current_user["organization_id"],
        unit_status=status,
    )


@router.post("/{property_id}/units", response_model=UnitResponse, status_code=201)
async def create_unit(
    property_id: str,
    data: UnitCreate,
    current_user: dict = Depends(require_roles(["owner", "manager"])),
):
    """Create a unit for a property (owner or manager)."""
    return property_service.create_unit(
        property_id=property_id,
        data=data,
        org_id=current_user["organization_id"],
    )


# ============================================================
# UNIT ENDPOINTS (standalone)
# ============================================================


@units_router.get("/{unit_id}", response_model=UnitResponse)
async def get_unit(
    unit_id: str,
    current_user: dict = Depends(get_current_user),
):
    """Get unit details with current renter info."""
    return property_service.get_unit(
        unit_id=unit_id,
        org_id=current_user["organization_id"],
    )


@units_router.patch("/{unit_id}", response_model=UnitResponse)
async def update_unit(
    unit_id: str,
    data: UnitUpdate,
    current_user: dict = Depends(require_roles(["owner", "manager"])),
):
    """Update a unit (owner or manager)."""
    return property_service.update_unit(
        unit_id=unit_id,
        data=data,
        org_id=current_user["organization_id"],
    )


@units_router.delete("/{unit_id}")
async def delete_unit(
    unit_id: str,
    current_user: dict = Depends(require_roles(["owner", "manager"])),
):
    """Delete a unit (owner or manager). Returns 409 if occupied."""
    return property_service.delete_unit(
        unit_id=unit_id,
        org_id=current_user["organization_id"],
    )


@units_router.get("/{unit_id}/history", response_model=list[UnitHistoryResponse])
async def get_unit_history(
    unit_id: str,
    current_user: dict = Depends(get_current_user),
):
    """Get contract history for a unit."""
    return property_service.get_unit_history(
        unit_id=unit_id,
        org_id=current_user["organization_id"],
    )
