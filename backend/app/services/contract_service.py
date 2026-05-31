from datetime import datetime, timedelta
from typing import Optional

from fastapi import HTTPException, status

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
    """Generate PDF from contract data and upload to Supabase Storage."""
    import os
    from fpdf import FPDF

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

    # Generate PDF with fpdf2
    try:
        pdf = FPDF()
        pdf.add_page()
        pdf.set_auto_page_break(auto=True, margin=15)

        # Try to find a Unicode font for Vietnamese text support
        font_added = False
        possible_fonts = [
            # Windows
            "C:/Windows/Fonts/arial.ttf",
            "C:/Windows/Fonts/times.ttf",
            # Linux
            "/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf",
            # macOS
            "/System/Library/Fonts/Supplemental/Arial.ttf",
            "/Library/Fonts/Arial.ttf",
        ]
        font_regular = None
        font_bold = None
        for font_path in possible_fonts:
            if os.path.exists(font_path):
                font_regular = font_path
                break

        # Check for bold variant
        bold_fonts = [
            "C:/Windows/Fonts/arialbd.ttf",
            "/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf",
            "/System/Library/Fonts/Supplemental/Arial Bold.ttf",
            "/Library/Fonts/Arial Bold.ttf",
        ]
        for font_path in bold_fonts:
            if os.path.exists(font_path):
                font_bold = font_path
                break

        if font_regular:
            pdf.add_font("UniFont", "", font_regular)
            if font_bold:
                pdf.add_font("UniFont", "B", font_bold)
            else:
                pdf.add_font("UniFont", "B", font_regular)
            font_family = "UniFont"
            font_added = True
        else:
            font_family = "Helvetica"

        # Define labels based on font availability (Vietnamese or ASCII fallback)
        if font_added:
            lbl_title = "H\u1ee2P \u0110\u1ed2NG THU\u00ca PH\u00d2NG"
            lbl_contract_no = "S\u1ed1 h\u1ee3p \u0111\u1ed3ng"
            lbl_date = "Ng\u00e0y"
            lbl_section_a = "A. B\u00ean cho thu\u00ea"
            lbl_property = "Nh\u00e0 tr\u1ecd"
            lbl_address = "\u0110\u1ecba ch\u1ec9"
            lbl_section_b = "B. B\u00ean thu\u00ea"
            lbl_fullname = "H\u1ecd t\u00ean"
            lbl_phone = "\u0110i\u1ec7n tho\u1ea1i"
            lbl_section_c = "C. N\u1ed9i dung h\u1ee3p \u0111\u1ed3ng"
            lbl_room = "Ph\u00f2ng cho thu\u00ea"
            lbl_rent = "Gi\u00e1 thu\u00ea"
            lbl_month = "th\u00e1ng"
            lbl_deposit = "Ti\u1ec1n c\u1ecdc"
            lbl_duration = "Th\u1eddi h\u1ea1n"
            lbl_pay_date = "Ng\u00e0y thanh to\u00e1n"
            lbl_pay_monthly = "h\u00e0ng th\u00e1ng v\u00e0o ng\u00e0y"
            lbl_section_d = "D. \u0110i\u1ec1u kho\u1ea3n"
            lbl_landlord = "B\u00ean cho thu\u00ea"
            lbl_tenant = "B\u00ean thu\u00ea"
            lbl_sign = "(K\u00fd v\u00e0 ghi r\u00f5 h\u1ecd t\u00ean)"
        else:
            lbl_title = "HOP DONG THUE PHONG"
            lbl_contract_no = "So hop dong"
            lbl_date = "Ngay"
            lbl_section_a = "A. Ben cho thue (Landlord)"
            lbl_property = "Nha tro"
            lbl_address = "Dia chi"
            lbl_section_b = "B. Ben thue (Tenant)"
            lbl_fullname = "Ho ten"
            lbl_phone = "Dien thoai"
            lbl_section_c = "C. Noi dung hop dong"
            lbl_room = "Phong cho thue"
            lbl_rent = "Gia thue"
            lbl_month = "thang"
            lbl_deposit = "Tien coc"
            lbl_duration = "Thoi han"
            lbl_pay_date = "Ngay thanh toan"
            lbl_pay_monthly = "hang thang vao ngay"
            lbl_section_d = "D. Dieu khoan"
            lbl_landlord = "Ben cho thue"
            lbl_tenant = "Ben thue"
            lbl_sign = "(Ky va ghi ro ho ten)"

        # Title
        pdf.set_font(font_family, "B", 16)
        pdf.cell(0, 12, lbl_title, align="C", new_x="LMARGIN", new_y="NEXT")
        pdf.ln(4)

        # Contract number and date
        pdf.set_font(font_family, "", 11)
        contract_number = contract.get("contract_number", "")
        today = datetime.now().strftime("%d/%m/%Y")
        pdf.cell(0, 8, lbl_contract_no + ": " + contract_number, align="C", new_x="LMARGIN", new_y="NEXT")
        pdf.cell(0, 8, lbl_date + ": " + today, align="C", new_x="LMARGIN", new_y="NEXT")
        pdf.ln(6)

        # Section A: Landlord info
        pdf.set_font(font_family, "B", 12)
        pdf.cell(0, 8, lbl_section_a, new_x="LMARGIN", new_y="NEXT")
        pdf.set_font(font_family, "", 11)
        property_name = property_data.get("name", "")
        property_address = property_data.get("address", "")
        pdf.cell(0, 7, "  - " + lbl_property + ": " + property_name, new_x="LMARGIN", new_y="NEXT")
        pdf.cell(0, 7, "  - " + lbl_address + ": " + property_address, new_x="LMARGIN", new_y="NEXT")
        pdf.ln(4)

        # Section B: Tenant info
        pdf.set_font(font_family, "B", 12)
        pdf.cell(0, 8, lbl_section_b, new_x="LMARGIN", new_y="NEXT")
        pdf.set_font(font_family, "", 11)
        tenant_name = renter.get("full_name", "")
        tenant_id = renter.get("id_number", "")
        tenant_phone = renter.get("phone", "")
        pdf.cell(0, 7, "  - " + lbl_fullname + ": " + tenant_name, new_x="LMARGIN", new_y="NEXT")
        pdf.cell(0, 7, "  - CCCD/CMND: " + tenant_id, new_x="LMARGIN", new_y="NEXT")
        pdf.cell(0, 7, "  - " + lbl_phone + ": " + tenant_phone, new_x="LMARGIN", new_y="NEXT")
        pdf.ln(4)

        # Section C: Contract details
        pdf.set_font(font_family, "B", 12)
        pdf.cell(0, 8, lbl_section_c, new_x="LMARGIN", new_y="NEXT")
        pdf.set_font(font_family, "", 11)

        unit_number = unit.get("unit_number", "")
        monthly_rent = contract.get("monthly_rent", 0)
        deposit_amount = contract.get("deposit_amount", 0)
        start_date = contract.get("start_date", "")
        end_date = contract.get("end_date", "")
        payment_due_day = contract.get("payment_due_day", 5)

        rent_str = "{:,.0f}".format(monthly_rent)
        deposit_str = "{:,.0f}".format(deposit_amount)

        pdf.cell(0, 7, "  - " + lbl_room + ": " + unit_number + " - " + property_address, new_x="LMARGIN", new_y="NEXT")
        pdf.cell(0, 7, "  - " + lbl_rent + ": " + rent_str + " VND/" + lbl_month, new_x="LMARGIN", new_y="NEXT")
        pdf.cell(0, 7, "  - " + lbl_deposit + ": " + deposit_str + " VND", new_x="LMARGIN", new_y="NEXT")
        pdf.cell(0, 7, "  - " + lbl_duration + ": " + start_date + " - " + end_date, new_x="LMARGIN", new_y="NEXT")
        pdf.cell(0, 7, "  - " + lbl_pay_date + ": " + lbl_pay_monthly + " " + str(payment_due_day), new_x="LMARGIN", new_y="NEXT")
        pdf.ln(4)

        # Section D: Terms
        terms = contract.get("terms", "")
        if terms:
            pdf.set_font(font_family, "B", 12)
            pdf.cell(0, 8, lbl_section_d, new_x="LMARGIN", new_y="NEXT")
            pdf.set_font(font_family, "", 11)
            pdf.multi_cell(0, 7, "  " + terms)
            pdf.ln(4)

        # Signatures
        pdf.ln(10)
        pdf.set_font(font_family, "B", 11)
        col_width = pdf.w / 2 - pdf.l_margin
        x_start = pdf.l_margin
        y_pos = pdf.get_y()

        pdf.set_xy(x_start, y_pos)
        pdf.cell(col_width, 8, lbl_landlord, align="C")
        pdf.cell(col_width, 8, lbl_tenant, align="C", new_x="LMARGIN", new_y="NEXT")

        pdf.set_font(font_family, "", 10)
        pdf.cell(col_width, 7, lbl_sign, align="C")
        pdf.cell(col_width, 7, lbl_sign, align="C", new_x="LMARGIN", new_y="NEXT")

        pdf_bytes = pdf.output()
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail="PDF generation failed: " + str(e),
        )

    # Upload to Supabase Storage
    storage_path = f"{org_id}/{contract_id}.pdf"
    try:
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
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_502_BAD_GATEWAY,
            detail="Storage upload failed: " + str(e) + ". The 'contracts' bucket may not exist in Supabase Storage.",
        )

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
