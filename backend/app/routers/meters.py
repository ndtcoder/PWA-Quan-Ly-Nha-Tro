"""Meter readings router with AI OCR support."""

from typing import Optional

from fastapi import APIRouter, Depends, File, Form, Query, UploadFile

from app.dependencies import get_current_user, require_roles
from app.models.meter import (
    MeterHistoryItem,
    MeterReadingApprove,
    MeterReadingResponse,
)
from app.services import meter_service

router = APIRouter(tags=["meters"])


@router.post("/meter-readings/upload", response_model=MeterReadingResponse)
async def upload_meter_reading(
    image: UploadFile = File(...),
    unit_id: str = Form(...),
    meter_type: str = Form(...),
    billing_month: str = Form(...),
    previous_reading: Optional[float] = Form(None),
    current_user: dict = Depends(require_roles(["owner", "manager", "staff"])),
):
    """Upload a meter reading image for AI OCR processing."""
    image_bytes = await image.read()
    return meter_service.upload_reading(
        unit_id=unit_id,
        meter_type=meter_type,
        billing_month=billing_month,
        previous_reading=previous_reading,
        image_bytes=image_bytes,
        filename=image.filename or "meter.jpg",
        org_id=current_user["organization_id"],
        user_id=current_user["user_id"],
    )


@router.get("/meter-readings", response_model=list[MeterReadingResponse])
async def list_meter_readings(
    unit_id: Optional[str] = Query(None),
    meter_type: Optional[str] = Query(None),
    billing_month: Optional[str] = Query(None),
    is_approved: Optional[bool] = Query(None),
    current_user: dict = Depends(get_current_user),
):
    """List meter readings with optional filters."""
    return meter_service.list_readings(
        org_id=current_user["organization_id"],
        unit_id=unit_id,
        meter_type=meter_type,
        billing_month=billing_month,
        is_approved=is_approved,
    )


@router.get("/meter-readings/{reading_id}", response_model=MeterReadingResponse)
async def get_meter_reading(
    reading_id: str,
    current_user: dict = Depends(get_current_user),
):
    """Get a single meter reading by ID."""
    return meter_service.get_reading(
        reading_id=reading_id,
        org_id=current_user["organization_id"],
    )


@router.patch("/meter-readings/{reading_id}/approve", response_model=MeterReadingResponse)
async def approve_meter_reading(
    reading_id: str,
    body: MeterReadingApprove,
    current_user: dict = Depends(require_roles(["owner", "manager"])),
):
    """Approve a meter reading, optionally overriding the AI detected value."""
    return meter_service.approve_reading(
        reading_id=reading_id,
        org_id=current_user["organization_id"],
        approved_value=body.approved_value,
        reviewer_id=current_user["user_id"],
    )


@router.get("/units/{unit_id}/meter-history", response_model=list[MeterHistoryItem])
async def get_unit_meter_history(
    unit_id: str,
    current_user: dict = Depends(get_current_user),
):
    """Get the last 12 months of meter reading history for a unit."""
    return meter_service.get_unit_meter_history(
        unit_id=unit_id,
        org_id=current_user["organization_id"],
    )
