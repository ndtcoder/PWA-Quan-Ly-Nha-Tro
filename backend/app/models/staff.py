from pydantic import BaseModel
from typing import Optional, Literal


class StaffCreate(BaseModel):
    email: str
    full_name: str
    phone: Optional[str] = None
    role: Literal["manager", "accountant", "maintenance", "cleaner"]
    property_id: Optional[str] = None
    address: Optional[str] = None
    notes: Optional[str] = None


class StaffUpdate(BaseModel):
    email: Optional[str] = None
    full_name: Optional[str] = None
    phone: Optional[str] = None
    role: Optional[Literal["manager", "accountant", "maintenance", "cleaner"]] = None
    property_id: Optional[str] = None
    address: Optional[str] = None
    notes: Optional[str] = None


class StaffResponse(BaseModel):
    id: str
    email: Optional[str] = None
    full_name: str
    phone: Optional[str] = None
    role: str
    property_name: Optional[str] = None
    status: Literal["active", "pending"]
    address: Optional[str] = None
    notes: Optional[str] = None
    created_at: Optional[str] = None


class StaffRoleUpdate(BaseModel):
    role: Literal["manager", "accountant", "maintenance", "cleaner"]
