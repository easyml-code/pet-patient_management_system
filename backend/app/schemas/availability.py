from pydantic import BaseModel, ConfigDict, Field
from typing import Optional


class AvailabilityCreate(BaseModel):
    doctor_id: str
    day_of_week: int = Field(ge=0, le=6)
    start_time: str
    end_time: str


class AvailabilityUpdate(BaseModel):
    start_time: Optional[str] = None
    end_time: Optional[str] = None
    is_available: Optional[bool] = None


class AvailabilityResponse(BaseModel):
    id: str
    doctor_id: str
    day_of_week: int
    start_time: str
    end_time: str
    is_available: bool
    model_config = ConfigDict(from_attributes=True)
