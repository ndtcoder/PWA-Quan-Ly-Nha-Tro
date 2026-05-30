from datetime import datetime, timedelta
from typing import Optional

from fastapi import HTTPException, status
from jinja2 import Environment, FileSystemLoader

from app.database import get_supabase
from app.models.contract import ContractCreate, ContractUpdate


def list_contracts(
    org_id: str,
    contract_status: Optional[str] = None,
    unit_id: Optional[str] = None,
    renter_id: Optional[str] = None,
) -> list:
    """List contracts for the organization with optional filters."""
    supabase = get_supabase()

    query = (
        supabase.table("contracts")
        .select("*")
        .eq("organization_id", org_id)
    )

    if contract_status:
        query = query.eq("status", contract_status)
    if unit_id:
        query = query.eq("unit_id", unit_id)
    if renter_id:
        query = query.eq("renter_id", renter_id)

    response = query.order("created_at", desc=True).execute()
    contracts = response.data or []

    # Enrich with unit and renter info
    result = []
    for contract in contracts:
        enriched = _enrich_contract(contract, supabase)
        result.append(enriched)

    return result


def create_contract(data: ContractCreate, org_id: str, user_id: str) -> dict:
    """Create a new contract with auto-generated contract number."""
    supabase = get_supabase()

    # Check no active contract on same unit
    existing = (
        supabase.table("contracts")
        .select("id")
        .eq("unit_id", data.unit_id)
        .eq("organization_id", org_id)
        .eq("status", "active")
        .execute()
    )

    if existing.data:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="Unit already has an active contract",
        )

    # Generate contract number: HD-YYYY-NNN
    current_year = datetime.now().year
    count_response = (
        supabase.table("contracts")
        .select("id")
        .eq("organization_id", org_id)
        .ilike("contract_number", f"HD-{current_year}-%")
        .execute()
    )
    seq = len(count_response.data or []) + 1
    contract_number = f"HD-{current_year}-{seq:03d}"

    contract_data = {
        "contract_number": contract_number,
        "unit_id": data.unit_id,
        "renter_id": data.renter_id,
        "start_date": data.start_date,
        "end_date": data.end_date,
        "monthly_rent": data.monthly_rent,
        "deposit_amount": data.deposit_amount,
        "deposit_paid_date": data.deposit_paid_date,
        "payment_due_day": data.payment_due_day,
        "max_occupants": data.max_occupants,
        "terms": data.terms,
        "status": "draft",
        "organization_id": org_id,
        "created_by": user_id,
    }

    response = supabase.table("contracts").insert(contract_data).execute()
    contract = response.data[0]

    return _enrich_contract(contract, supabase)


def get_contract(contract_id: str, org_id: str) -> dict:
    """Get a single contract with full details."""
    supabase = get_supabase()

    response = (
        supabase.table("contracts")
        .select("*")
        .eq("id", contract_id)
        .eq("organization_id", org_id)
        .single()
        .execute()
    )
    contract = response.data

    if not contract:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Contract not found",
        )

    return _enrich_contract_detail(contract, supabase)


def update_contract(contract_id: str, data: ContractUpdate, org_id: str) -> dict:
    """Update a contract (only if status is draft)."""
    supabase = get_supabase()

    # Check status
    existing = (
        supabase.table("contracts")
        .select("id, status")
        .eq("id", contract_id)
        .eq("organization_id", org_id)
        .single()
        .execute()
    )

    if not existing.data:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Contract not found",
        )

    if existing.data["status"] != "draft":
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Only draft contracts can be updated",
        )

    update_data = data.model_dump(exclude_none=True)
    if not update_data:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="No fields to update",
        )

    response = (
        supabase.table("contracts")
        .update(update_data)
        .eq("id", contract_id)
        .eq("organization_id", org_id)
        .execute()
    )

    return _enrich_contract(response.data[0], supabase)


def activate_contract(contract_id: str, org_id: str) -> dict:
    """Activate a draft contract: set status to active, update unit to occupied."""
    supabase = get_supabase()

    existing = (
        supabase.table("contracts")
        .select("*")
        .eq("id", contract_id)
        .eq("organization_id", org_id)
        .single()
        .execute()
    )

    if not existing.data:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Contract not found",
        )

    if existing.data["status"] != "draft":
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Only draft contracts can be activated",
        )

    now = datetime.now().isoformat()

    # Update contract status
    response = (
        supabase.table("contracts")
        .update({"status": "active", "signed_at": now})
        .eq("id", contract_id)
        .eq("organization_id", org_id)
        .execute()
    )

    # Update unit status to occupied
    supabase.table("units").update(
        {"status": "occupied"}
    ).eq("id", existing.data["unit_id"]).execute()

    return _enrich_contract(response.data[0], supabase)


def terminate_contract(contract_id: str, reason: str, org_id: str) -> dict:
    """Terminate an active contract: set status to terminated, update unit to vacant."""
    supabase = get_supabase()

    existing = (
        supabase.table("contracts")
        .select("*")
        .eq("id", contract_id)
        .eq("organization_id", org_id)
        .single()
        .execute()
    )

    if not existing.data:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Contract not found",
        )

    if existing.data["status"] != "active":
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Only active contracts can be terminated",
        )

    now = datetime.now().isoformat()

    # Update contract
    response = (
        supabase.table("contracts")
        .update({
            "status": "terminated",
            "terminated_at": now,
            "termination_reason": reason,
        })
        .eq("id", contract_id)
        .eq("organization_id", org_id)
        .execute()
    )

    # Update unit status to vacant
    supabase.table("units").update(
        {"status": "vacant"}
    ).eq("id", existing.data["unit_id"]).execute()

    return _enrich_contract(response.data[0], supabase)


