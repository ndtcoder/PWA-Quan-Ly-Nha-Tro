from pydantic import BaseModel, Field
from typing import Optional, Literal


class MaintenanceCreate(BaseModel):
    scope: Literal["property", "unit"]
    property_id: str
    unit_id: Optional[str] = None
    title: str
    description: Optional[str] = None
    location_detail: Optional[str] = None
    category: Literal["electrical", "plumbing", "furniture", "structure", "other"]
    priority: str = "normal"
    photos: Optional[list[str]] = []


class MaintenanceAssign(BaseModel):
    assigned_to: str


class MaintenanceResolve(BaseModel):
    resolution_notes: str
    cost: int = 0
    resolution_photos: Optional[list[str]] = []


class MaintenanceRate(BaseModel):
    rating: int = Field(ge=1, le=5)
    feedback: Optional[str] = None


class MaintenanceStatusUpdate(BaseModel):
    status: Literal["in_progress"]


class MaintenanceResponse(BaseModel):
    id: str
    scope: str
    property_id: str
    property_name: Optional[str] = None
    unit_id: Optional[str] = None
    unit_number: Optional[str] = None
    submitted_by: str
    submitter_name: Optional[str] = None
    submitter_role: Optional[str] = None
    title: str
    description: Optional[str] = None
    location_detail: Optional[str] = None
    category: str
    priority: str = "normal"
    status: str = "open"
    photos: list[str] = []
    assigned_to: Optional[str] = None
    assigned_to_name: Optional[str] = None
    assigned_at: Optional[str] = None
    resolved_at: Optional[str] = None
    resolution_notes: Optional[str] = None
    resolution_photos: list[str] = []
    cost: int = 0
    renter_rating: Optional[int] = None
    renter_feedback: Optional[str] = None
    created_at: Optional[str] = None
    updated_at: Optional[str] = None
