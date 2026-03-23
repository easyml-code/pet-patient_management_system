from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, delete
from typing import List, Optional
from pydantic import BaseModel, Field
from app.database import get_db
from app.models import User, Availability, Doctor
from app.schemas import AvailabilityCreate, AvailabilityUpdate, AvailabilityResponse
from app.core.auth import get_current_user
from app.core.rbac import get_linked_doctor
from app.cache import cache

router = APIRouter(prefix="/api/availability", tags=["Availability"])


class BulkAvailabilitySlot(BaseModel):
    day_of_week: int = Field(ge=0, le=6)
    start_time: str
    end_time: str
    is_available: bool = True


class BulkAvailabilityRequest(BaseModel):
    doctor_id: Optional[str] = None
    slots: List[BulkAvailabilitySlot]


@router.get("", response_model=List[AvailabilityResponse])
async def list_availability(
    doctor_id: Optional[str] = Query(None),
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    tid = current_user.tenant_id
    cached = cache.get_availability(tid, doctor_id)
    if cached is not None:
        return cached

    query = select(Availability).where(Availability.tenant_id == tid)
    if doctor_id:
        query = query.where(Availability.doctor_id == doctor_id)
    query = query.order_by(Availability.day_of_week, Availability.start_time)
    result = await db.execute(query)
    availability = [AvailabilityResponse.model_validate(a) for a in result.scalars().all()]
    cache.set_availability(tid, availability, doctor_id)
    return availability


@router.get("/my", response_model=List[AvailabilityResponse])
async def list_my_availability(
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """List current doctor's own availability."""
    linked_doctor = await get_linked_doctor(current_user, db)
    if not linked_doctor:
        raise HTTPException(status_code=403, detail="No linked doctor profile found")

    result = await db.execute(
        select(Availability)
        .where(Availability.tenant_id == current_user.tenant_id, Availability.doctor_id == linked_doctor.id)
        .order_by(Availability.day_of_week, Availability.start_time)
    )
    return [AvailabilityResponse.model_validate(a) for a in result.scalars().all()]


@router.post("", response_model=AvailabilityResponse, status_code=201)
async def create_availability(
    data: AvailabilityCreate,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    is_admin = current_user.is_admin or current_user.role == "admin"

    # Doctors can only create availability for themselves
    if not is_admin:
        linked_doctor = await get_linked_doctor(current_user, db)
        if not linked_doctor:
            raise HTTPException(status_code=403, detail="No linked doctor profile found")
        if data.doctor_id != linked_doctor.id:
            raise HTTPException(status_code=403, detail="You can only manage your own availability")

    doc_result = await db.execute(
        select(Doctor).where(Doctor.id == data.doctor_id, Doctor.tenant_id == current_user.tenant_id)
    )
    if not doc_result.scalar_one_or_none():
        raise HTTPException(status_code=404, detail="Doctor not found")

    avail = Availability(tenant_id=current_user.tenant_id, **data.model_dump())
    db.add(avail)
    await db.commit()
    await db.refresh(avail)
    cache.invalidate_availability(current_user.tenant_id)
    return AvailabilityResponse.model_validate(avail)


@router.post("/bulk", response_model=List[AvailabilityResponse])
async def bulk_set_availability(
    data: BulkAvailabilityRequest,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Replace all availability for a doctor with the provided slots."""
    is_admin = current_user.is_admin or current_user.role == "admin"

    doctor_id = data.doctor_id
    if not is_admin:
        linked_doctor = await get_linked_doctor(current_user, db)
        if not linked_doctor:
            raise HTTPException(status_code=403, detail="No linked doctor profile found")
        doctor_id = linked_doctor.id
    elif not doctor_id:
        raise HTTPException(status_code=400, detail="doctor_id is required for admin")

    # Verify doctor exists
    doc_result = await db.execute(
        select(Doctor).where(Doctor.id == doctor_id, Doctor.tenant_id == current_user.tenant_id)
    )
    if not doc_result.scalar_one_or_none():
        raise HTTPException(status_code=404, detail="Doctor not found")

    # Delete all existing availability for this doctor
    await db.execute(
        delete(Availability).where(
            Availability.doctor_id == doctor_id,
            Availability.tenant_id == current_user.tenant_id,
        )
    )

    # Create new slots
    new_slots = []
    for slot in data.slots:
        avail = Availability(
            tenant_id=current_user.tenant_id,
            doctor_id=doctor_id,
            day_of_week=slot.day_of_week,
            start_time=slot.start_time,
            end_time=slot.end_time,
            is_available=slot.is_available,
        )
        db.add(avail)
        new_slots.append(avail)

    await db.commit()
    for s in new_slots:
        await db.refresh(s)

    cache.invalidate_availability(current_user.tenant_id)
    return [AvailabilityResponse.model_validate(s) for s in new_slots]


@router.put("/{availability_id}", response_model=AvailabilityResponse)
async def update_availability(
    availability_id: str,
    data: AvailabilityUpdate,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    is_admin = current_user.is_admin or current_user.role == "admin"

    result = await db.execute(
        select(Availability).where(
            Availability.id == availability_id,
            Availability.tenant_id == current_user.tenant_id,
        )
    )
    avail = result.scalar_one_or_none()
    if not avail:
        raise HTTPException(status_code=404, detail="Availability not found")

    # Doctors can only edit their own availability
    if not is_admin:
        linked_doctor = await get_linked_doctor(current_user, db)
        if not linked_doctor or avail.doctor_id != linked_doctor.id:
            raise HTTPException(status_code=403, detail="You can only manage your own availability")

    for key, value in data.model_dump(exclude_unset=True).items():
        setattr(avail, key, value)
    await db.commit()
    await db.refresh(avail)
    cache.invalidate_availability(current_user.tenant_id)
    return AvailabilityResponse.model_validate(avail)


@router.delete("/{availability_id}")
async def delete_availability(
    availability_id: str,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    is_admin = current_user.is_admin or current_user.role == "admin"

    result = await db.execute(
        select(Availability).where(
            Availability.id == availability_id,
            Availability.tenant_id == current_user.tenant_id,
        )
    )
    avail = result.scalar_one_or_none()
    if not avail:
        raise HTTPException(status_code=404, detail="Availability not found")

    # Doctors can only delete their own availability
    if not is_admin:
        linked_doctor = await get_linked_doctor(current_user, db)
        if not linked_doctor or avail.doctor_id != linked_doctor.id:
            raise HTTPException(status_code=403, detail="You can only manage your own availability")

    await db.delete(avail)
    await db.commit()
    cache.invalidate_availability(current_user.tenant_id)
    return {"detail": "Availability deleted"}
