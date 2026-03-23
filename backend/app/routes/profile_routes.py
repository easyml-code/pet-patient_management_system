from fastapi import APIRouter, Depends, HTTPException, UploadFile, File
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from pydantic import BaseModel
from typing import Optional
from supabase import create_client
from app.database import get_db
from app.models import User, Doctor, Staff
from app.core.auth import get_current_user
from app.config import settings
from app.cache import cache
import uuid

router = APIRouter(prefix="/api/profile", tags=["Profile"])


class ProfileResponse(BaseModel):
    user_id: str
    role: str
    is_admin: bool = False
    full_name: str
    email: Optional[str] = None
    phone: Optional[str] = None
    address: Optional[str] = None
    qualification: Optional[str] = None
    photo_url: Optional[str] = None
    # Doctor-specific
    specialization: Optional[str] = None
    license_number: Optional[str] = None
    registration_number: Optional[str] = None
    color: Optional[str] = None
    # Staff-specific
    staff_role: Optional[str] = None
    # Record id (doctor_id or staff_id)
    record_id: Optional[str] = None


class ProfileUpdate(BaseModel):
    full_name: Optional[str] = None
    phone: Optional[str] = None
    address: Optional[str] = None
    qualification: Optional[str] = None
    photo_url: Optional[str] = None
    # Doctor-specific
    specialization: Optional[str] = None
    license_number: Optional[str] = None
    registration_number: Optional[str] = None
    color: Optional[str] = None
    # Staff-specific
    staff_role: Optional[str] = None


@router.get("/me", response_model=ProfileResponse)
async def get_my_profile(
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Get the current user's profile (doctor or staff record)."""
    profile = ProfileResponse(
        user_id=current_user.id,
        role=current_user.role,
        is_admin=current_user.is_admin or current_user.role == "admin",
        full_name=current_user.full_name,
        email=current_user.email,
    )

    if current_user.role == "doctor":
        result = await db.execute(
            select(Doctor).where(Doctor.user_id == current_user.id, Doctor.tenant_id == current_user.tenant_id)
        )
        doctor = result.scalar_one_or_none()
        if doctor:
            profile.record_id = doctor.id
            profile.phone = doctor.phone
            profile.address = doctor.address
            profile.qualification = doctor.qualification
            profile.photo_url = doctor.photo_url
            profile.specialization = doctor.specialization
            profile.license_number = doctor.license_number
            profile.registration_number = doctor.registration_number
            profile.color = doctor.color
    elif current_user.role == "staff":
        result = await db.execute(
            select(Staff).where(Staff.user_id == current_user.id, Staff.tenant_id == current_user.tenant_id)
        )
        staff = result.scalar_one_or_none()
        if staff:
            profile.record_id = staff.id
            profile.phone = staff.phone
            profile.address = staff.address
            profile.qualification = staff.qualification
            profile.photo_url = staff.photo_url
            profile.staff_role = staff.role
    elif current_user.role == "admin":
        # Admin uses photo_url from user record
        profile.photo_url = current_user.photo_url

    return profile


@router.put("/me", response_model=ProfileResponse)
async def update_my_profile(
    data: ProfileUpdate,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Update the current user's own profile."""
    # Update user name if provided
    if data.full_name:
        current_user.full_name = data.full_name
        db.add(current_user)

    if current_user.role == "doctor":
        result = await db.execute(
            select(Doctor).where(Doctor.user_id == current_user.id, Doctor.tenant_id == current_user.tenant_id)
        )
        doctor = result.scalar_one_or_none()
        if not doctor:
            raise HTTPException(404, "Doctor record not found")
        if data.full_name is not None:
            doctor.full_name = data.full_name
        if data.phone is not None:
            doctor.phone = data.phone
        if data.address is not None:
            doctor.address = data.address
        if data.qualification is not None:
            doctor.qualification = data.qualification
        if data.photo_url is not None:
            doctor.photo_url = data.photo_url
        if data.specialization is not None:
            doctor.specialization = data.specialization
        if data.license_number is not None:
            doctor.license_number = data.license_number
        if data.registration_number is not None:
            doctor.registration_number = data.registration_number
        if data.color is not None:
            doctor.color = data.color
        db.add(doctor)
        cache.invalidate_doctors(current_user.tenant_id)

    elif current_user.role == "staff":
        result = await db.execute(
            select(Staff).where(Staff.user_id == current_user.id, Staff.tenant_id == current_user.tenant_id)
        )
        staff = result.scalar_one_or_none()
        if not staff:
            raise HTTPException(404, "Staff record not found")
        if data.full_name is not None:
            staff.full_name = data.full_name
        if data.phone is not None:
            staff.phone = data.phone
        if data.address is not None:
            staff.address = data.address
        if data.qualification is not None:
            staff.qualification = data.qualification
        if data.photo_url is not None:
            staff.photo_url = data.photo_url
        if data.staff_role is not None:
            staff.role = data.staff_role
        db.add(staff)

    await db.commit()
    # Re-fetch and return
    return await get_my_profile(current_user, db)


@router.post("/photo")
async def upload_profile_photo(
    file: UploadFile = File(...),
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Upload a profile photo. Saves to Supabase storage and updates the doctor/staff record."""
    sb = create_client(settings.SUPABASE_URL, settings.SUPABASE_SERVICE_ROLE_KEY)

    # Ensure the storage bucket exists
    try:
        sb.storage.create_bucket("clinic-assets", options={"public": True})
    except Exception:
        pass  # Bucket already exists

    ext = file.filename.split(".")[-1] if "." in file.filename else "jpg"
    path = f"profile-photos/{current_user.tenant_id}/{current_user.id}/{uuid.uuid4().hex}.{ext}"

    content = await file.read()
    sb.storage.from_("clinic-assets").upload(path, content, {"content-type": file.content_type})
    photo_url = sb.storage.from_("clinic-assets").get_public_url(path)

    # Always save on user record
    current_user.photo_url = photo_url
    db.add(current_user)

    # Also update doctor/staff record if exists
    if current_user.role == "doctor":
        result = await db.execute(
            select(Doctor).where(Doctor.user_id == current_user.id, Doctor.tenant_id == current_user.tenant_id)
        )
        doctor = result.scalar_one_or_none()
        if doctor:
            doctor.photo_url = photo_url
            cache.invalidate_doctors(current_user.tenant_id)
    elif current_user.role == "staff":
        result = await db.execute(
            select(Staff).where(Staff.user_id == current_user.id, Staff.tenant_id == current_user.tenant_id)
        )
        staff = result.scalar_one_or_none()
        if staff:
            staff.photo_url = photo_url

    await db.commit()
    return {"url": photo_url}


@router.delete("/photo")
async def delete_profile_photo(
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Remove the current user's profile photo."""
    current_user.photo_url = None
    db.add(current_user)

    if current_user.role == "doctor":
        result = await db.execute(
            select(Doctor).where(Doctor.user_id == current_user.id, Doctor.tenant_id == current_user.tenant_id)
        )
        doctor = result.scalar_one_or_none()
        if doctor:
            doctor.photo_url = None
            cache.invalidate_doctors(current_user.tenant_id)
    elif current_user.role == "staff":
        result = await db.execute(
            select(Staff).where(Staff.user_id == current_user.id, Staff.tenant_id == current_user.tenant_id)
        )
        staff = result.scalar_one_or_none()
        if staff:
            staff.photo_url = None

    await db.commit()
    return {"detail": "Photo removed"}
