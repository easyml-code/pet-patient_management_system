from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from typing import List, Optional
from app.database import get_db
from app.models import User, MedicalRecord
from app.schemas import MedicalRecordCreate, MedicalRecordUpdate, MedicalRecordResponse
from app.core.auth import get_current_user

router = APIRouter(prefix="/api/medical-records", tags=["Medical Records"])


@router.get("", response_model=List[MedicalRecordResponse])
async def list_medical_records(
    patient_id: Optional[str] = Query(None),
    pet_id: Optional[str] = Query(None),
    record_type: Optional[str] = Query(None),
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    query = select(MedicalRecord).where(MedicalRecord.tenant_id == current_user.tenant_id)
    if patient_id:
        query = query.where(MedicalRecord.patient_id == patient_id)
    if pet_id:
        query = query.where(MedicalRecord.pet_id == pet_id)
    if record_type:
        query = query.where(MedicalRecord.record_type == record_type)
    query = query.order_by(MedicalRecord.record_date.desc())
    result = await db.execute(query)
    return [MedicalRecordResponse.model_validate(r) for r in result.scalars().all()]


@router.post("", response_model=MedicalRecordResponse, status_code=201)
async def create_medical_record(
    data: MedicalRecordCreate,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    record = MedicalRecord(tenant_id=current_user.tenant_id, **data.model_dump())
    db.add(record)
    await db.commit()
    await db.refresh(record)
    return MedicalRecordResponse.model_validate(record)


@router.get("/{record_id}", response_model=MedicalRecordResponse)
async def get_medical_record(
    record_id: str,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(
        select(MedicalRecord).where(MedicalRecord.id == record_id, MedicalRecord.tenant_id == current_user.tenant_id)
    )
    record = result.scalar_one_or_none()
    if not record:
        raise HTTPException(status_code=404, detail="Medical record not found")
    return MedicalRecordResponse.model_validate(record)


@router.put("/{record_id}", response_model=MedicalRecordResponse)
async def update_medical_record(
    record_id: str,
    data: MedicalRecordUpdate,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(
        select(MedicalRecord).where(MedicalRecord.id == record_id, MedicalRecord.tenant_id == current_user.tenant_id)
    )
    record = result.scalar_one_or_none()
    if not record:
        raise HTTPException(status_code=404, detail="Medical record not found")
    for key, value in data.model_dump(exclude_unset=True).items():
        setattr(record, key, value)
    await db.commit()
    await db.refresh(record)
    return MedicalRecordResponse.model_validate(record)


@router.delete("/{record_id}")
async def delete_medical_record(
    record_id: str,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(
        select(MedicalRecord).where(MedicalRecord.id == record_id, MedicalRecord.tenant_id == current_user.tenant_id)
    )
    record = result.scalar_one_or_none()
    if not record:
        raise HTTPException(status_code=404, detail="Medical record not found")
    await db.delete(record)
    await db.commit()
    return {"detail": "Medical record deleted"}
