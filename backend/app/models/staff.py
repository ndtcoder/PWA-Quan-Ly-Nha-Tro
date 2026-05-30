from pydantic import BaseModel
from typing import Optional, Literal
from datetime import datetime


class StaffResponse(BaseModel):
    id: str
    full_name: str
    email: Optional[str] = None
    role: str
    phone: Optional[str] = None
    is_active: bool = True
    assigned_properties: list[str] = []
    created_at: Optional[str] = None


class StaffRoleUpdate(BaseModel):
    role: Literal["manager", "accountant", "maintenance", "cleaner"]


class StaffInvite(BaseModel):
    email: str
    role: Literal["manager", "accountant", "maintenance", "cleaner"]
    property_id: Optional[str] = None
