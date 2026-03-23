from pydantic import BaseModel, ConfigDict
from typing import Optional, Any
from datetime import datetime, date


class PrescriptionCreate(BaseModel):
    patient_id: str
    pet_id: Optional[str] = None
    doctor_id: Optional[str] = None
    appointment_id: Optional[str] = None
    medications: Optional[list[dict[str, Any]]] = None
    notes: Optional[str] = None
    prescribed_date: Optional[datetime] = None
    chief_complaint: Optional[str] = None
    diagnosis: Optional[str] = None
    lab_advice: Optional[str] = None
    follow_up_date: Optional[date] = None
    follow_up_notes: Optional[str] = None
    advice: Optional[str] = None
    prescription_mode: Optional[str] = "structured"
    free_text_prescription: Optional[str] = None


class PrescriptionUpdate(BaseModel):
    medications: Optional[list[dict[str, Any]]] = None
    notes: Optional[str] = None
    is_active: Optional[bool] = None
    chief_complaint: Optional[str] = None
    diagnosis: Optional[str] = None
    lab_advice: Optional[str] = None
    follow_up_date: Optional[date] = None
    follow_up_notes: Optional[str] = None
    advice: Optional[str] = None
    prescription_mode: Optional[str] = None
    free_text_prescription: Optional[str] = None


class PrescriptionResponse(BaseModel):
    id: str
    patient_id: str
    pet_id: Optional[str] = None
    doctor_id: Optional[str] = None
    appointment_id: Optional[str] = None
    medications: Optional[list[dict[str, Any]]] = None
    notes: Optional[str] = None
    prescribed_date: Optional[datetime] = None
    is_active: Optional[bool] = True
    chief_complaint: Optional[str] = None
    diagnosis: Optional[str] = None
    lab_advice: Optional[str] = None
    follow_up_date: Optional[date] = None
    follow_up_notes: Optional[str] = None
    advice: Optional[str] = None
    prescription_mode: Optional[str] = None
    free_text_prescription: Optional[str] = None
    created_at: Optional[datetime] = None
    model_config = ConfigDict(from_attributes=True)
