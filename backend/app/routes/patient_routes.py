from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, or_
from sqlalchemy.orm import selectinload
from typing import List, Optional
from app.database import get_db
from app.models import User, Patient, Appointment, Pet, MedicalRecord, Prescription, Report
from app.schemas import (
    PatientCreate, PatientUpdate, PatientResponse, AppointmentResponse,
    PetResponse, MedicalRecordResponse, PrescriptionResponse, ReportResponse,
)
from app.core.auth import get_current_user
from app.core.rbac import require_admin

router = APIRouter(prefix="/api/patients", tags=["Patients"])


@router.get("", response_model=List[PatientResponse])
async def list_patients(
    search: Optional[str] = Query(None),
    registration_status: Optional[str] = Query(None),
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    query = select(Patient).where(Patient.tenant_id == current_user.tenant_id)
    if registration_status:
        query = query.where(Patient.registration_status == registration_status)
    if search:
        query = query.where(
            or_(
                Patient.full_name.ilike(f"%{search}%"),
                Patient.email.ilike(f"%{search}%"),
                Patient.phone.ilike(f"%{search}%"),
            )
        )
    query = query.order_by(Patient.full_name)
    result = await db.execute(query)
    return [PatientResponse.model_validate(p) for p in result.scalars().all()]


@router.post("", response_model=PatientResponse, status_code=201)
async def create_patient(
    data: PatientCreate,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    patient = Patient(tenant_id=current_user.tenant_id, **data.model_dump())
    db.add(patient)
    await db.commit()
    await db.refresh(patient)
    return PatientResponse.model_validate(patient)


@router.get("/lookup")
async def lookup_patient_by_phone(
    phone: str = Query(..., min_length=3),
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Lookup patient by phone number. Returns patient with their pets."""
    result = await db.execute(
        select(Patient).where(
            Patient.tenant_id == current_user.tenant_id,
            Patient.phone == phone,
        )
    )
    patient = result.scalar_one_or_none()
    if not patient:
        return {"found": False, "patient": None, "pets": []}

    # Also fetch pets for this owner
    pets_result = await db.execute(
        select(Pet)
        .where(Pet.owner_id == patient.id, Pet.tenant_id == current_user.tenant_id)
        .order_by(Pet.name)
    )
    pets = [PetResponse.model_validate(p) for p in pets_result.scalars().all()]
    return {
        "found": True,
        "patient": PatientResponse.model_validate(patient),
        "pets": pets,
    }


@router.get("/{patient_id}", response_model=PatientResponse)
async def get_patient(
    patient_id: str,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(
        select(Patient).where(Patient.id == patient_id, Patient.tenant_id == current_user.tenant_id)
    )
    patient = result.scalar_one_or_none()
    if not patient:
        raise HTTPException(status_code=404, detail="Patient not found")
    return PatientResponse.model_validate(patient)


@router.get("/{patient_id}/appointments", response_model=List[AppointmentResponse])
async def get_patient_appointments(
    patient_id: str,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(
        select(Appointment)
        .options(selectinload(Appointment.doctor), selectinload(Appointment.service))
        .where(Appointment.patient_id == patient_id, Appointment.tenant_id == current_user.tenant_id)
        .order_by(Appointment.start_time.desc())
    )
    return [AppointmentResponse.model_validate(a) for a in result.scalars().all()]


@router.put("/{patient_id}", response_model=PatientResponse)
async def update_patient(
    patient_id: str,
    data: PatientUpdate,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(
        select(Patient).where(Patient.id == patient_id, Patient.tenant_id == current_user.tenant_id)
    )
    patient = result.scalar_one_or_none()
    if not patient:
        raise HTTPException(status_code=404, detail="Patient not found")

    for key, value in data.model_dump(exclude_unset=True).items():
        setattr(patient, key, value)
    await db.commit()
    await db.refresh(patient)
    return PatientResponse.model_validate(patient)


@router.delete("/{patient_id}")
async def delete_patient(
    patient_id: str,
    current_user: User = Depends(require_admin),
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(
        select(Patient).where(Patient.id == patient_id, Patient.tenant_id == current_user.tenant_id)
    )
    patient = result.scalar_one_or_none()
    if not patient:
        raise HTTPException(status_code=404, detail="Patient not found")
    await db.delete(patient)
    await db.commit()
    return {"detail": "Patient deleted"}


@router.get("/{patient_id}/pets", response_model=List[PetResponse])
async def get_patient_pets(
    patient_id: str,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(
        select(Pet)
        .where(Pet.owner_id == patient_id, Pet.tenant_id == current_user.tenant_id)
        .order_by(Pet.name)
    )
    return [PetResponse.model_validate(p) for p in result.scalars().all()]


@router.get("/{patient_id}/medical-records", response_model=List[MedicalRecordResponse])
async def get_patient_medical_records(
    patient_id: str,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(
        select(MedicalRecord)
        .where(MedicalRecord.patient_id == patient_id, MedicalRecord.tenant_id == current_user.tenant_id)
        .order_by(MedicalRecord.record_date.desc())
    )
    return [MedicalRecordResponse.model_validate(r) for r in result.scalars().all()]


@router.get("/{patient_id}/prescriptions", response_model=List[PrescriptionResponse])
async def get_patient_prescriptions(
    patient_id: str,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(
        select(Prescription)
        .where(Prescription.patient_id == patient_id, Prescription.tenant_id == current_user.tenant_id)
        .order_by(Prescription.prescribed_date.desc())
    )
    return [PrescriptionResponse.model_validate(r) for r in result.scalars().all()]


@router.get("/{patient_id}/reports", response_model=List[ReportResponse])
async def get_patient_reports(
    patient_id: str,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(
        select(Report)
        .where(Report.patient_id == patient_id, Report.tenant_id == current_user.tenant_id)
        .order_by(Report.report_date.desc())
    )
    return [ReportResponse.model_validate(r) for r in result.scalars().all()]
