from pydantic import BaseModel, ConfigDict
from typing import Optional
from datetime import datetime


class ServiceCreate(BaseModel):
    name: str
    description: Optional[str] = None
    duration_minutes: int = 30
    price: float = 0
    color: str = "#2563EB"
    doctor_id: Optional[str] = None


class ServiceUpdate(BaseModel):
    name: Optional[str] = None
    description: Optional[str] = None
    duration_minutes: Optional[int] = None
    price: Optional[float] = None
    color: Optional[str] = None
    is_active: Optional[bool] = None


class ServiceResponse(BaseModel):
    id: str
    doctor_id: Optional[str] = None
    name: str
    description: Optional[str] = None
    duration_minutes: int
    price: float
    color: str
    is_active: bool
    created_at: Optional[datetime] = None
    model_config = ConfigDict(from_attributes=True)
