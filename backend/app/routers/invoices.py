from typing import Optional

from fastapi import APIRouter, Depends, Header, HTTPException, Query, status

from app.config import settings
from app.dependencies import get_current_user, require_roles
from app.models.invoice import (
    AutoGenerateRequest,
    InvoiceCreate,
    InvoiceDetailResponse,
    InvoiceResponse,
    MarkPaidRequest,
    PaymentWebhookPayload,
)
from app.services import invoice_service

router = APIRouter(tags=["invoices"])


@router.get("/invoices", response_model=list[InvoiceResponse])
async def list_invoices(
    status_filter: Optional[str] = Query(None, alias="status"),
    unit_id: Optional[str] = Query(None),
    renter_id: Optional[str] = Query(None),
    billing_month: Optional[str] = Query(None),
    current_user: dict = Depends(get_current_user),
):
    """List invoices for the organization."""
    return invoice_service.list_invoices(
        org_id=current_user["organization_id"],
        invoice_status=status_filter,
        unit_id=unit_id,
        renter_id=renter_id,
        billing_month=billing_month,
    )


@router.post("/invoices", response_model=InvoiceResponse, status_code=201)
async def create_invoice(
    data: InvoiceCreate,
    current_user: dict = Depends(require_roles(["owner", "manager"])),
):
    """Create a new invoice."""
    return invoice_service.create_invoice(
        data=data,
        org_id=current_user["organization_id"],
    )


@router.get("/invoices/{invoice_id}", response_model=InvoiceDetailResponse)
async def get_invoice(
    invoice_id: str,
    current_user: dict = Depends(get_current_user),
):
    """Get invoice detail with items and QR image."""
    return invoice_service.get_invoice_detail(
        invoice_id=invoice_id,
        org_id=current_user["organization_id"],
    )


@router.post("/invoices/{invoice_id}/send", response_model=InvoiceResponse)
async def send_invoice(
    invoice_id: str,
    current_user: dict = Depends(require_roles(["owner", "manager"])),
):
    """Send invoice (change status from draft to sent)."""
    return invoice_service.send_invoice(
        invoice_id=invoice_id,
        org_id=current_user["organization_id"],
    )


@router.post("/invoices/{invoice_id}/mark-paid", response_model=InvoiceResponse)
async def mark_invoice_paid(
    invoice_id: str,
    body: MarkPaidRequest,
    current_user: dict = Depends(require_roles(["owner", "manager"])),
):
    """Manually mark an invoice as paid."""
    return invoice_service.mark_paid(
        invoice_id=invoice_id,
        org_id=current_user["organization_id"],
        payment_method=body.payment_method,
        paid_amount=body.paid_amount,
    )


@router.post("/invoices/auto-generate", response_model=list[InvoiceResponse])
async def auto_generate_invoices(
    body: Optional[AutoGenerateRequest] = None,
    current_user: dict = Depends(require_roles(["owner", "manager"])),
):
    """Auto-generate invoices for all active contracts."""
    billing_month = body.billing_month if body else None
    return invoice_service.auto_generate_for_month(
        org_id=current_user["organization_id"],
        billing_month=billing_month,
    )


@router.post("/payments/webhook")
async def payment_webhook(
    payload: PaymentWebhookPayload,
    x_api_key: Optional[str] = Header(None),
):
    """Process payment webhook from Casso.

    Verifies API key and processes the payment notification.
    """
    # Verify API key
    if not settings.CASSO_API_KEY or x_api_key != settings.CASSO_API_KEY:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid API key",
        )

    result = invoice_service.process_webhook(payload)
    return result
