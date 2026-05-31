from typing import Optional

from fastapi import HTTPException, status

from app.database import get_supabase
from app.models.renter import RenterCreate, RenterUpdate


def list_renters(
    org_id: str,
    search: Optional[str] = None,
    has_active_contract: Optional[bool] = None,
) -> list:
    """List renters for the organization with optional search and filter."""
    supabase = get_supabase()

    query = (
        supabase.table("renter_profiles")
        .select("*")
        .eq("organization_id", org_id)
    )

    if search:
        query = query.or_(
            f"full_name.ilike.%{search}%,phone.ilike.%{search}%,id_number.ilike.%{search}%"
        )

    response = query.order("created_at", desc=True).execute()
    renters = response.data or []

    # Enrich with current contract info
    result = []
    for renter in renters:
        contract_response = (
            supabase.table("contracts")
            .select("id, unit_id")
            .eq("renter_id", renter["id"])
            .eq("status", "active")
            .eq("organization_id", org_id)
            .limit(1)
            .execute()
        )
        active_contract = contract_response.data[0] if contract_response.data else None

        if has_active_contract is True and not active_contract:
            continue
        if has_active_contract is False and active_contract:
            continue

        renter_data = {
            "id": renter["id"],
            "full_name": renter["full_name"],
            "phone": renter.get("phone"),
            "email": renter.get("email"),
            "id_number": renter.get("id_number"),
            "current_unit_number": None,
            "current_property_name": None,
            "active_contract_id": None,
            "created_at": renter.get("created_at"),
        }

        if active_contract:
            renter_data["active_contract_id"] = active_contract["id"]
            # Get unit and property info
            unit_response = (
                supabase.table("units")
                .select("unit_number, property_id")
                .eq("id", active_contract["unit_id"])
                .single()
                .execute()
            )
            if unit_response.data:
                renter_data["current_unit_number"] = unit_response.data["unit_number"]
                prop_response = (
                    supabase.table("properties")
                    .select("name")
                    .eq("id", unit_response.data["property_id"])
                    .single()
                    .execute()
                )
                if prop_response.data:
                    renter_data["current_property_name"] = prop_response.data["name"]

        result.append(renter_data)

    return result


def create_renter(data: RenterCreate, org_id: str) -> dict:
    """Create a new renter profile."""
    supabase = get_supabase()

    renter_data = {
        "full_name": data.full_name,
        "phone": data.phone,
        "email": data.email,
        "id_number": data.id_number,
        "id_issued_date": data.id_issued_date,
        "id_issued_place": data.id_issued_place,
        "date_of_birth": data.date_of_birth,
        "gender": data.gender,
        "hometown": data.hometown,
        "occupation": data.occupation,
        "workplace": data.workplace,
        "emergency_contact_name": data.emergency_contact_name,
        "emergency_contact_phone": data.emergency_contact_phone,
        "organization_id": org_id,
    }

    response = supabase.table("renter_profiles").insert(renter_data).execute()
    renter = response.data[0]

    return {
        "id": renter["id"],
        "full_name": renter["full_name"],
        "phone": renter.get("phone"),
        "email": renter.get("email"),
        "id_number": renter.get("id_number"),
        "current_unit_number": None,
        "current_property_name": None,
        "active_contract_id": None,
        "created_at": renter.get("created_at"),
    }


