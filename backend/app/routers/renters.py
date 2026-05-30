from typing import Optional

from fastapi import APIRouter, Depends, Query, UploadFile, File

from app.dependencies import get_current_user, require_roles
from app.models.renter import RenterCreate, RenterUpdate, RenterResponse, RenterDetailResponse
from app.services import renter_service

router = APIRouter(prefix="/renters", tags=["renters"])


@router.get("", response_model=list[RenterResponse])
async def list_renters(
    search: Optional[str] = Query(None),
    has_active_contract: Optional[bool] = Query(None),
    current_user: dict = Depends(get_current_user),
):
    """List renters for the organization."""
    return renter_service.list_renters(
        org_id=current_user["organization_id"],
        search=search,
        has_active_contract=has_active_contract,
    )


@router.post("", response_model=RenterResponse, status_code=201)
async def create_renter(
    data: RenterCreate,
    current_user: dict = Depends(require_roles(["owner", "manager"])),
):
    """Create a new renter profile."""
    return renter_service.create_renter(
        data=data,
        org_id=current_user["organization_id"],
    )


@router.get("/{renter_id}", response_model=RenterDetailResponse)
async def get_renter(
    renter_id: str,
    current_user: dict = Depends(get_current_user),
):
    """Get renter detail with contracts history."""
    return renter_service.get_renter_detail(
        renter_id=renter_id,
        org_id=current_user["organization_id"],
    )


@router.patch("/{renter_id}", response_model=RenterResponse)
async def update_renter(
    renter_id: str,
    data: RenterUpdate,
    current_user: dict = Depends(require_roles(["owner", "manager"])),
):
    """Update a renter profile."""
    updated = renter_service.update_renter(
        renter_id=renter_id,
        data=data,
        org_id=current_user["organization_id"],
    )
    return updated


@router.post("/{renter_id}/invite")
async def invite_renter(
    renter_id: str,
    current_user: dict = Depends(require_roles(["owner", "manager"])),
):
    """Send invitation to renter."""
    return renter_service.invite_renter(
        renter_id=renter_id,
        org_id=current_user["organization_id"],
    )


@router.post("/{renter_id}/id-front")
async def upload_id_front(
    renter_id: str,
    file: UploadFile = File(...),
    current_user: dict = Depends(require_roles(["owner", "manager"])),
):
    """Upload ID photo (front side)."""
    file_bytes = await file.read()
    return renter_service.upload_id_photo(
        renter_id=renter_id,
        side="front",
        file_bytes=file_bytes,
        filename=file.filename or "id_front.jpg",
        org_id=current_user["organization_id"],
    )


@router.post("/{renter_id}/id-back")
async def upload_id_back(
    renter_id: str,
    file: UploadFile = File(...),
    current_user: dict = Depends(require_roles(["owner", "manager"])),
):
    """Upload ID photo (back side)."""
    file_bytes = await file.read()
    return renter_service.upload_id_photo(
        renter_id=renter_id,
        side="back",
        file_bytes=file_bytes,
        filename=file.filename or "id_back.jpg",
        org_id=current_user["organization_id"],
    )
