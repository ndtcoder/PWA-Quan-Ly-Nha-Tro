from pydantic import BaseModel, Field
from typing import Optional, Literal
from uuid import UUID


class RegisterOwnerRequest(BaseModel):
    email: str
    password: str = Field(min_length=6)
    full_name: str
    organization_name: str


class LoginRequest(BaseModel):
    email: str
    password: str


class InviteUserRequest(BaseModel):
    email: str
    role: Literal['manager', 'accountant', 'maintenance', 'cleaner', 'renter']
    property_id: Optional[UUID] = None


class AcceptInviteRequest(BaseModel):
    token: str
    password: str = Field(min_length=6)
    full_name: str


class AuthResponse(BaseModel):
    access_token: str
    user: dict


class UserResponse(BaseModel):
    id: str
    email: str
    role: str
    organization_id: str
    full_name: Optional[str] = None


class GoogleAuthRequest(BaseModel):
    access_token: str
    full_name: Optional[str] = None


class GoogleAuthResponse(BaseModel):
    access_token: str
    user: dict
    needs_org_setup: bool = False
