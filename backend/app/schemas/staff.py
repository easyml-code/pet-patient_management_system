from pydantic import BaseModel, ConfigDict
from typing import Optional
from datetime import datetime


class StaffCreate(BaseModel):
    full_name: str
    role: Optional[str] = None
    email: Optional[str] = None
    phone: Optional[str] = None
    address: Optional[str] = None
    qualification: Optional[str] = None
    photo_url: Optional[str] = None


class StaffUpdate(BaseModel):
    full_name: Optional[str] = None
    role: Optional[str] = None
    email: Optional[str] = None
    phone: Optional[str] = None
    is_active: Optional[bool] = None
    address: Optional[str] = None
    qualification: Optional[str] = None
    photo_url: Optional[str] = None


class StaffResponse(BaseModel):
    id: str
    user_id: Optional[str] = None
    full_name: str
    role: Optional[str] = None
    email: Optional[str] = None
    phone: Optional[str] = None
    is_active: bool
    address: Optional[str] = None
    qualification: Optional[str] = None
    photo_url: Optional[str] = None
    created_at: Optional[datetime] = None
    model_config = ConfigDict(from_attributes=True)
