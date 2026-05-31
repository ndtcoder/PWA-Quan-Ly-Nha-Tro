from pydantic import BaseModel, Field
from typing import Optional
from datetime import datetime


class RenterCreate(BaseModel):
    full_name: str
    phone: Optional[str] = None
    email: str
    id_number: Optional[str] = None
    id_issued_date: Optional[str] = None
    id_issued_place: Optional[str] = None
    date_of_birth: Optional[str] = None
    gender: Optional[str] = None
    hometown: Optional[str] = None
    occupation: Optional[str] = None
    workplace: Optional[str] = None
    emergency_contact_name: Optional[str] = None
    emergency_contact_phone: Optional[str] = None
    id_photo_links: list[str] = Field(default_factory=list, max_length=5)
    notes: Optional[str] = None


class RenterUpdate(BaseModel):
    full_name: Optional[str] = None
    phone: Optional[str] = None
    email: Optional[str] = None
    id_number: Optional[str] = None
    id_issued_date: Optional[str] = None
    id_issued_place: Optional[str] = None
    date_of_birth: Optional[str] = None
    gender: Optional[str] = None
    hometown: Optional[str] = None
    occupation: Optional[str] = None
    workplace: Optional[str] = None
    emergency_contact_name: Optional[str] = None
    emergency_contact_phone: Optional[str] = None
    id_photo_links: Optional[list[str]] = None
    notes: Optional[str] = None


class RenterResponse(BaseModel):
    id: str
    full_name: str
    phone: Optional[str] = None
    email: Optional[str] = None
    id_number: Optional[str] = None
    current_unit_number: Optional[str] = None
    current_property_name: Optional[str] = None
    active_contract_id: Optional[str] = None
    created_at: Optional[str] = None


class RenterDetailResponse(RenterResponse):
    id_issued_date: Optional[str] = None
    id_issued_place: Optional[str] = None
    date_of_birth: Optional[str] = None
    gender: Optional[str] = None
    hometown: Optional[str] = None
    occupation: Optional[str] = None
    workplace: Optional[str] = None
    emergency_contact_name: Optional[str] = None
    emergency_contact_phone: Optional[str] = None
    id_photo_links: list[str] = Field(default_factory=list)
    notes: Optional[str] = None
    contracts_history: list = []
