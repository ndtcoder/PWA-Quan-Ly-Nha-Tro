"""Invoice service for managing invoices and payments."""

import re
from datetime import datetime
from typing import Optional

from fastapi import HTTPException, status

from app.config import settings
from app.database import get_supabase
from app.models.invoice import InvoiceCreate
from app.services.vietqr_service import (
    build_vietqr_string,
    generate_qr_image,
    generate_ref_code,
)


def list_invoices(
    org_id: str,
    invoice_status: Optional[str] = None,
    unit_id: Optional[str] = None,
    renter_id: Optional[str] = None,
    billing_month: Optional[str] = None,
) -> list:
    """List invoices for the organization with optional filters."""
    supabase = get_supabase()

    query = (
        supabase.table("invoices")
        .select("*")
        .eq("organization_id", org_id)
    )

    if invoice_status:
        query = query.eq("status", invoice_status)
    if unit_id:
        query = query.eq("unit_id", unit_id)
    if renter_id:
        query = query.eq("renter_id", renter_id)
    if billing_month:
        # Filter by billing period that overlaps the given month
        query = query.ilike("billing_period_start", f"{billing_month}%")

    response = query.order("created_at", desc=True).execute()
    invoices = response.data or []

    result = []
    for invoice in invoices:
        enriched = _enrich_invoice(invoice, supabase)
        result.append(enriched)

    return result


def create_invoice(data: InvoiceCreate, org_id: str) -> dict:
    """Create a new invoice with items."""
    supabase = get_supabase()

    # Get contract info
    contract = (
        supabase.table("contracts")
        .select("*")
        .eq("id", data.contract_id)
        .eq("organization_id", org_id)
        .single()
        .execute()
    ).data

    if not contract:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Contract not found",
        )

    # Generate invoice number: INV-YYYY-NNN
    current_year = datetime.now().year
    count_response = (
        supabase.table("invoices")
        .select("id")
        .eq("organization_id", org_id)
        .ilike("invoice_number", f"INV-{current_year}-%")
        .execute()
    )
    seq = len(count_response.data or []) + 1
    invoice_number = f"INV-{current_year}-{seq:03d}"

    # Calculate totals
    subtotal = sum(item.amount for item in data.items)
    total = subtotal

    # Generate VietQR reference code
    billing_month = data.billing_period_start[:7].replace("-", "")
    ref_code = generate_ref_code(data.contract_id, billing_month)

    # Build VietQR payload
    vietqr_payload = ""
    if settings.BANK_BIN and settings.BANK_ACCOUNT_NUMBER:
        vietqr_payload = build_vietqr_string(
            bank_bin=settings.BANK_BIN,
            account_number=settings.BANK_ACCOUNT_NUMBER,
            amount=int(total),
            ref_code=ref_code,
        )

    # Get renter_id from contract
    renter_id = contract.get("renter_id")
    unit_id = contract.get("unit_id")

    invoice_data = {
        "invoice_number": invoice_number,
        "contract_id": data.contract_id,
        "unit_id": unit_id,
        "renter_id": renter_id,
        "organization_id": org_id,
        "billing_period_start": data.billing_period_start,
        "billing_period_end": data.billing_period_end,
        "due_date": data.due_date,
        "subtotal": subtotal,
        "total": total,
        "status": "draft",
        "paid_amount": 0,
        "vietqr_ref_code": ref_code,
        "vietqr_payload": vietqr_payload,
        "notes": data.notes,
    }

    response = supabase.table("invoices").insert(invoice_data).execute()
    invoice = response.data[0]

    # Create invoice items
    for item in data.items:
        item_data = {
            "invoice_id": invoice["id"],
            "item_type": item.item_type,
            "description": item.description,
            "quantity": item.quantity or 1,
            "unit_price": item.unit_price or 0,
            "amount": item.amount,
        }
        supabase.table("invoice_items").insert(item_data).execute()

    return _enrich_invoice(invoice, supabase)


