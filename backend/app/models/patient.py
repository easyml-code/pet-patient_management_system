from sqlalchemy import Column, String, Boolean, Text, Date, DateTime, ForeignKey, func
from sqlalchemy.orm import relationship
from app.database import Base
from app.models.base import generate_uuid


class Patient(Base):
    __tablename__ = "patients"

    id = Column(String(36), primary_key=True, default=generate_uuid)
    tenant_id = Column(String(36), ForeignKey("tenants.id", ondelete="CASCADE"), nullable=False, index=True)
    full_name = Column(String(255), nullable=False)
    email = Column(String(255))
    phone = Column(String(50))
    date_of_birth = Column(Date, nullable=True)
    gender = Column(String(20))
    address = Column(Text)
    notes = Column(Text)
    pet_name = Column(String(255))
    pet_type = Column(String(100))
    blood_group = Column(String(10))
    allergies = Column(Text)
    chronic_conditions = Column(Text)
    emergency_contact_name = Column(String(255))
    emergency_contact_phone = Column(String(50))
    registration_status = Column(String(20), default="registered", server_default="registered")
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())

    tenant = relationship("Tenant", back_populates="patients")
    appointments = relationship("Appointment", back_populates="patient", cascade="all, delete-orphan")
    pets = relationship("Pet", back_populates="owner", cascade="all, delete-orphan")
    medical_records = relationship("MedicalRecord", back_populates="patient", cascade="all, delete-orphan")
    prescriptions = relationship("Prescription", back_populates="patient", cascade="all, delete-orphan")
    reports = relationship("Report", back_populates="patient", cascade="all, delete-orphan")
