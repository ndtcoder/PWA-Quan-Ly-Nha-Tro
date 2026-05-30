from pydantic import BaseModel
from typing import Optional, Literal


class InvoiceItemCreate(BaseModel):
    item_type: Literal['rent', 'electricity', 'water', 'service', 'internet', 'parking', 'other']
    description: str
    quantity: Optional[float] = 1
    unit_price: Optional[float] = 0
    amount: float


class InvoiceCreate(BaseModel):
    contract_id: str
    billing_period_start: str
    billing_period_end: str
    due_date: str
    items: list[InvoiceItemCreate]
    notes: Optional[str] = None


class MarkPaidRequest(BaseModel):
    payment_method: str
    paid_amount: float


class AutoGenerateRequest(BaseModel):
    billing_month: Optional[str] = None


class InvoiceResponse(BaseModel):
    id: str
    invoice_number: str
    contract_id: str
    unit_id: Optional[str] = None
    unit_number: Optional[str] = None
    renter_name: Optional[str] = None
    billing_period_start: str
    billing_period_end: str
    due_date: str
    subtotal: float
    total: float
    status: str
    paid_amount: float
    paid_at: Optional[str] = None
    payment_method: Optional[str] = None
    vietqr_ref_code: Optional[str] = None
    notes: Optional[str] = None
    created_at: Optional[str] = None


class InvoiceItemResponse(BaseModel):
    id: str
    item_type: str
    description: str
    quantity: float
    unit_price: float
    amount: float


class InvoiceDetailResponse(InvoiceResponse):
    items: list[InvoiceItemResponse] = []
    qr_image_base64: Optional[str] = None


class PaymentWebhookPayload(BaseModel):
    id: Optional[int] = None
    tid: Optional[str] = None
    description: str
    amount: float
    cusum_balance: Optional[float] = None
    when: Optional[str] = None
    bank_sub_acc_id: Optional[str] = None
