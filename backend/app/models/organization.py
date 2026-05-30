from pydantic import BaseModel, Field
from typing import Optional
from datetime import datetime


class OrganizationUpdate(BaseModel):
    name: str = Field(min_length=1, max_length=255)
    slug: Optional[str] = None


class OrganizationResponse(BaseModel):
    id: str
    name: str
    slug: str
    subscription_plan: Optional[str] = None
    created_at: Optional[str] = None
