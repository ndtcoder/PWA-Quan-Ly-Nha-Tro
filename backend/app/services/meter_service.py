"""Meter reading service for managing meter readings with AI OCR."""

from datetime import datetime
from typing import Optional

from fastapi import HTTPException, status

from app.database import get_supabase
from app.services.ocr_service import ocr_meter_image


def upload_reading(
    unit_id: str,
    meter_type: str,
    billing_month: str,
    previous_reading: Optional[float],
    image_bytes: bytes,
    filename: str,
    org_id: str,
    user_id: str,
) -> dict:
    """Upload a meter reading image, run OCR, and create the reading record."""
    supabase = get_supabase()

    # Validate unit belongs to org
    unit_response = (
        supabase.table("units")
        .select("*, properties(id, name, organization_id)")
        .eq("id", unit_id)
        .single()
        .execute()
    )
    unit = unit_response.data
    if not unit:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Unit not found",
        )

    property_data = unit.get("properties", {})
    if property_data.get("organization_id") != org_id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Unit does not belong to your organization",
        )

    # Check no approved reading exists for same unit+type+month
    existing = (
        supabase.table("meter_readings")
        .select("id")
        .eq("unit_id", unit_id)
        .eq("meter_type", meter_type)
        .eq("billing_month", billing_month)
        .eq("is_approved", True)
        .execute()
    )
    if existing.data:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="An approved reading already exists for this unit, type, and month",
        )

    # Upload image to Supabase Storage
    month_formatted = billing_month.replace("-", "")
    storage_path = f"meter-photos/{org_id}/{unit_id}/{month_formatted}_{meter_type}.jpg"

    try:
        supabase.storage.from_("meter-photos").upload(
            storage_path,
            image_bytes,
            file_options={"content-type": "image/jpeg", "upsert": "true"},
        )
        photo_url = supabase.storage.from_("meter-photos").get_public_url(storage_path)
    except Exception:
        photo_url = f"/storage/meter-photos/{storage_path}"

    # Call OCR service
    ocr_result = ocr_meter_image(image_bytes)
    ai_detected_value = ocr_result.get("detected_value")
    ai_confidence = ocr_result.get("confidence", 0.0)

    # Calculate preliminary consumption if possible
    consumption = None
    if previous_reading is not None and ai_detected_value is not None:
        consumption = ai_detected_value - previous_reading
        if consumption < 0:
            consumption = None  # Invalid reading

    # Default unit prices
    unit_price = 3500.0 if meter_type == "electricity" else 15000.0

    now = datetime.now().isoformat()

    reading_data = {
        "unit_id": unit_id,
        "meter_type": meter_type,
        "billing_month": billing_month,
        "previous_reading": previous_reading,
        "current_reading": ai_detected_value,
        "consumption": consumption,
        "unit_price": unit_price,
        "photo_url": photo_url,
        "ai_detected_value": ai_detected_value,
        "ai_confidence": ai_confidence,
        "is_approved": False,
        "organization_id": org_id,
        "submitted_by": user_id,
        "submitted_at": now,
    }

    response = supabase.table("meter_readings").insert(reading_data).execute()
    reading = response.data[0]

    return _enrich_reading(reading, supabase)


def list_readings(
    org_id: str,
    unit_id: Optional[str] = None,
    meter_type: Optional[str] = None,
    billing_month: Optional[str] = None,
    is_approved: Optional[bool] = None,
) -> list:
    """List meter readings for the organization with optional filters."""
    supabase = get_supabase()

    query = (
        supabase.table("meter_readings")
        .select("*")
        .eq("organization_id", org_id)
    )

    if unit_id:
        query = query.eq("unit_id", unit_id)
    if meter_type:
        query = query.eq("meter_type", meter_type)
    if billing_month:
        query = query.eq("billing_month", billing_month)
    if is_approved is not None:
        query = query.eq("is_approved", is_approved)

    response = query.order("submitted_at", desc=True).execute()
    readings = response.data or []

    return [_enrich_reading(r, supabase) for r in readings]


def get_reading(reading_id: str, org_id: str) -> dict:
    """Get a single meter reading by ID."""
    supabase = get_supabase()

    response = (
        supabase.table("meter_readings")
        .select("*")
        .eq("id", reading_id)
        .eq("organization_id", org_id)
        .single()
        .execute()
    )
    reading = response.data

    if not reading:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Meter reading not found",
        )

    return _enrich_reading(reading, supabase)