def export_pdf(contract_id: str, org_id: str) -> dict:
    """Generate PDF from contract template and upload to Supabase Storage."""
    supabase = get_supabase()

    contract = (
        supabase.table("contracts")
        .select("*")
        .eq("id", contract_id)
        .eq("organization_id", org_id)
        .single()
        .execute()
    ).data

    if not contract:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Contract not found",
        )

    # Get renter info
    renter = (
        supabase.table("renter_profiles")
        .select("full_name, id_number, phone")
        .eq("id", contract["renter_id"])
        .single()
        .execute()
    ).data or {}

    # Get unit and property info
    unit = (
        supabase.table("units")
        .select("unit_number, property_id")
        .eq("id", contract["unit_id"])
        .single()
        .execute()
    ).data or {}

    property_data = {}
    if unit.get("property_id"):
        property_data = (
            supabase.table("properties")
            .select("name, address")
            .eq("id", unit["property_id"])
            .single()
            .execute()
        ).data or {}

    # Render template
    import os
    template_dir = os.path.join(os.path.dirname(os.path.dirname(__file__)), "templates")
    env = Environment(loader=FileSystemLoader(template_dir))
    template = env.get_template("contract_template.html")

    html_content = template.render(
        contract_number=contract.get("contract_number", ""),
        tenant_name=renter.get("full_name", ""),
        tenant_id_number=renter.get("id_number", ""),
        tenant_phone=renter.get("phone", ""),
        property_name=property_data.get("name", ""),
        property_address=property_data.get("address", ""),
        unit_number=unit.get("unit_number", ""),
        monthly_rent=contract.get("monthly_rent", 0),
        deposit_amount=contract.get("deposit_amount", 0),
        start_date=contract.get("start_date", ""),
        end_date=contract.get("end_date", ""),
        max_occupants=contract.get("max_occupants", 2),
        payment_due_day=contract.get("payment_due_day", 5),
        terms=contract.get("terms", ""),
        today=datetime.now().strftime("%d/%m/%Y"),
    )

    # Generate PDF with WeasyPrint
    try:
        from weasyprint import HTML
        pdf_bytes = HTML(string=html_content).write_pdf()
    except Exception:
        # If WeasyPrint is not available, return HTML content URL
        pdf_bytes = html_content.encode("utf-8")

    # Upload to Supabase Storage
    storage_path = f"{org_id}/{contract_id}.pdf"
    bucket = supabase.storage.from_("contracts")

    try:
        bucket.remove([storage_path])
    except Exception:
        pass

    bucket.upload(
        path=storage_path,
        file=pdf_bytes,
        file_options={"content-type": "application/pdf"},
    )

    pdf_url = bucket.get_public_url(storage_path)

    # Update contract with pdf_url
    supabase.table("contracts").update(
        {"pdf_url": pdf_url}
    ).eq("id", contract_id).execute()

    return {"pdf_url": pdf_url}


def get_expiring_soon(org_id: str) -> list:
    """Get contracts expiring within 30 days."""
    supabase = get_supabase()

    today = datetime.now().date()
    thirty_days = (today + timedelta(days=30)).isoformat()
    today_str = today.isoformat()

    response = (
        supabase.table("contracts")
        .select("*")
        .eq("organization_id", org_id)
        .eq("status", "active")
        .gte("end_date", today_str)
        .lte("end_date", thirty_days)
        .order("end_date")
        .execute()
    )

    contracts = response.data or []
    result = []
    for contract in contracts:
        enriched = _enrich_contract(contract, supabase)
        result.append(enriched)

    return result


def _enrich_contract(contract: dict, supabase) -> dict:
    """Add unit_number, property_name, renter_name to a contract."""
    unit_number = None
    property_name = None
    renter_name = None

    if contract.get("unit_id"):
        unit_resp = (
            supabase.table("units")
            .select("unit_number, property_id")
            .eq("id", contract["unit_id"])
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

    if contract.get("renter_id"):
        renter_resp = (
            supabase.table("renter_profiles")
            .select("full_name")
            .eq("id", contract["renter_id"])
            .single()
            .execute()
        )
        if renter_resp.data:
            renter_name = renter_resp.data["full_name"]

    return {
        "id": contract["id"],
        "contract_number": contract.get("contract_number"),
        "status": contract.get("status"),
        "unit_id": contract.get("unit_id"),
        "unit_number": unit_number,
        "property_name": property_name,
        "renter_id": contract.get("renter_id"),
        "renter_name": renter_name,
        "start_date": contract.get("start_date"),
        "end_date": contract.get("end_date"),
        "monthly_rent": float(contract.get("monthly_rent", 0)),
        "deposit_amount": float(contract.get("deposit_amount", 0)),
        "created_at": contract.get("created_at"),
        "pdf_url": contract.get("pdf_url"),
    }


def _enrich_contract_detail(contract: dict, supabase) -> dict:
    """Full contract detail with all fields."""
    base = _enrich_contract(contract, supabase)
    base.update({
        "deposit_paid_date": contract.get("deposit_paid_date"),
        "payment_due_day": contract.get("payment_due_day", 5),
        "max_occupants": contract.get("max_occupants", 2),
        "terms": contract.get("terms"),
        "signed_at": contract.get("signed_at"),
        "terminated_at": contract.get("terminated_at"),
        "termination_reason": contract.get("termination_reason"),
        "created_by": contract.get("created_by"),
    })
    return base
