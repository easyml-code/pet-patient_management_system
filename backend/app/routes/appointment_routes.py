from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, and_, func, or_
from sqlalchemy.orm import selectinload
from typing import List, Optional
from datetime import datetime, timezone, date, timedelta, time as dtime
from app.database import get_db
from app.models import User, Appointment, Doctor, Patient, Service, Notification, Pet, MedicalRecord, Prescription, Report
from app.models.availability import Availability
from pydantic import BaseModel
from app.schemas import AppointmentCreate, AppointmentUpdate, AppointmentResponse, MedicalRecordResponse, PrescriptionCreate, PrescriptionResponse, ReportResponse
from app.schemas.appointment import VitalsEntry
from app.schemas.patient import PatientResponse
from app.schemas.pet import PetResponse
from app.core.auth import get_current_user
from app.core.rbac import get_linked_doctor


class QuickBookRequest(BaseModel):
    owner_name: str
    owner_phone: str
    pet_name: str
    pet_type: str
    reason: Optional[str] = None
    doctor_id: str
    start_time: datetime
    end_time: datetime
    service_id: Optional[str] = None

router = APIRouter(prefix="/api/appointments", tags=["Appointments"])


def _build_query(tenant_id: str):
    return (
        select(Appointment)
        .options(
            selectinload(Appointment.doctor),
            selectinload(Appointment.patient),
            selectinload(Appointment.service),
            selectinload(Appointment.pet).selectinload(Pet.owner),
        )
        .where(Appointment.tenant_id == tenant_id)
    )


