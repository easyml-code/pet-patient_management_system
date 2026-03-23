from sqlalchemy import Column, String, Text, DateTime, JSON, ForeignKey, func
from sqlalchemy.orm import relationship
from app.database import Base
from app.models.base import generate_uuid


class MedicalRecord(Base):
    __tablename__ = "medical_records"

    id = Column(String(36), primary_key=True, default=generate_uuid)
    tenant_id = Column(String(36), ForeignKey("tenants.id", ondelete="CASCADE"), nullable=False, index=True)
    patient_id = Column(String(36), ForeignKey("patients.id", ondelete="CASCADE"), nullable=False, index=True)
    pet_id = Column(String(36), ForeignKey("pets.id", ondelete="SET NULL"), nullable=True, index=True)
    appointment_id = Column(String(36), ForeignKey("appointments.id", ondelete="SET NULL"), nullable=True)
    doctor_id = Column(String(36), ForeignKey("doctors.id", ondelete="SET NULL"), nullable=True, index=True)
    record_type = Column(String(50))  # consultation, diagnosis, procedure, vaccination, surgery, follow_up
    title = Column(String(255), nullable=False)
    description = Column(Text)
    diagnosis = Column(Text)
    treatment = Column(Text)
    vitals = Column(JSON)  # {"bp": "120/80", "temp": "98.6", "weight": "70kg"} etc.
    record_date = Column(DateTime(timezone=True), server_default=func.now())
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())

    tenant = relationship("Tenant")
    patient = relationship("Patient", back_populates="medical_records")
    pet = relationship("Pet", back_populates="medical_records")
    doctor = relationship("Doctor")
    appointment = relationship("Appointment")