def get_invoice_detail(invoice_id: str, org_id: str) -> dict:
    """Get invoice with items and QR image."""
    supabase = get_supabase()

    response = (
        supabase.table("invoices")
        .select("*")
        .eq("id", invoice_id)
        .eq("organization_id", org_id)
        .single()
        .execute()
    )
    invoice = response.data

    if not invoice:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Invoice not found",
        )

    # Get items
    items_response = (
        supabase.table("invoice_items")
        .select("*")
        .eq("invoice_id", invoice_id)
        .execute()
    )
    items = items_response.data or []

    # Generate QR image
    qr_image_base64 = None
    vietqr_payload = invoice.get("vietqr_payload")
    if vietqr_payload:
        qr_image_base64 = generate_qr_image(vietqr_payload)
    elif settings.BANK_BIN and settings.BANK_ACCOUNT_NUMBER and invoice.get("vietqr_ref_code"):
        payload = build_vietqr_string(
            bank_bin=settings.BANK_BIN,
            account_number=settings.BANK_ACCOUNT_NUMBER,
            amount=int(invoice.get("total", 0)),
            ref_code=invoice["vietqr_ref_code"],
        )
        qr_image_base64 = generate_qr_image(payload)

    enriched = _enrich_invoice(invoice, supabase)
    enriched["items"] = [
        {
            "id": item["id"],
            "item_type": item.get("item_type", "other"),
            "description": item.get("description", ""),
            "quantity": float(item.get("quantity", 1)),
            "unit_price": float(item.get("unit_price", 0)),
            "amount": float(item.get("amount", 0)),
        }
        for item in items
    ]
    enriched["qr_image_base64"] = qr_image_base64

    return enriched


def send_invoice(invoice_id: str, org_id: str) -> dict:
    """Change invoice status from draft to sent."""
    supabase = get_supabase()

    existing = (
        supabase.table("invoices")
        .select("*")
        .eq("id", invoice_id)
        .eq("organization_id", org_id)
        .single()
        .execute()
    ).data

    if not existing:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Invoice not found",
        )

    if existing["status"] != "draft":
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Only draft invoices can be sent",
        )

    response = (
        supabase.table("invoices")
        .update({"status": "sent"})
        .eq("id", invoice_id)
        .execute()
    )

    # Mock email notification (log it)
    print(f"[MOCK] Email notification sent for invoice {existing.get('invoice_number')}")

    return _enrich_invoice(response.data[0], supabase)


def mark_paid(
    invoice_id: str,
    org_id: str,
    payment_method: str,
    paid_amount: float,
) -> dict:
    """Manually mark an invoice as paid."""
    supabase = get_supabase()

    existing = (
        supabase.table("invoices")
        .select("*")
        .eq("id", invoice_id)
        .eq("organization_id", org_id)
        .single()
        .execute()
    ).data

    if not existing:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Invoice not found",
        )

    now = datetime.now().isoformat()

    response = (
        supabase.table("invoices")
        .update({
            "status": "paid",
            "paid_amount": paid_amount,
            "paid_at": now,
            "payment_method": payment_method,
        })
        .eq("id", invoice_id)
        .execute()
    )

    return _enrich_invoice(response.data[0], supabase)