def approve_reading(
    reading_id: str,
    org_id: str,
    approved_value: Optional[float] = None,
    reviewer_id: Optional[str] = None,
) -> dict:
    """Approve a meter reading, optionally overriding the AI value."""
    supabase = get_supabase()

    response = (
        supabase.table("meter_readings")
        .select("*")
        .eq("id", reading_id)
        .eq("organization_id", org_id)
        .single()
        .execute()
    )
    reading = response.data

    if not reading:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Meter reading not found",
        )

    now = datetime.now().isoformat()

    update_data: dict = {
        "is_approved": True,
        "reviewed_by": reviewer_id,
        "reviewed_at": now,
    }

    if approved_value is not None:
        # Manual override
        update_data["manual_override_value"] = approved_value
        update_data["current_reading"] = approved_value
    else:
        # Use AI detected value
        ai_val = reading.get("ai_detected_value")
        if ai_val is not None:
            update_data["current_reading"] = ai_val

    # Calculate consumption
    current = update_data.get("current_reading") or reading.get("current_reading")
    previous = reading.get("previous_reading")
    if current is not None and previous is not None:
        consumption = current - previous
        update_data["consumption"] = consumption if consumption >= 0 else 0
    elif current is not None:
        update_data["consumption"] = None

    updated = (
        supabase.table("meter_readings")
        .update(update_data)
        .eq("id", reading_id)
        .execute()
    )

    return _enrich_reading(updated.data[0], supabase)


def get_unit_meter_history(unit_id: str, org_id: str) -> list[dict]:
    """Get last 12 months of meter readings for a unit (both electricity and water)."""
    supabase = get_supabase()

    # Validate unit belongs to org
    unit_response = (
        supabase.table("units")
        .select("*, properties(organization_id)")
        .eq("id", unit_id)
        .single()
        .execute()
    )
    unit = unit_response.data
    if not unit:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Unit not found",
        )

    property_data = unit.get("properties", {})
    if property_data.get("organization_id") != org_id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Unit does not belong to your organization",
        )

    # Get approved readings for this unit, last 12 months
    response = (
        supabase.table("meter_readings")
        .select("*")
        .eq("unit_id", unit_id)
        .eq("is_approved", True)
        .order("billing_month", desc=True)
        .limit(24)  # 12 months x 2 types
        .execute()
    )
    readings = response.data or []

    # Group by billing_month
    history_map: dict = {}
    for r in readings:
        month = r.get("billing_month", "")
        if month not in history_map:
            history_map[month] = {
                "billing_month": month,
                "electricity_consumption": None,
                "electricity_cost": None,
                "water_consumption": None,
                "water_cost": None,
            }

        consumption = r.get("consumption")
        unit_price = r.get("unit_price", 0)

        if r.get("meter_type") == "electricity":
            history_map[month]["electricity_consumption"] = consumption
            if consumption is not None:
                history_map[month]["electricity_cost"] = consumption * (unit_price or 3500)
        elif r.get("meter_type") == "water":
            history_map[month]["water_consumption"] = consumption
            if consumption is not None:
                history_map[month]["water_cost"] = consumption * (unit_price or 15000)

    # Sort by month ascending and take last 12
    sorted_months = sorted(history_map.keys())[-12:]
    return [history_map[m] for m in sorted_months]


def _enrich_reading(reading: dict, supabase) -> dict:
    """Add unit_number and property_name to a meter reading."""
    unit_number = None
    property_name = None

    if reading.get("unit_id"):
        unit_resp = (
            supabase.table("units")
            .select("unit_number, property_id, properties(name)")
            .eq("id", reading["unit_id"])
            .single()
            .execute()
        )
        if unit_resp.data:
            unit_number = unit_resp.data.get("unit_number")
            props = unit_resp.data.get("properties", {})
            if props:
                property_name = props.get("name")

    return {
        "id": reading["id"],
        "unit_id": reading.get("unit_id", ""),
        "unit_number": unit_number,
        "property_name": property_name,
        "meter_type": reading.get("meter_type", "electricity"),
        "billing_month": reading.get("billing_month", ""),
        "previous_reading": reading.get("previous_reading"),
        "current_reading": reading.get("current_reading"),
        "consumption": reading.get("consumption"),
        "unit_price": reading.get("unit_price"),
        "photo_url": reading.get("photo_url"),
        "ai_detected_value": reading.get("ai_detected_value"),
        "ai_confidence": reading.get("ai_confidence"),
        "is_approved": reading.get("is_approved", False),
        "manual_override_value": reading.get("manual_override_value"),
        "submitted_by": reading.get("submitted_by"),
        "submitted_at": reading.get("submitted_at"),
        "reviewed_by": reading.get("reviewed_by"),
        "reviewed_at": reading.get("reviewed_at"),
    }
