from pydantic import BaseModel
from typing import Optional, Literal


class MeterReadingSubmit(BaseModel):
    unit_id: str
    meter_type: Literal["electricity", "water"]
    billing_month: str
    previous_reading: Optional[float] = None


class MeterReadingApprove(BaseModel):
    approved_value: Optional[float] = None  # None means use ai_detected_value


class MeterReadingResponse(BaseModel):
    id: str
    unit_id: str
    unit_number: Optional[str] = None
    property_name: Optional[str] = None
    meter_type: Literal["electricity", "water"]
    billing_month: str
    previous_reading: Optional[float] = None
    current_reading: Optional[float] = None
    consumption: Optional[float] = None
    unit_price: Optional[float] = None
    photo_url: Optional[str] = None
    ai_detected_value: Optional[float] = None
    ai_confidence: Optional[float] = None
    is_approved: bool = False
    manual_override_value: Optional[float] = None
    submitted_by: Optional[str] = None
    submitted_at: Optional[str] = None
    reviewed_by: Optional[str] = None
    reviewed_at: Optional[str] = None


class MeterHistoryItem(BaseModel):
    billing_month: str
    electricity_consumption: Optional[float] = None
    electricity_cost: Optional[float] = None
    water_consumption: Optional[float] = None
    water_cost: Optional[float] = None
