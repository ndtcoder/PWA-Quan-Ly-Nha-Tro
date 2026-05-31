import json
from pydantic import BaseModel, Field, field_validator
from typing import Any, Optional, Literal
from datetime import datetime


class PropertyCreate(BaseModel):
    name: str
    address: str
    ward: Optional[str] = None
    district: Optional[str] = None
    city: Optional[str] = None
    property_type: Literal['house', 'apartment_building', 'villa']
    description: Optional[str] = None


class PropertyUpdate(BaseModel):
    name: Optional[str] = None
    address: Optional[str] = None
    ward: Optional[str] = None
    district: Optional[str] = None
    city: Optional[str] = None
    property_type: Optional[Literal['house', 'apartment_building', 'villa']] = None
    description: Optional[str] = None


class PropertyResponse(BaseModel):
    id: str
    name: str
    address: str
    ward: Optional[str] = None
    district: Optional[str] = None
    city: Optional[str] = None
    property_type: Optional[str] = None
    total_units: int = 0
    occupied_units: int = 0
    description: Optional[str] = None
    thumbnail_url: Optional[str] = None
    created_at: Optional[str] = None


class UnitCreate(BaseModel):
    unit_number: str
    floor: Optional[int] = None
    area_sqm: Optional[float] = None
    base_rent: float
    deposit_amount: Optional[float] = None
    max_occupants: int = 2
    amenities: list = Field(default_factory=list)
    notes: Optional[str] = None


class UnitUpdate(BaseModel):
    unit_number: Optional[str] = None
    floor: Optional[int] = None
    area_sqm: Optional[float] = None
    base_rent: Optional[float] = None
    deposit_amount: Optional[float] = None
    max_occupants: Optional[int] = None
    status: Optional[Literal['vacant', 'occupied', 'maintenance']] = None
    amenities: Optional[list] = None
    notes: Optional[str] = None


class UnitResponse(BaseModel):
    id: str
    unit_number: str
    floor: Optional[int] = None
    area_sqm: Optional[float] = None
    base_rent: float
    deposit_amount: Optional[float] = None
    max_occupants: int = 2
    status: str = 'vacant'
    amenities: list = Field(default_factory=list)
    notes: Optional[str] = None
    current_renter_name: Optional[str] = None
    property_id: str

    @field_validator('amenities', mode='before')
    @classmethod
    def parse_amenities(cls, v: Any) -> list:
        """Handle amenities coming as JSON string from Supabase JSONB."""
        if v is None:
            return []
        if isinstance(v, str):
            try:
                parsed = json.loads(v)
                return parsed if isinstance(parsed, list) else []
            except (json.JSONDecodeError, TypeError):
                return []
        if isinstance(v, list):
            return v
        return []


class UnitHistoryResponse(BaseModel):
    id: str
    contract_number: Optional[str] = None
    renter_name: str
    start_date: str
    end_date: str
    status: str
    monthly_rent: float
