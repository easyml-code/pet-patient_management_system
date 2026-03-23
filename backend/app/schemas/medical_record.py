from pydantic import BaseModel, ConfigDict
from typing import Optional, Any
from datetime import datetime


class MedicalRecordCreate(BaseModel):
    patient_id: str
    pet_id: Optional[str] = None
    appointment_id: Optional[str] = None
    doctor_id: Optional[str] = None
    record_type: Optional[str] = None
    title: str
    description: Optional[str] = None
    diagnosis: Optional[str] = None
    treatment: Optional[str] = None
    vitals: Optional[dict[str, Any]] = None
    record_date: Optional[datetime] = None


class MedicalRecordUpdate(BaseModel):
    record_type: Optional[str] = None
    title: Optional[str] = None
    description: Optional[str] = None
    diagnosis: Optional[str] = None
    treatment: Optional[str] = None
    vitals: Optional[dict[str, Any]] = None
    record_date: Optional[datetime] = None


class MedicalRecordResponse(BaseModel):
    id: str
    patient_id: str
    pet_id: Optional[str] = None
    appointment_id: Optional[str] = None
    doctor_id: Optional[str] = None
    record_type: Optional[str] = None
    title: str
    description: Optional[str] = None
    diagnosis: Optional[str] = None
    treatment: Optional[str] = None
    vitals: Optional[dict[str, Any]] = None
    record_date: Optional[datetime] = None
    created_at: Optional[datetime] = None
    model_config = ConfigDict(from_attributes=True)