def auto_generate_for_month(org_id: str, billing_month: Optional[str] = None) -> list:
    """Auto-generate draft invoices for all active contracts.

    Creates invoices with: rent item, electricity/water from meter readings,
    service fees from service_fee_configs.
    Skips if invoice already exists for the contract+period.
    """
    supabase = get_supabase()

    if not billing_month:
        now = datetime.now()
        billing_month = now.strftime("%Y-%m")

    # Parse billing month
    year, month = billing_month.split("-")
    year = int(year)
    month = int(month)

    # Billing period
    billing_period_start = f"{year}-{month:02d}-01"
    if month == 12:
        billing_period_end = f"{year + 1}-01-01"
    else:
        billing_period_end = f"{year}-{month + 1:02d}-01"

    # Get all active contracts for this org
    contracts_response = (
        supabase.table("contracts")
        .select("*")
        .eq("organization_id", org_id)
        .eq("status", "active")
        .execute()
    )
    contracts = contracts_response.data or []

    generated = []

    for contract in contracts:
        contract_id = contract["id"]
        unit_id = contract.get("unit_id")

        # Check if invoice already exists for this contract and period
        existing = (
            supabase.table("invoices")
            .select("id")
            .eq("contract_id", contract_id)
            .eq("billing_period_start", billing_period_start)
            .eq("organization_id", org_id)
            .execute()
        )

        if existing.data:
            continue

        items = []

        # Rent item
        monthly_rent = float(contract.get("monthly_rent", 0))
        if monthly_rent > 0:
            items.append({
                "item_type": "rent",
                "description": "Tien thue phong",
                "quantity": 1,
                "unit_price": monthly_rent,
                "amount": monthly_rent,
            })

        # Try to get electricity meter readings
        if unit_id:
            elec_readings = (
                supabase.table("meter_readings")
                .select("*")
                .eq("unit_id", unit_id)
                .eq("meter_type", "electricity")
                .eq("billing_month", billing_month)
                .eq("status", "approved")
                .execute()
            ).data or []

            for reading in elec_readings:
                usage = float(reading.get("usage", 0))
                price = float(reading.get("unit_price", 3500))
                items.append({
                    "item_type": "electricity",
                    "description": f"Tien dien ({usage} kWh)",
                    "quantity": usage,
                    "unit_price": price,
                    "amount": usage * price,
                })

            # Water meter readings
            water_readings = (
                supabase.table("meter_readings")
                .select("*")
                .eq("unit_id", unit_id)
                .eq("meter_type", "water")
                .eq("billing_month", billing_month)
                .eq("status", "approved")
                .execute()
            ).data or []

            for reading in water_readings:
                usage = float(reading.get("usage", 0))
                price = float(reading.get("unit_price", 15000))
                items.append({
                    "item_type": "water",
                    "description": f"Tien nuoc ({usage} m3)",
                    "quantity": usage,
                    "unit_price": price,
                    "amount": usage * price,
                })

        # Service fees from config
        service_fees = (
            supabase.table("service_fee_configs")
            .select("*")
            .eq("organization_id", org_id)
            .eq("is_active", True)
            .execute()
        ).data or []

        for fee in service_fees:
            fee_amount = float(fee.get("amount", 0))
            if fee_amount > 0:
                items.append({
                    "item_type": "service",
                    "description": fee.get("name", "Phi dich vu"),
                    "quantity": 1,
                    "unit_price": fee_amount,
                    "amount": fee_amount,
                })

        if not items:
            continue

        # Calculate totals
        subtotal = sum(item["amount"] for item in items)
        total = subtotal

        # Generate ref code and QR
        ref_code = generate_ref_code(contract_id, billing_month.replace("-", ""))
        vietqr_payload = ""
        if settings.BANK_BIN and settings.BANK_ACCOUNT_NUMBER:
            vietqr_payload = build_vietqr_string(
                bank_bin=settings.BANK_BIN,
                account_number=settings.BANK_ACCOUNT_NUMBER,
                amount=int(total),
                ref_code=ref_code,
            )

        # Generate invoice number
        current_year = datetime.now().year
        count_response = (
            supabase.table("invoices")
            .select("id")
            .eq("organization_id", org_id)
            .ilike("invoice_number", f"INV-{current_year}-%")
            .execute()
        )
        seq = len(count_response.data or []) + 1
        invoice_number = f"INV-{current_year}-{seq:03d}"

        # Due date: payment_due_day of the billing month
        payment_due_day = contract.get("payment_due_day", 5)
        due_date = f"{year}-{month:02d}-{payment_due_day:02d}"

        invoice_data = {
            "invoice_number": invoice_number,
            "contract_id": contract_id,
            "unit_id": unit_id,
            "renter_id": contract.get("renter_id"),
            "organization_id": org_id,
            "billing_period_start": billing_period_start,
            "billing_period_end": billing_period_end,
            "due_date": due_date,
            "subtotal": subtotal,
            "total": total,
            "status": "draft",
            "paid_amount": 0,
            "vietqr_ref_code": ref_code,
            "vietqr_payload": vietqr_payload,
            "notes": None,
        }

        inv_response = supabase.table("invoices").insert(invoice_data).execute()
        invoice = inv_response.data[0]

        # Create items
        for item in items:
            item_data = {
                "invoice_id": invoice["id"],
                "item_type": item["item_type"],
                "description": item["description"],
                "quantity": item["quantity"],
                "unit_price": item["unit_price"],
                "amount": item["amount"],
            }
            supabase.table("invoice_items").insert(item_data).execute()

        generated.append(_enrich_invoice(invoice, supabase))

    return generated


