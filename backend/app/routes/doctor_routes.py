from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from typing import List
from app.database import get_db
from app.models import User, Doctor
from app.schemas import DoctorCreate, DoctorUpdate, DoctorResponse
from app.core.auth import get_current_user
from app.core.rbac import require_admin, require_any
from app.cache import cache

router = APIRouter(prefix="/api/doctors", tags=["Doctors"])


@router.get("", response_model=List[DoctorResponse])
async def list_doctors(
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    tid = current_user.tenant_id
    cached = cache.get_doctors_list(tid)
    if cached is not None:
        return cached

    result = await db.execute(
        select(Doctor).where(Doctor.tenant_id == tid).order_by(Doctor.full_name)
    )
    doctors = [DoctorResponse.model_validate(d) for d in result.scalars().all()]
    cache.set_doctors_list(tid, doctors)
    return doctors


@router.post("", response_model=DoctorResponse, status_code=201)
async def create_doctor(
    data: DoctorCreate,
    current_user: User = Depends(require_admin),
    db: AsyncSession = Depends(get_db),
):
    doctor = Doctor(tenant_id=current_user.tenant_id, **data.model_dump())
    db.add(doctor)
    await db.commit()
    await db.refresh(doctor)
    cache.invalidate_doctors(current_user.tenant_id)
    return DoctorResponse.model_validate(doctor)


@router.get("/{doctor_id}", response_model=DoctorResponse)
async def get_doctor(
    doctor_id: str,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    tid = current_user.tenant_id
    cached = cache.get_doctor(tid, doctor_id)
    if cached is not None:
        return cached

    result = await db.execute(
        select(Doctor).where(Doctor.id == doctor_id, Doctor.tenant_id == tid)
    )
    doctor = result.scalar_one_or_none()
    if not doctor:
        raise HTTPException(status_code=404, detail="Doctor not found")
    response = DoctorResponse.model_validate(doctor)
    cache.set_doctor(tid, doctor_id, response)
    return response


@router.put("/{doctor_id}", response_model=DoctorResponse)
async def update_doctor(
    doctor_id: str,
    data: DoctorUpdate,
    current_user: User = Depends(require_admin),
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(
        select(Doctor).where(Doctor.id == doctor_id, Doctor.tenant_id == current_user.tenant_id)
    )
    doctor = result.scalar_one_or_none()
    if not doctor:
        raise HTTPException(status_code=404, detail="Doctor not found")

    for key, value in data.model_dump(exclude_unset=True).items():
        setattr(doctor, key, value)
    await db.commit()
    await db.refresh(doctor)
    cache.invalidate_doctors(current_user.tenant_id)
    return DoctorResponse.model_validate(doctor)


@router.delete("/{doctor_id}")
async def delete_doctor(
    doctor_id: str,
    current_user: User = Depends(require_admin),
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(
        select(Doctor).where(Doctor.id == doctor_id, Doctor.tenant_id == current_user.tenant_id)
    )
    doctor = result.scalar_one_or_none()
    if not doctor:
        raise HTTPException(status_code=404, detail="Doctor not found")
    await db.delete(doctor)
    await db.commit()
    cache.invalidate_doctors(current_user.tenant_id)
    return {"detail": "Doctor deleted"}
