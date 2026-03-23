from pydantic import BaseModel, ConfigDict
from typing import Optional
from datetime import datetime


class DoctorCreate(BaseModel):
    full_name: str
    specialization: Optional[str] = None
    email: Optional[str] = None
    phone: Optional[str] = None
    color: str = "#2563EB"
    qualification: Optional[str] = None
    license_number: Optional[str] = None
    registration_number: Optional[str] = None
    address: Optional[str] = None
    photo_url: Optional[str] = None


class DoctorUpdate(BaseModel):
    full_name: Optional[str] = None
    specialization: Optional[str] = None
    email: Optional[str] = None
    phone: Optional[str] = None
    color: Optional[str] = None
    is_active: Optional[bool] = None
    qualification: Optional[str] = None
    license_number: Optional[str] = None
    registration_number: Optional[str] = None
    address: Optional[str] = None
    photo_url: Optional[str] = None


class DoctorResponse(BaseModel):
    id: str
    user_id: Optional[str] = None
    full_name: str
    specialization: Optional[str] = None
    email: Optional[str] = None
    phone: Optional[str] = None
    color: str
    is_active: bool
    qualification: Optional[str] = None
    license_number: Optional[str] = None
    registration_number: Optional[str] = None
    address: Optional[str] = None
    photo_url: Optional[str] = None
    created_at: Optional[datetime] = None
    model_config = ConfigDict(from_attributes=True)
