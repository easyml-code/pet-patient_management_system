from pydantic import BaseModel, ConfigDict
from typing import Optional
from datetime import datetime


class InvitationCreate(BaseModel):
    email: str
    role: str  # "doctor" or "staff"
    full_name: str
    specialization: Optional[str] = None
    phone: Optional[str] = None
    color: Optional[str] = None


class InvitationAccept(BaseModel):
    password: str


class InvitationResponse(BaseModel):
    id: str
    email: str
    role: str
    full_name: str
    specialization: Optional[str] = None
    phone: Optional[str] = None
    status: str
    expires_at: Optional[datetime] = None
    created_at: Optional[datetime] = None
    model_config = ConfigDict(from_attributes=True)


class InvitationVerifyResponse(BaseModel):
    email: str
    full_name: str
    role: str
    clinic_name: str