def get_renter_detail(renter_id: str, org_id: str) -> dict:
    """Get full renter detail with contracts history."""
    supabase = get_supabase()

    response = (
        supabase.table("renter_profiles")
        .select("*")
        .eq("id", renter_id)
        .eq("organization_id", org_id)
        .single()
        .execute()
    )
    renter = response.data

    if not renter:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Renter not found",
        )

    # Get contracts history
    contracts_response = (
        supabase.table("contracts")
        .select("id, contract_number, unit_id, start_date, end_date, status, monthly_rent")
        .eq("renter_id", renter_id)
        .eq("organization_id", org_id)
        .order("start_date", desc=True)
        .execute()
    )
    contracts = contracts_response.data or []

    contracts_history = []
    for c in contracts:
        unit_number = None
        property_name = None
        if c.get("unit_id"):
            unit_resp = (
                supabase.table("units")
                .select("unit_number, property_id")
                .eq("id", c["unit_id"])
                .single()
                .execute()
            )
            if unit_resp.data:
                unit_number = unit_resp.data["unit_number"]
                prop_resp = (
                    supabase.table("properties")
                    .select("name")
                    .eq("id", unit_resp.data["property_id"])
                    .single()
                    .execute()
                )
                if prop_resp.data:
                    property_name = prop_resp.data["name"]

        contracts_history.append({
            "id": c["id"],
            "contract_number": c.get("contract_number"),
            "unit_number": unit_number,
            "property_name": property_name,
            "start_date": c["start_date"],
            "end_date": c["end_date"],
            "status": c["status"],
            "monthly_rent": float(c["monthly_rent"]),
        })

    # Get current active contract info
    active_contract = next((c for c in contracts_history if c["status"] == "active"), None)

    result = {
        "id": renter["id"],
        "full_name": renter["full_name"],
        "phone": renter.get("phone"),
        "email": renter.get("email"),
        "id_number": renter.get("id_number"),
        "id_issued_date": renter.get("id_issued_date"),
        "id_issued_place": renter.get("id_issued_place"),
        "date_of_birth": renter.get("date_of_birth"),
        "gender": renter.get("gender"),
        "hometown": renter.get("hometown"),
        "occupation": renter.get("occupation"),
        "workplace": renter.get("workplace"),
        "emergency_contact_name": renter.get("emergency_contact_name"),
        "emergency_contact_phone": renter.get("emergency_contact_phone"),
        "id_photo_front_url": renter.get("id_photo_front_url"),
        "id_photo_back_url": renter.get("id_photo_back_url"),
        "current_unit_number": active_contract["unit_number"] if active_contract else None,
        "current_property_name": active_contract["property_name"] if active_contract else None,
        "active_contract_id": active_contract["id"] if active_contract else None,
        "created_at": renter.get("created_at"),
        "contracts_history": contracts_history,
    }

    return result


def update_renter(renter_id: str, data: RenterUpdate, org_id: str) -> dict:
    """Update renter fields."""
    supabase = get_supabase()

    update_data = data.model_dump(exclude_none=True)
    if not update_data:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="No fields to update",
        )

    response = (
        supabase.table("renter_profiles")
        .update(update_data)
        .eq("id", renter_id)
        .eq("organization_id", org_id)
        .execute()
    )

    if not response.data:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Renter not found",
        )

    return response.data[0]


def upload_id_photo(
    renter_id: str,
    side: str,
    file_bytes: bytes,
    filename: str,
    org_id: str,
) -> dict:
    """Upload ID photo (front or back) to Supabase Storage."""
    supabase = get_supabase()

    # Verify renter exists
    renter_response = (
        supabase.table("renter_profiles")
        .select("id")
        .eq("id", renter_id)
        .eq("organization_id", org_id)
        .single()
        .execute()
    )

    if not renter_response.data:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Renter not found",
        )

    # Upload to Supabase Storage
    storage_path = f"{org_id}/{renter_id}_{side}.jpg"
    bucket = supabase.storage.from_("id-documents")

    try:
        # Try to remove existing file first (ignore errors)
        try:
            bucket.remove([storage_path])
        except Exception:
            pass

        # Upload new file
        bucket.upload(
            path=storage_path,
            file=file_bytes,
            file_options={"content-type": "image/jpeg"},
        )
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_502_BAD_GATEWAY,
            detail=f"Storage upload failed: {str(e)}. The 'id-documents' bucket may not exist in Supabase Storage.",
        )

    # Get public URL
    public_url = bucket.get_public_url(storage_path)

    # Update renter record
    field_name = f"id_photo_{side}_url"
    supabase.table("renter_profiles").update(
        {field_name: public_url}
    ).eq("id", renter_id).eq("organization_id", org_id).execute()

    return {"url": public_url}


def invite_renter(renter_id: str, org_id: str) -> dict:
    """Send invitation to renter (mock implementation)."""
    supabase = get_supabase()

    renter_response = (
        supabase.table("renter_profiles")
        .select("id, full_name, email")
        .eq("id", renter_id)
        .eq("organization_id", org_id)
        .single()
        .execute()
    )

    if not renter_response.data:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Renter not found",
        )

    renter = renter_response.data
    print(f"[MOCK] Sending invitation email to {renter['full_name']} ({renter.get('email', 'no email')})")

    return {"message": f"Invitation sent to {renter['full_name']}"}
