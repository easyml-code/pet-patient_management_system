from sqlalchemy import Column, String, Boolean, Text, Date, Float, DateTime, ForeignKey, func
from sqlalchemy.orm import relationship
from app.database import Base
from app.models.base import generate_uuid


class Pet(Base):
    __tablename__ = "pets"

    id = Column(String(36), primary_key=True, default=generate_uuid)
    tenant_id = Column(String(36), ForeignKey("tenants.id", ondelete="CASCADE"), nullable=False, index=True)
    owner_id = Column(String(36), ForeignKey("patients.id", ondelete="CASCADE"), nullable=False, index=True)
    name = Column(String(255), nullable=False)
    species = Column(String(100))
    breed = Column(String(100))
    color = Column(String(100))
    weight = Column(Float)
    date_of_birth = Column(Date)
    gender = Column(String(20))
    microchip_id = Column(String(100))
    vaccination_status = Column(Text)
    photo_url = Column(Text)
    notes = Column(Text)
    is_active = Column(Boolean, default=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())

    tenant = relationship("Tenant")
    owner = relationship("Patient", back_populates="pets")
    medical_records = relationship("MedicalRecord", back_populates="pet", cascade="all, delete-orphan")
    prescriptions = relationship("Prescription", back_populates="pet", cascade="all, delete-orphan")
    reports = relationship("Report", back_populates="pet", cascade="all, delete-orphan")
