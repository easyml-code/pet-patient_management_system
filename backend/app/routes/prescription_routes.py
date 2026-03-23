from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from typing import List, Optional
from datetime import datetime, timezone
from app.database import get_db
from app.models import User, Prescription, Appointment
from app.schemas import PrescriptionCreate, PrescriptionUpdate, PrescriptionResponse
from app.core.auth import get_current_user

router = APIRouter(prefix="/api/prescriptions", tags=["Prescriptions"])


@router.get("", response_model=List[PrescriptionResponse])
async def list_prescriptions(
    patient_id: Optional[str] = Query(None),
    pet_id: Optional[str] = Query(None),
    is_active: Optional[bool] = Query(None),
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    query = select(Prescription).where(Prescription.tenant_id == current_user.tenant_id)
    if patient_id:
        query = query.where(Prescription.patient_id == patient_id)
    if pet_id:
        query = query.where(Prescription.pet_id == pet_id)
    if is_active is not None:
        query = query.where(Prescription.is_active == is_active)
    query = query.order_by(Prescription.prescribed_date.desc())
    result = await db.execute(query)
    return [PrescriptionResponse.model_validate(r) for r in result.scalars().all()]


@router.post("", response_model=PrescriptionResponse, status_code=201)
async def create_prescription(
    data: PrescriptionCreate,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    # Validate: cannot create prescriptions for future/uncompleted appointments
    if data.appointment_id:
        appt_result = await db.execute(
            select(Appointment).where(
                Appointment.id == data.appointment_id,
                Appointment.tenant_id == current_user.tenant_id,
            )
        )
        appt = appt_result.scalar_one_or_none()
        if appt and appt.status in ("scheduled", "confirmed") and appt.start_time > datetime.now(timezone.utc):
            raise HTTPException(
                status_code=400,
                detail="Cannot create prescriptions for future or uncompleted appointments",
            )
    prescription = Prescription(tenant_id=current_user.tenant_id, **data.model_dump())
    db.add(prescription)
    await db.commit()
    await db.refresh(prescription)
    return PrescriptionResponse.model_validate(prescription)


@router.get("/{prescription_id}", response_model=PrescriptionResponse)
async def get_prescription(
    prescription_id: str,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(
        select(Prescription).where(Prescription.id == prescription_id, Prescription.tenant_id == current_user.tenant_id)
    )
    prescription = result.scalar_one_or_none()
    if not prescription:
        raise HTTPException(status_code=404, detail="Prescription not found")
    return PrescriptionResponse.model_validate(prescription)


@router.put("/{prescription_id}", response_model=PrescriptionResponse)
async def update_prescription(
    prescription_id: str,
    data: PrescriptionUpdate,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(
        select(Prescription).where(Prescription.id == prescription_id, Prescription.tenant_id == current_user.tenant_id)
    )
    prescription = result.scalar_one_or_none()
    if not prescription:
        raise HTTPException(status_code=404, detail="Prescription not found")
    for key, value in data.model_dump(exclude_unset=True).items():
        setattr(prescription, key, value)
    await db.commit()
    await db.refresh(prescription)
    return PrescriptionResponse.model_validate(prescription)


@router.delete("/{prescription_id}")
async def delete_prescription(
    prescription_id: str,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(
        select(Prescription).where(Prescription.id == prescription_id, Prescription.tenant_id == current_user.tenant_id)
    )
    prescription = result.scalar_one_or_none()
    if not prescription:
        raise HTTPException(status_code=404, detail="Prescription not found")
    await db.delete(prescription)
    await db.commit()
    return {"detail": "Prescription deleted"}
