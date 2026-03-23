from pydantic import BaseModel, ConfigDict
from typing import Optional
from datetime import datetime


class NotificationCreate(BaseModel):
    type: str
    title: str
    message: Optional[str] = None
    recipient_type: Optional[str] = None
    recipient_id: Optional[str] = None


class NotificationResponse(BaseModel):
    id: str
    type: str
    title: str
    message: Optional[str] = None
    recipient_type: Optional[str] = None
    recipient_id: Optional[str] = None
    status: str
    is_read: bool
    created_at: Optional[datetime] = None
    model_config = ConfigDict(from_attributes=True)
