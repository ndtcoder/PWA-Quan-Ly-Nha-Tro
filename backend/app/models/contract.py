from pydantic import BaseModel
from typing import Optional


class ContractCreate(BaseModel):
    unit_id: str
    renter_id: str
    start_date: str
    end_date: str
    monthly_rent: float
    deposit_amount: float
    deposit_paid_date: Optional[str] = None
    payment_due_day: int = 5
    max_occupants: int = 2
    terms: Optional[str] = None


class ContractUpdate(BaseModel):
    end_date: Optional[str] = None
    monthly_rent: Optional[float] = None
    terms: Optional[str] = None
    deposit_paid_date: Optional[str] = None
    payment_due_day: Optional[int] = None


class TerminateRequest(BaseModel):
    termination_reason: str


class ContractResponse(BaseModel):
    id: str
    contract_number: Optional[str] = None
    status: str
    unit_id: str
    unit_number: Optional[str] = None
    property_name: Optional[str] = None
    renter_id: str
    renter_name: Optional[str] = None
    start_date: str
    end_date: str
    monthly_rent: float
    deposit_amount: float
    created_at: Optional[str] = None
    pdf_url: Optional[str] = None
    scan_pdf_url: Optional[str] = None


class ContractDetailResponse(ContractResponse):
    deposit_paid_date: Optional[str] = None
    payment_due_day: int = 5
    max_occupants: int = 2
    terms: Optional[str] = None
    signed_at: Optional[str] = None
    terminated_at: Optional[str] = None
    termination_reason: Optional[str] = None
    created_by: Optional[str] = None
