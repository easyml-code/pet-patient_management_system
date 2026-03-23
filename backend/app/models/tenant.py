from sqlalchemy import Column, String, Text, DateTime, JSON, func
from sqlalchemy.orm import relationship
from app.database import Base
from app.models.base import generate_uuid


class Tenant(Base):
    __tablename__ = "tenants"

    id = Column(String(36), primary_key=True, default=generate_uuid)
    name = Column(String(255), nullable=False)
    type = Column(String(50), default="human_clinic")
    email = Column(String(255))
    phone = Column(String(50))
    address = Column(Text)
    logo_url = Column(String(500))
    website_url = Column(String(500))
    description = Column(Text)
    city = Column(String(100))
    state = Column(String(100))
    country = Column(String(100))
    postal_code = Column(String(20))
    timezone = Column(String(100))
    business_hours = Column(JSON)
    theme_color = Column(String(7), default="#2563EB")
    settings = Column(JSON, default=dict)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())

    users = relationship("User", back_populates="tenant", cascade="all, delete-orphan")
    doctors = relationship("Doctor", back_populates="tenant", cascade="all, delete-orphan")
    patients = relationship("Patient", back_populates="tenant", cascade="all, delete-orphan")
    services = relationship("Service", back_populates="tenant", cascade="all, delete-orphan")
    staff_members = relationship("Staff", back_populates="tenant", cascade="all, delete-orphan")
    appointments = relationship("Appointment", back_populates="tenant", cascade="all, delete-orphan")
    notifications = relationship("Notification", back_populates="tenant", cascade="all, delete-orphan")
