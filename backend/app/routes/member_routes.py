import logging
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from pydantic import BaseModel
from typing import Optional
from app.database import get_db
from app.models import User, Doctor, Staff
from app.core.auth import get_current_user, get_supabase_admin
from app.core.rbac import require_admin
from app.cache import cache

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/api/members", tags=["Members"])


class CreateMemberRequest(BaseModel):
    email: str
    full_name: str
    role: str  # "doctor", "staff", or "admin"
    temp_password: str
    specialization: Optional[str] = None
    phone: Optional[str] = None
    color: Optional[str] = None


class UpdateMemberRoleRequest(BaseModel):
    role: Optional[str] = None      # "doctor", "staff", or "admin"
    is_admin: Optional[bool] = None  # grant/revoke admin privileges


class ChangeTempPasswordRequest(BaseModel):
    new_password: str


@router.post("", status_code=201)
async def create_member(
    data: CreateMemberRequest,
    current_user: User = Depends(require_admin),
    db: AsyncSession = Depends(get_db),
):
    """Admin creates a new member with a temporary password."""
    if data.role not in ("doctor", "staff", "admin"):
        raise HTTPException(400, "Role must be doctor, staff, or admin")
    if len(data.temp_password) < 6:
        raise HTTPException(400, "Password must be at least 6 characters")

    # Check if email already exists in this tenant
    existing = await db.execute(
        select(User).where(User.email == data.email, User.tenant_id == current_user.tenant_id)
    )
    if existing.scalar_one_or_none():
        raise HTTPException(400, "A member with this email already exists")

    # Create Supabase auth user with temp password
    try:
        sb = get_supabase_admin()
        auth_response = sb.auth.admin.create_user({
            "email": data.email,
            "password": data.temp_password,
            "email_confirm": True,
            "user_metadata": {
                "full_name": data.full_name,
                "must_change_password": True,
            },
        })
        supabase_user = auth_response.user
    except Exception as e:
        logger.error(f"Supabase user creation failed: {e}")
        raise HTTPException(500, "Failed to create user account")

    # Create User record
    user = User(
        id=str(supabase_user.id),
        tenant_id=current_user.tenant_id,
        email=data.email,
        full_name=data.full_name,
        role=data.role,
    )
    db.add(user)

    # Create Doctor or Staff record
    if data.role == "doctor":
        doctor = Doctor(
            tenant_id=current_user.tenant_id,
            user_id=str(supabase_user.id),
            full_name=data.full_name,
            specialization=data.specialization,
            email=data.email,
            phone=data.phone,
            color=data.color or "#2563EB",
        )
        db.add(doctor)
        cache.invalidate_doctors(current_user.tenant_id)
    elif data.role == "staff":
        staff = Staff(
            tenant_id=current_user.tenant_id,
            user_id=str(supabase_user.id),
            full_name=data.full_name,
            role=data.specialization or "Staff",
            email=data.email,
            phone=data.phone,
        )
        db.add(staff)

    await db.commit()
    return {"detail": "Member created successfully", "user_id": str(supabase_user.id)}


@router.get("/{user_id}")
async def get_member_user(
    user_id: str,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Get a user record by user_id (not doctor/staff id). Returns role and is_admin."""
    result = await db.execute(
        select(User).where(User.id == user_id, User.tenant_id == current_user.tenant_id)
    )
    user = result.scalar_one_or_none()
    if not user:
        raise HTTPException(404, "User not found")
    return {
        "id": user.id,
        "email": user.email,
        "full_name": user.full_name,
        "role": user.role,
        "is_admin": user.is_admin or user.role == "admin",
        "is_active": user.is_active,
    }


@router.put("/{user_id}/role")
async def update_member_role(
    user_id: str,
    data: UpdateMemberRoleRequest,
    current_user: User = Depends(require_admin),
    db: AsyncSession = Depends(get_db),
):
    """Admin can update a member's role and admin status."""
    result = await db.execute(
        select(User).where(User.id == user_id, User.tenant_id == current_user.tenant_id)
    )
    user = result.scalar_one_or_none()
    if not user:
        raise HTTPException(404, "User not found")

    if user.id == current_user.id:
        raise HTTPException(400, "Cannot change your own role")

    if data.role is not None:
        if data.role not in ("doctor", "staff", "admin"):
            raise HTTPException(400, "Role must be doctor, staff, or admin")
        user.role = data.role

    if data.is_admin is not None:
        user.is_admin = data.is_admin

    db.add(user)
    await db.commit()
    await db.refresh(user)
    return {"detail": "Role updated", "role": user.role, "is_admin": user.is_admin}


@router.post("/change-password")
async def change_temp_password(
    data: ChangeTempPasswordRequest,
    current_user: User = Depends(get_current_user),
):
    """Change temporary password on first login."""
    if len(data.new_password) < 6:
        raise HTTPException(400, "Password must be at least 6 characters")

    try:
        sb = get_supabase_admin()
        # Update the password
        sb.auth.admin.update_user_by_id(
            current_user.id,
            {"password": data.new_password, "user_metadata": {"must_change_password": False}},
        )
    except Exception as e:
        logger.error(f"Password change failed: {e}")
        raise HTTPException(500, "Failed to change password")

    return {"detail": "Password changed successfully"}
