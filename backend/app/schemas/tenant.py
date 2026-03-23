from pydantic import BaseModel, ConfigDict
from typing import Optional
from datetime import datetime


class TenantUpdate(BaseModel):
    name: Optional[str] = None
    type: Optional[str] = None
    email: Optional[str] = None
    phone: Optional[str] = None
    address: Optional[str] = None
    logo_url: Optional[str] = None
    website_url: Optional[str] = None
    description: Optional[str] = None
    city: Optional[str] = None
    state: Optional[str] = None
    country: Optional[str] = None
    postal_code: Optional[str] = None
    timezone: Optional[str] = None
    business_hours: Optional[dict] = None
    theme_color: Optional[str] = None
    settings: Optional[dict] = None


class TenantResponse(BaseModel):
    id: str
    name: str
    type: str
    email: Optional[str] = None
    phone: Optional[str] = None
    address: Optional[str] = None
    logo_url: Optional[str] = None
    website_url: Optional[str] = None
    description: Optional[str] = None
    city: Optional[str] = None
    state: Optional[str] = None
    country: Optional[str] = None
    postal_code: Optional[str] = None
    timezone: Optional[str] = None
    business_hours: Optional[dict] = None
    theme_color: Optional[str] = None
    settings: Optional[dict] = None
    created_at: Optional[datetime] = None
    model_config = ConfigDict(from_attributes=True)
