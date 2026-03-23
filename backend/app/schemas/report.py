from pydantic import BaseModel, ConfigDict
from typing import Optional
from datetime import datetime


class ReportCreate(BaseModel):
    patient_id: str
    pet_id: Optional[str] = None
    doctor_id: Optional[str] = None
    appointment_id: Optional[str] = None
    report_type: Optional[str] = None
    title: str
    description: Optional[str] = None
    file_url: Optional[str] = None
    report_date: Optional[datetime] = None


class ReportUpdate(BaseModel):
    report_type: Optional[str] = None
    title: Optional[str] = None
    description: Optional[str] = None
    file_url: Optional[str] = None
    report_date: Optional[datetime] = None


class ReportResponse(BaseModel):
    id: str
    patient_id: str
    pet_id: Optional[str] = None
    doctor_id: Optional[str] = None
    appointment_id: Optional[str] = None
    report_type: Optional[str] = None
    title: str
    description: Optional[str] = None
    file_url: Optional[str] = None
    report_date: Optional[datetime] = None
    created_at: Optional[datetime] = None
    model_config = ConfigDict(from_attributes=True)
