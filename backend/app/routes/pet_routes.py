from fastapi import APIRouter, Depends, HTTPException, Query, UploadFile, File
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from sqlalchemy.orm import selectinload
from typing import List, Optional
from app.database import get_db
from app.models import User, Pet, Patient, Appointment, MedicalRecord, Prescription, Report, Doctor, Service
from app.schemas import PetCreate, PetUpdate, PetResponse, AppointmentResponse, MedicalRecordResponse, PrescriptionResponse, ReportResponse
from app.core.auth import get_current_user
from supabase import create_client
from app.config import settings
import uuid

router = APIRouter(prefix="/api/pets", tags=["Pets"])


def _get_supabase():
    return create_client(settings.SUPABASE_URL, settings.SUPABASE_SERVICE_ROLE_KEY)


@router.get("", response_model=List[PetResponse])
async def list_pets(
    owner_id: Optional[str] = Query(None),
    search: Optional[str] = Query(None),
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    query = (
        select(Pet)
        .options(selectinload(Pet.owner))
        .where(Pet.tenant_id == current_user.tenant_id)
    )
    if owner_id:
        query = query.where(Pet.owner_id == owner_id)
    if search:
        query = query.where(Pet.name.ilike(f"%{search}%"))
    query = query.order_by(Pet.created_at.desc())
    result = await db.execute(query)
    return [PetResponse.model_validate(p) for p in result.scalars().all()]


@router.post("", response_model=PetResponse, status_code=201)
async def create_pet(
    data: PetCreate,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    pet = Pet(tenant_id=current_user.tenant_id, **data.model_dump())
    db.add(pet)
    await db.commit()
    result = await db.execute(
        select(Pet).options(selectinload(Pet.owner)).where(Pet.id == pet.id)
    )
    return PetResponse.model_validate(result.scalar_one())


@router.get("/{pet_id}", response_model=PetResponse)
async def get_pet(
    pet_id: str,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(
        select(Pet)
        .options(selectinload(Pet.owner))
        .where(Pet.id == pet_id, Pet.tenant_id == current_user.tenant_id)
    )
    pet = result.scalar_one_or_none()
    if not pet:
        raise HTTPException(status_code=404, detail="Pet not found")
    return PetResponse.model_validate(pet)


@router.put("/{pet_id}", response_model=PetResponse)
async def update_pet(
    pet_id: str,
    data: PetUpdate,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(
        select(Pet).where(Pet.id == pet_id, Pet.tenant_id == current_user.tenant_id)
    )
    pet = result.scalar_one_or_none()
    if not pet:
        raise HTTPException(status_code=404, detail="Pet not found")
    for key, value in data.model_dump(exclude_unset=True).items():
        setattr(pet, key, value)
    await db.commit()
    result = await db.execute(
        select(Pet).options(selectinload(Pet.owner)).where(Pet.id == pet_id)
    )
    return PetResponse.model_validate(result.scalar_one())


@router.delete("/{pet_id}")
async def delete_pet(
    pet_id: str,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(
        select(Pet).where(Pet.id == pet_id, Pet.tenant_id == current_user.tenant_id)
    )
    pet = result.scalar_one_or_none()
    if not pet:
        raise HTTPException(status_code=404, detail="Pet not found")
    await db.delete(pet)
    await db.commit()
    return {"detail": "Pet deleted"}


@router.get("/{pet_id}/appointments", response_model=List[AppointmentResponse])
async def get_pet_appointments(
    pet_id: str,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(
        select(Appointment)
        .options(
            selectinload(Appointment.doctor),
            selectinload(Appointment.patient),
            selectinload(Appointment.service),
            selectinload(Appointment.pet),
        )
        .where(
            Appointment.pet_id == pet_id,
            Appointment.tenant_id == current_user.tenant_id,
        )
        .order_by(Appointment.start_time.desc())
    )
    return [AppointmentResponse.model_validate(a) for a in result.scalars().all()]


@router.get("/{pet_id}/medical-records", response_model=List[MedicalRecordResponse])
async def get_pet_medical_records(
    pet_id: str,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(
        select(MedicalRecord)
        .where(
            MedicalRecord.pet_id == pet_id,
            MedicalRecord.tenant_id == current_user.tenant_id,
        )
        .order_by(MedicalRecord.record_date.desc())
    )
    return [MedicalRecordResponse.model_validate(r) for r in result.scalars().all()]


@router.get("/{pet_id}/prescriptions", response_model=List[PrescriptionResponse])
async def get_pet_prescriptions(
    pet_id: str,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(
        select(Prescription)
        .where(
            Prescription.pet_id == pet_id,
            Prescription.tenant_id == current_user.tenant_id,
        )
        .order_by(Prescription.prescribed_date.desc())
    )
    return [PrescriptionResponse.model_validate(r) for r in result.scalars().all()]


@router.get("/{pet_id}/reports", response_model=List[ReportResponse])
async def get_pet_reports(
    pet_id: str,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(
        select(Report)
        .where(
            Report.pet_id == pet_id,
            Report.tenant_id == current_user.tenant_id,
        )
        .order_by(Report.report_date.desc())
    )
    return [ReportResponse.model_validate(r) for r in result.scalars().all()]


@router.post("/{pet_id}/upload")
async def upload_pet_file(
    pet_id: str,
    file: UploadFile = File(...),
    file_type: str = Query("document", regex="^(photo|document)$"),
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Upload a photo or document for a pet. Returns the public URL."""
    result = await db.execute(
        select(Pet).where(Pet.id == pet_id, Pet.tenant_id == current_user.tenant_id)
    )
    pet = result.scalar_one_or_none()
    if not pet:
        raise HTTPException(status_code=404, detail="Pet not found")

    sb = _get_supabase()

    # Ensure the storage bucket exists
    try:
        sb.storage.create_bucket("clinic-assets", options={"public": True})
    except Exception:
        pass  # Bucket already exists

    ext = file.filename.split(".")[-1] if "." in file.filename else "bin"
    folder = "pet-photos" if file_type == "photo" else "pet-documents"
    path = f"{folder}/{current_user.tenant_id}/{pet_id}/{uuid.uuid4().hex}.{ext}"

    content = await file.read()
    sb.storage.from_("clinic-assets").upload(path, content, {"content-type": file.content_type})
    url_data = sb.storage.from_("clinic-assets").get_public_url(path)

    # If it's a photo, update the pet's photo_url
    if file_type == "photo":
        pet.photo_url = url_data
        await db.commit()

    return {"url": url_data, "file_type": file_type, "filename": file.filename}
