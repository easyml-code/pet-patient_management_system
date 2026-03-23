from sqlalchemy import Column, String, Boolean, Text, DateTime, JSON, ForeignKey, func
from sqlalchemy.orm import relationship
from app.database import Base
from app.models.base import generate_uuid


class Prescription(Base):
    __tablename__ = "prescriptions"

    id = Column(String(36), primary_key=True, default=generate_uuid)
    tenant_id = Column(String(36), ForeignKey("tenants.id", ondelete="CASCADE"), nullable=False, index=True)
    patient_id = Column(String(36), ForeignKey("patients.id", ondelete="CASCADE"), nullable=False, index=True)
    pet_id = Column(String(36), ForeignKey("pets.id", ondelete="SET NULL"), nullable=True, index=True)
    doctor_id = Column(String(36), ForeignKey("doctors.id", ondelete="SET NULL"), nullable=True, index=True)
    appointment_id = Column(String(36), ForeignKey("appointments.id", ondelete="SET NULL"), nullable=True)
    medications = Column(JSON)  # [{"name": "...", "dosage": "...", "frequency": "...", "duration": "..."}]
    notes = Column(Text)
    prescribed_date = Column(DateTime(timezone=True), server_default=func.now())
    is_active = Column(Boolean, default=True)
    chief_complaint = Column(Text, nullable=True)
    diagnosis = Column(Text, nullable=True)
    lab_advice = Column(Text, nullable=True)
    follow_up_date = Column(DateTime(timezone=True), nullable=True)
    follow_up_notes = Column(Text, nullable=True)
    advice = Column(Text, nullable=True)
    prescription_mode = Column(String(20), default="structured")
    free_text_prescription = Column(Text, nullable=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())

    tenant = relationship("Tenant")
    patient = relationship("Patient", back_populates="prescriptions")
    pet = relationship("Pet", back_populates="prescriptions")
    doctor = relationship("Doctor")
    appointment = relationship("Appointment")
