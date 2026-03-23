from pydantic import BaseModel, ConfigDict
from typing import Optional
from datetime import datetime, date


class PetCreate(BaseModel):
    owner_id: str
    name: str
    species: Optional[str] = None
    breed: Optional[str] = None
    color: Optional[str] = None
    weight: Optional[float] = None
    date_of_birth: Optional[date] = None
    gender: Optional[str] = None
    microchip_id: Optional[str] = None
    vaccination_status: Optional[str] = None
    photo_url: Optional[str] = None
    notes: Optional[str] = None


class PetUpdate(BaseModel):
    name: Optional[str] = None
    species: Optional[str] = None
    breed: Optional[str] = None
    color: Optional[str] = None
    weight: Optional[float] = None
    date_of_birth: Optional[date] = None
    gender: Optional[str] = None
    microchip_id: Optional[str] = None
    vaccination_status: Optional[str] = None
    photo_url: Optional[str] = None
    notes: Optional[str] = None
    is_active: Optional[bool] = None


class OwnerBrief(BaseModel):
    id: str
    full_name: str
    email: Optional[str] = None
    phone: Optional[str] = None
    address: Optional[str] = None
    registration_status: Optional[str] = None
    model_config = ConfigDict(from_attributes=True)


class PetResponse(BaseModel):
    id: str
    owner_id: str
    name: str
    species: Optional[str] = None
    breed: Optional[str] = None
    color: Optional[str] = None
    weight: Optional[float] = None
    date_of_birth: Optional[date] = None
    gender: Optional[str] = None
    microchip_id: Optional[str] = None
    vaccination_status: Optional[str] = None
    photo_url: Optional[str] = None
    notes: Optional[str] = None
    is_active: Optional[bool] = True
    created_at: Optional[datetime] = None
    owner: Optional[OwnerBrief] = None
    model_config = ConfigDict(from_attributes=True)
