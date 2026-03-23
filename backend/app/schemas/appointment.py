from pydantic import BaseModel, ConfigDict
from typing import Optional
from datetime import datetime
from app.schemas.doctor import DoctorResponse
from app.schemas.patient import PatientResponse
from app.schemas.service import ServiceResponse
from app.schemas.pet import PetResponse


class AppointmentCreate(BaseModel):
    doctor_id: str
    patient_id: str
    service_id: Optional[str] = None
    pet_id: Optional[str] = None
    start_time: datetime
    end_time: datetime
    notes: Optional[str] = None
    payment_amount: Optional[float] = None
    payment_status: Optional[str] = "pending"
    payment_method: Optional[str] = None


class VitalsEntry(BaseModel):
    weight: Optional[float] = None
    temperature: Optional[float] = None
    heart_rate: Optional[int] = None
    respiratory_rate: Optional[int] = None
    blood_pressure: Optional[str] = None
    notes: Optional[str] = None


class AppointmentUpdate(BaseModel):
    doctor_id: Optional[str] = None
    patient_id: Optional[str] = None
    service_id: Optional[str] = None
    pet_id: Optional[str] = None
    start_time: Optional[datetime] = None
    end_time: Optional[datetime] = None
    status: Optional[str] = None
    notes: Optional[str] = None
    payment_amount: Optional[float] = None
    payment_status: Optional[str] = None
    payment_method: Optional[str] = None
    vitals: Optional[dict] = None


class AppointmentResponse(BaseModel):
    id: str
    doctor_id: str
    patient_id: str
    service_id: Optional[str] = None
    pet_id: Optional[str] = None
    start_time: datetime
    end_time: datetime
    status: str
    notes: Optional[str] = None
    payment_amount: Optional[float] = None
    payment_status: Optional[str] = None
    payment_method: Optional[str] = None
    vitals: Optional[dict] = None
    vitals_recorded_by: Optional[str] = None
    vitals_recorded_at: Optional[datetime] = None
    created_at: Optional[datetime] = None
    doctor: Optional[DoctorResponse] = None
    patient: Optional[PatientResponse] = None
    service: Optional[ServiceResponse] = None
    pet: Optional[PetResponse] = None
    model_config = ConfigDict(from_attributes=True)
