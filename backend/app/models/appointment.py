from sqlalchemy import Column, String, Text, DateTime, Numeric, ForeignKey, func, JSON
from sqlalchemy.orm import relationship
from app.database import Base
from app.models.base import generate_uuid


class Appointment(Base):
    __tablename__ = "appointments"

    id = Column(String(36), primary_key=True, default=generate_uuid)
    tenant_id = Column(String(36), ForeignKey("tenants.id", ondelete="CASCADE"), nullable=False, index=True)
    doctor_id = Column(String(36), ForeignKey("doctors.id", ondelete="CASCADE"), nullable=False, index=True)
    patient_id = Column(String(36), ForeignKey("patients.id", ondelete="CASCADE"), nullable=False, index=True)
    service_id = Column(String(36), ForeignKey("services.id"), nullable=True, index=True)
    pet_id = Column(String(36), ForeignKey("pets.id", ondelete="SET NULL"), nullable=True, index=True)
    start_time = Column(DateTime(timezone=True), nullable=False, index=True)
    end_time = Column(DateTime(timezone=True), nullable=False)
    status = Column(String(20), default="scheduled", index=True)
    notes = Column(Text)
    payment_amount = Column(Numeric(10, 2), nullable=True)
    payment_status = Column(String(20), default="pending")
    payment_method = Column(String(20), nullable=True)
    vitals = Column(JSON, nullable=True)
    vitals_recorded_by = Column(String(36), ForeignKey("users.id"), nullable=True)
    vitals_recorded_at = Column(DateTime(timezone=True), nullable=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())

    tenant = relationship("Tenant", back_populates="appointments")
    doctor = relationship("Doctor", back_populates="appointments")
    patient = relationship("Patient", back_populates="appointments")
    service = relationship("Service")
    pet = relationship("Pet")