@router.get("", response_model=List[AppointmentResponse])
async def list_appointments(
    doctor_id: Optional[str] = Query(None),
    status: Optional[str] = Query(None),
    date_from: Optional[datetime] = Query(None),
    date_to: Optional[datetime] = Query(None),
    patient_id: Optional[str] = Query(None),
    search: Optional[str] = Query(None),
    skip: int = Query(0, ge=0),
    limit: int = Query(200, ge=1, le=500),
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    query = _build_query(current_user.tenant_id)
    # Doctor role: only see own appointments
    if current_user.role == "doctor":
        linked_doctor = await get_linked_doctor(current_user, db)
        if linked_doctor:
            query = query.where(Appointment.doctor_id == linked_doctor.id)
        else:
            return []
    elif doctor_id:
        query = query.where(Appointment.doctor_id == doctor_id)
    if status:
        query = query.where(Appointment.status == status)
    if date_from:
        query = query.where(Appointment.start_time >= date_from)
    if date_to:
        query = query.where(Appointment.start_time <= date_to)
    if patient_id:
        query = query.where(Appointment.patient_id == patient_id)
    if search:
        query = query.where(
            or_(
                Patient.full_name.ilike(f"%{search}%"),
                Doctor.full_name.ilike(f"%{search}%"),
            )
        ).join(Patient, Appointment.patient_id == Patient.id).join(Doctor, Appointment.doctor_id == Doctor.id)
    query = query.order_by(Appointment.start_time.desc()).offset(skip).limit(limit)
    result = await db.execute(query)
    return [AppointmentResponse.model_validate(a) for a in result.scalars().all()]


@router.get("/today", response_model=List[AppointmentResponse])
async def today_appointments(
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    today = date.today()
    start = datetime(today.year, today.month, today.day, 0, 0, 0, tzinfo=timezone.utc)
    end = datetime(today.year, today.month, today.day, 23, 59, 59, tzinfo=timezone.utc)
    query = (
        _build_query(current_user.tenant_id)
        .where(Appointment.start_time >= start, Appointment.start_time <= end)
        .order_by(Appointment.start_time)
    )
    # Doctor role: only see own appointments
    if current_user.role == "doctor":
        linked_doctor = await get_linked_doctor(current_user, db)
        if linked_doctor:
            query = query.where(Appointment.doctor_id == linked_doctor.id)
        else:
            return []
    result = await db.execute(query)
    return [AppointmentResponse.model_validate(a) for a in result.scalars().all()]


@router.get("/available-slots")
async def get_available_slots(
    doctor_id: str = Query(...),
    date_str: str = Query(..., alias="date"),
    duration: int = Query(30, ge=15, le=120),
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Get available time slots for a doctor on a given date."""
    try:
        target_date = datetime.strptime(date_str, "%Y-%m-%d").date()
    except ValueError:
        raise HTTPException(400, "Invalid date format. Use YYYY-MM-DD")

    day_of_week = target_date.weekday()  # 0=Monday

    # Get doctor's availability for this day
    avail_result = await db.execute(
        select(Availability).where(
            Availability.doctor_id == doctor_id,
            Availability.tenant_id == current_user.tenant_id,
            Availability.day_of_week == day_of_week,
            Availability.is_available == True,
        )
    )
    availability_windows = avail_result.scalars().all()

    if not availability_windows:
        # Default: 9am-5pm if no availability set
        availability_windows = [type("Avail", (), {"start_time": "09:00", "end_time": "17:00"})]

    # Get existing appointments for this doctor on this date
    day_start = datetime(target_date.year, target_date.month, target_date.day, 0, 0, 0, tzinfo=timezone.utc)
    day_end = datetime(target_date.year, target_date.month, target_date.day, 23, 59, 59, tzinfo=timezone.utc)
    appt_result = await db.execute(
        select(Appointment).where(
            Appointment.doctor_id == doctor_id,
            Appointment.tenant_id == current_user.tenant_id,
            Appointment.start_time >= day_start,
            Appointment.start_time <= day_end,
            Appointment.status.notin_(["cancelled"]),
        )
    )
    existing_appts = appt_result.scalars().all()

    # Generate slots
    slots = []
    for window in availability_windows:
        w_start_parts = window.start_time.split(":")
        w_end_parts = window.end_time.split(":")
        w_start = datetime(target_date.year, target_date.month, target_date.day,
                          int(w_start_parts[0]), int(w_start_parts[1]), tzinfo=timezone.utc)
        w_end = datetime(target_date.year, target_date.month, target_date.day,
                        int(w_end_parts[0]), int(w_end_parts[1]), tzinfo=timezone.utc)

        current = w_start
        while current + timedelta(minutes=duration) <= w_end:
            slot_end = current + timedelta(minutes=duration)
            # Check overlap with existing appointments
            is_available = True
            for appt in existing_appts:
                appt_start = appt.start_time.replace(tzinfo=timezone.utc) if appt.start_time.tzinfo is None else appt.start_time
                appt_end = appt.end_time.replace(tzinfo=timezone.utc) if appt.end_time.tzinfo is None else appt.end_time
                if current < appt_end and slot_end > appt_start:
                    is_available = False
                    break
            slots.append({
                "start_time": current.strftime("%H:%M"),
                "end_time": slot_end.strftime("%H:%M"),
                "available": is_available,
            })
            current += timedelta(minutes=duration)

    return slots


@router.post("", response_model=AppointmentResponse, status_code=201)
async def create_appointment(
    data: AppointmentCreate,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    doc_result = await db.execute(
        select(Doctor).where(Doctor.id == data.doctor_id, Doctor.tenant_id == current_user.tenant_id)
    )
    if not doc_result.scalar_one_or_none():
        raise HTTPException(status_code=404, detail="Doctor not found")

    pat_result = await db.execute(
        select(Patient).where(Patient.id == data.patient_id, Patient.tenant_id == current_user.tenant_id)
    )
    if not pat_result.scalar_one_or_none():
        raise HTTPException(status_code=404, detail="Patient not found")

    appointment = Appointment(tenant_id=current_user.tenant_id, **data.model_dump())
    db.add(appointment)

    notification = Notification(
        tenant_id=current_user.tenant_id,
        type="appointment_booked",
        title="New Appointment Booked",
        message=f"Appointment scheduled for {data.start_time.strftime('%b %d, %Y at %H:%M')}",
        recipient_type="doctor",
        recipient_id=data.doctor_id,
        status="sent",
    )
    db.add(notification)
    await db.commit()

    result = await db.execute(
        _build_query(current_user.tenant_id).where(Appointment.id == appointment.id)
    )
    return AppointmentResponse.model_validate(result.scalar_one())


@router.post("/quick-book")
async def quick_book(
    data: QuickBookRequest,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Quick book: create patient (pending) + pet + appointment in one call."""
    tid = current_user.tenant_id

    # Verify doctor exists
    doc_result = await db.execute(
        select(Doctor).where(Doctor.id == data.doctor_id, Doctor.tenant_id == tid)
    )
    if not doc_result.scalar_one_or_none():
        raise HTTPException(status_code=404, detail="Doctor not found")

    # Create patient with pending registration
    patient = Patient(
        tenant_id=tid,
        full_name=data.owner_name,
        phone=data.owner_phone,
        registration_status="pending",
    )
    db.add(patient)
    await db.flush()

    # Create pet
    pet = Pet(
        tenant_id=tid,
        owner_id=patient.id,
        name=data.pet_name,
        species=data.pet_type,
    )
    db.add(pet)
    await db.flush()

    # Create appointment
    appointment = Appointment(
        tenant_id=tid,
        doctor_id=data.doctor_id,
        patient_id=patient.id,
        pet_id=pet.id,
        service_id=data.service_id,
        start_time=data.start_time,
        end_time=data.end_time,
        notes=data.reason,
        status="scheduled",
    )
    db.add(appointment)

    notification = Notification(
        tenant_id=tid,
        type="appointment_booked",
        title="New Appointment Booked (Quick)",
        message=f"Quick booking for {data.owner_name} / {data.pet_name} on {data.start_time.strftime('%b %d, %Y at %H:%M')}",
        recipient_type="doctor",
        recipient_id=data.doctor_id,
        status="sent",
    )
    db.add(notification)
    await db.commit()
    await db.refresh(patient)
    await db.refresh(pet)
    await db.refresh(appointment)

    return {
        "appointment": AppointmentResponse.model_validate(appointment),
        "patient": PatientResponse.model_validate(patient),
        "pet": PetResponse.model_validate(pet),
    }


@router.get("/{appointment_id}", response_model=AppointmentResponse)
async def get_appointment(
    appointment_id: str,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(
        _build_query(current_user.tenant_id).where(Appointment.id == appointment_id)
    )
    appointment = result.scalar_one_or_none()
    if not appointment:
        raise HTTPException(status_code=404, detail="Appointment not found")
    return AppointmentResponse.model_validate(appointment)


@router.get("/{appointment_id}/details")
async def get_appointment_details(
    appointment_id: str,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Get all records, prescriptions, and reports linked to an appointment."""
    t_id = current_user.tenant_id
    mr_result = await db.execute(
        select(MedicalRecord).where(
            MedicalRecord.appointment_id == appointment_id,
            MedicalRecord.tenant_id == t_id,
        ).order_by(MedicalRecord.record_date.desc())
    )
    rx_result = await db.execute(
        select(Prescription).where(
            Prescription.appointment_id == appointment_id,
            Prescription.tenant_id == t_id,
        ).order_by(Prescription.prescribed_date.desc())
    )
    rep_result = await db.execute(
        select(Report).where(
            Report.appointment_id == appointment_id,
            Report.tenant_id == t_id,
        ).order_by(Report.report_date.desc())
    )
    return {
        "medical_records": [MedicalRecordResponse.model_validate(r) for r in mr_result.scalars().all()],
        "prescriptions": [PrescriptionResponse.model_validate(r) for r in rx_result.scalars().all()],
        "reports": [ReportResponse.model_validate(r) for r in rep_result.scalars().all()],
    }


@router.post("/{appointment_id}/vitals", response_model=AppointmentResponse)
async def record_vitals(
    appointment_id: str,
    data: VitalsEntry,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Staff records vitals before doctor initiates."""
    if current_user.role == "doctor":
        raise HTTPException(status_code=403, detail="Staff or admin must record vitals")

    result = await db.execute(
        select(Appointment).where(
            Appointment.id == appointment_id,
            Appointment.tenant_id == current_user.tenant_id,
        )
    )
    appointment = result.scalar_one_or_none()
    if not appointment:
        raise HTTPException(status_code=404, detail="Appointment not found")

    appointment.vitals = data.model_dump(exclude_none=True)
    appointment.vitals_recorded_by = current_user.id
    appointment.vitals_recorded_at = datetime.now(timezone.utc)
    await db.commit()

    result = await db.execute(
        _build_query(current_user.tenant_id).where(Appointment.id == appointment_id)
    )
    return AppointmentResponse.model_validate(result.scalar_one())


@router.put("/{appointment_id}", response_model=AppointmentResponse)
async def update_appointment(
    appointment_id: str,
    data: AppointmentUpdate,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(
        select(Appointment).where(
            Appointment.id == appointment_id,
            Appointment.tenant_id == current_user.tenant_id,
        )
    )
    appointment = result.scalar_one_or_none()
    if not appointment:
        raise HTTPException(status_code=404, detail="Appointment not found")

    old_status = appointment.status
    for key, value in data.model_dump(exclude_unset=True).items():
        setattr(appointment, key, value)

    if data.status and data.status != old_status:
        notification = Notification(
            tenant_id=current_user.tenant_id,
            type=f"appointment_{data.status}",
            title=f"Appointment {data.status.title()}",
            message=f"Appointment status changed to {data.status}",
            recipient_type="patient",
            recipient_id=appointment.patient_id,
            status="sent",
        )
        db.add(notification)

    await db.commit()
    result = await db.execute(
        _build_query(current_user.tenant_id).where(Appointment.id == appointment_id)
    )
    return AppointmentResponse.model_validate(result.scalar_one())


@router.post("/{appointment_id}/initiate", response_model=AppointmentResponse)
async def initiate_appointment(
    appointment_id: str,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Doctor initiates an appointment to start the consultation."""
    if current_user.role != "doctor":
        raise HTTPException(status_code=403, detail="Only doctors can initiate appointments")

    linked_doctor = await get_linked_doctor(current_user, db)
    if not linked_doctor:
        raise HTTPException(status_code=403, detail="No linked doctor profile found")

    result = await db.execute(
        select(Appointment).where(
            Appointment.id == appointment_id,
            Appointment.tenant_id == current_user.tenant_id,
        )
    )
    appointment = result.scalar_one_or_none()
    if not appointment:
        raise HTTPException(status_code=404, detail="Appointment not found")
    if appointment.doctor_id != linked_doctor.id:
        raise HTTPException(status_code=403, detail="You can only initiate your own appointments")
    if appointment.status not in ("scheduled", "confirmed"):
        raise HTTPException(status_code=400, detail=f"Cannot initiate appointment with status '{appointment.status}'")
    if not appointment.vitals:
        raise HTTPException(status_code=400, detail="Vitals must be recorded before initiating")

    appointment.status = "in_progress"
    await db.commit()

    result = await db.execute(
        _build_query(current_user.tenant_id).where(Appointment.id == appointment_id)
    )
    return AppointmentResponse.model_validate(result.scalar_one())


@router.get("/{appointment_id}/consultation")
async def get_consultation(
    appointment_id: str,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Get appointment details + existing prescription for consultation page."""
    result = await db.execute(
        _build_query(current_user.tenant_id).where(Appointment.id == appointment_id)
    )
    appointment = result.scalar_one_or_none()
    if not appointment:
        raise HTTPException(status_code=404, detail="Appointment not found")

    # Get existing prescription for this appointment
    rx_result = await db.execute(
        select(Prescription).where(
            Prescription.appointment_id == appointment_id,
            Prescription.tenant_id == current_user.tenant_id,
        )
    )
    prescription = rx_result.scalar_one_or_none()

    return {
        "appointment": AppointmentResponse.model_validate(appointment),
        "prescription": PrescriptionResponse.model_validate(prescription) if prescription else None,
    }


@router.post("/{appointment_id}/complete-consultation")
async def complete_consultation(
    appointment_id: str,
    data: PrescriptionCreate,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Doctor completes consultation: creates prescription and marks appointment completed."""
    if current_user.role != "doctor":
        raise HTTPException(status_code=403, detail="Only doctors can complete consultations")

    linked_doctor = await get_linked_doctor(current_user, db)
    if not linked_doctor:
        raise HTTPException(status_code=403, detail="No linked doctor profile found")

    result = await db.execute(
        select(Appointment).where(
            Appointment.id == appointment_id,
            Appointment.tenant_id == current_user.tenant_id,
        )
    )
    appointment = result.scalar_one_or_none()
    if not appointment:
        raise HTTPException(status_code=404, detail="Appointment not found")
    if appointment.doctor_id != linked_doctor.id:
        raise HTTPException(status_code=403, detail="You can only complete your own appointments")
    if appointment.status not in ("in_progress", "scheduled", "confirmed"):
        raise HTTPException(status_code=400, detail=f"Cannot complete appointment with status '{appointment.status}'")

    # Check if prescription already exists for this appointment
    existing_rx = await db.execute(
        select(Prescription).where(
            Prescription.appointment_id == appointment_id,
            Prescription.tenant_id == current_user.tenant_id,
        )
    )
    existing = existing_rx.scalar_one_or_none()

    rx_data = data.model_dump()
    rx_data["appointment_id"] = appointment_id
    rx_data["patient_id"] = appointment.patient_id
    rx_data["pet_id"] = appointment.pet_id
    rx_data["doctor_id"] = linked_doctor.id
    rx_data["tenant_id"] = current_user.tenant_id

    if existing:
        # Update existing prescription
        for key, value in rx_data.items():
            if key != "tenant_id":
                setattr(existing, key, value)
        prescription = existing
    else:
        # Create new prescription
        prescription = Prescription(**rx_data)
        db.add(prescription)

    # Mark appointment as completed
    appointment.status = "completed"

    # Create notification
    notification = Notification(
        tenant_id=current_user.tenant_id,
        type="appointment_completed",
        title="Appointment Completed",
        message=f"Consultation completed by Dr. {linked_doctor.full_name}",
        recipient_type="patient",
        recipient_id=appointment.patient_id,
        status="sent",
    )
    db.add(notification)

    await db.commit()
    await db.refresh(prescription)
    return PrescriptionResponse.model_validate(prescription)


@router.delete("/{appointment_id}")
async def delete_appointment(
    appointment_id: str,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(
        select(Appointment).where(
            Appointment.id == appointment_id,
            Appointment.tenant_id == current_user.tenant_id,
        )
    )
    appointment = result.scalar_one_or_none()
    if not appointment:
        raise HTTPException(status_code=404, detail="Appointment not found")
    await db.delete(appointment)
    await db.commit()
    return {"detail": "Appointment deleted"}
