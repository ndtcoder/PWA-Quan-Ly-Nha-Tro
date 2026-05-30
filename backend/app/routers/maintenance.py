from typing import Optional

from fastapi import APIRouter, Depends, Query, UploadFile, File

from app.dependencies import get_current_user, require_roles
from app.models.maintenance import (
    MaintenanceCreate,
    MaintenanceAssign,
    MaintenanceResolve,
    MaintenanceRate,
    MaintenanceStatusUpdate,
    MaintenanceResponse,
)
from app.services import maintenance_service

router = APIRouter(prefix="/maintenance", tags=["maintenance"])


@router.get("", response_model=list[MaintenanceResponse])
async def list_maintenance_requests(
    scope: Optional[str] = Query(None),
    status: Optional[str] = Query(None),
    property_id: Optional[str] = Query(None),
    unit_id: Optional[str] = Query(None),
    category: Optional[str] = Query(None),
    priority: Optional[str] = Query(None),
    current_user: dict = Depends(get_current_user),
):
    """List maintenance requests with filters."""
    return maintenance_service.list_requests(
        org_id=current_user["organization_id"],
        user=current_user,
        scope=scope,
        status_filter=status,
        property_id=property_id,
        unit_id=unit_id,
        category=category,
        priority=priority,
    )


@router.post("", response_model=MaintenanceResponse, status_code=201)
async def create_maintenance_request(
    data: MaintenanceCreate,
    current_user: dict = Depends(get_current_user),
):
    """Create a new maintenance request."""
    return maintenance_service.create_request(
        data=data,
        org_id=current_user["organization_id"],
        user=current_user,
    )


@router.get("/{request_id}", response_model=MaintenanceResponse)
async def get_maintenance_request(
    request_id: str,
    current_user: dict = Depends(get_current_user),
):
    """Get a single maintenance request."""
    return maintenance_service.get_request(
        request_id=request_id,
        org_id=current_user["organization_id"],
        user=current_user,
    )


@router.patch("/{request_id}/assign", response_model=MaintenanceResponse)
async def assign_maintenance_request(
    request_id: str,
    data: MaintenanceAssign,
    current_user: dict = Depends(require_roles(["owner", "manager"])),
):
    """Assign a maintenance request to a staff member."""
    return maintenance_service.assign_request(
        request_id=request_id,
        assigned_to=data.assigned_to,
        org_id=current_user["organization_id"],
    )


@router.patch("/{request_id}/status", response_model=MaintenanceResponse)
async def update_maintenance_status(
    request_id: str,
    data: MaintenanceStatusUpdate,
    current_user: dict = Depends(get_current_user),
):
    """Update maintenance request status to in_progress."""
    return maintenance_service.update_status(
        request_id=request_id,
        new_status=data.status,
        org_id=current_user["organization_id"],
    )


@router.post("/{request_id}/resolve", response_model=MaintenanceResponse)
async def resolve_maintenance_request(
    request_id: str,
    data: MaintenanceResolve,
    current_user: dict = Depends(get_current_user),
):
    """Resolve a maintenance request."""
    return maintenance_service.resolve_request(
        request_id=request_id,
        data=data,
        org_id=current_user["organization_id"],
    )


@router.post("/{request_id}/rate", response_model=MaintenanceResponse)
async def rate_maintenance_request(
    request_id: str,
    data: MaintenanceRate,
    current_user: dict = Depends(get_current_user),
):
    """Rate a resolved maintenance request (renter only)."""
    return maintenance_service.rate_request(
        request_id=request_id,
        data=data,
        org_id=current_user["organization_id"],
        user_id=current_user["user_id"],
    )


@router.post("/{request_id}/photos")
async def upload_maintenance_photos(
    request_id: str,
    files: list[UploadFile] = File(...),
    current_user: dict = Depends(get_current_user),
):
    """Upload photos for a maintenance request (up to 5 images)."""
    if len(files) > 5:
        from fastapi import HTTPException, status as http_status
        raise HTTPException(
            status_code=http_status.HTTP_400_BAD_REQUEST,
            detail="Maximum 5 photos allowed",
        )
    # In production, upload to storage and return URLs
    # For now, return placeholder
    return {"message": f"Uploaded {len(files)} photos", "request_id": request_id}


# Property and Unit maintenance endpoints
properties_maintenance_router = APIRouter(tags=["maintenance"])


@properties_maintenance_router.get(
    "/properties/{property_id}/maintenance",
    response_model=list[MaintenanceResponse],
)
async def get_property_maintenance(
    property_id: str,
    current_user: dict = Depends(get_current_user),
):
    """Get all maintenance requests for a property."""
    return maintenance_service.get_property_maintenance(
        property_id=property_id,
        org_id=current_user["organization_id"],
    )


@properties_maintenance_router.get(
    "/units/{unit_id}/maintenance-history",
    response_model=list[MaintenanceResponse],
)
async def get_unit_maintenance_history(
    unit_id: str,
    current_user: dict = Depends(get_current_user),
):
    """Get maintenance history for a unit."""
    return maintenance_service.get_unit_maintenance_history(
        unit_id=unit_id,
        org_id=current_user["organization_id"],
    )
