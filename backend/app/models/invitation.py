from sqlalchemy import Column, String, DateTime, ForeignKey, func
from app.database import Base
from app.models.base import generate_uuid


class Invitation(Base):
    __tablename__ = "invitations"

    id = Column(String(36), primary_key=True, default=generate_uuid)
    tenant_id = Column(String(36), ForeignKey("tenants.id", ondelete="CASCADE"), nullable=False, index=True)
    email = Column(String(255), nullable=False)
    role = Column(String(50), nullable=False)  # "doctor" or "staff"
    full_name = Column(String(255), nullable=False)
    specialization = Column(String(255))
    phone = Column(String(50))
    color = Column(String(7))
    token = Column(String(100), unique=True, nullable=False, index=True)
    status = Column(String(20), default="pending")  # pending, accepted, expired
    invited_by = Column(String(36), ForeignKey("users.id"))
    expires_at = Column(DateTime(timezone=True), nullable=False)
    accepted_at = Column(DateTime(timezone=True))
    created_at = Column(DateTime(timezone=True), server_default=func.now())