def process_webhook(payload) -> dict:
    """Process payment webhook from Casso.

    Parse ref_code from description using regex, find matching invoice,
    update to paid status.
    """
    supabase = get_supabase()

    description = payload.description or ""
    amount = payload.amount

    # Try to extract ref_code from description
    # Pattern: NHAT followed by 6 chars and 6 digits (YYYYMM)
    match = re.search(r"(NHAT[A-Z0-9]{6}\d{6})", description.upper())

    if not match:
        return {"status": "ignored", "reason": "No matching ref_code found in description"}

    ref_code = match.group(1)

    # Find invoice with this ref_code
    response = (
        supabase.table("invoices")
        .select("*")
        .eq("vietqr_ref_code", ref_code)
        .execute()
    )

    invoices = response.data or []

    if not invoices:
        return {"status": "not_found", "reason": f"No invoice found for ref_code: {ref_code}"}

    invoice = invoices[0]

    # Update invoice to paid
    now = datetime.now().isoformat()
    supabase.table("invoices").update({
        "status": "paid",
        "paid_amount": amount,
        "paid_at": now,
        "payment_method": "bank_transfer",
    }).eq("id", invoice["id"]).execute()

    return {
        "status": "success",
        "invoice_id": invoice["id"],
        "invoice_number": invoice.get("invoice_number"),
        "amount": amount,
    }


def _enrich_invoice(invoice: dict, supabase) -> dict:
    """Add unit_number and renter_name to an invoice."""
    unit_number = None
    renter_name = None

    if invoice.get("unit_id"):
        unit_resp = (
            supabase.table("units")
            .select("unit_number")
            .eq("id", invoice["unit_id"])
            .single()
            .execute()
        )
        if unit_resp.data:
            unit_number = unit_resp.data["unit_number"]

    if invoice.get("renter_id"):
        renter_resp = (
            supabase.table("renter_profiles")
            .select("full_name")
            .eq("id", invoice["renter_id"])
            .single()
            .execute()
        )
        if renter_resp.data:
            renter_name = renter_resp.data["full_name"]

    return {
        "id": invoice["id"],
        "invoice_number": invoice.get("invoice_number", ""),
        "contract_id": invoice.get("contract_id", ""),
        "unit_id": invoice.get("unit_id"),
        "unit_number": unit_number,
        "renter_name": renter_name,
        "billing_period_start": invoice.get("billing_period_start", ""),
        "billing_period_end": invoice.get("billing_period_end", ""),
        "due_date": invoice.get("due_date", ""),
        "subtotal": float(invoice.get("subtotal", 0)),
        "total": float(invoice.get("total", 0)),
        "status": invoice.get("status", "draft"),
        "paid_amount": float(invoice.get("paid_amount", 0)),
        "paid_at": invoice.get("paid_at"),
        "payment_method": invoice.get("payment_method"),
        "vietqr_ref_code": invoice.get("vietqr_ref_code"),
        "notes": invoice.get("notes"),
        "created_at": invoice.get("created_at"),
    }
