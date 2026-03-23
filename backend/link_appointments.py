"""
Links existing prescriptions and reports to their closest appointment by date.
Run AFTER seed.py and seed_pet_data.py.

Usage:
    cd backend
    python link_appointments.py
"""

import asyncio
from datetime import timedelta

from sqlalchemy.ext.asyncio import create_async_engine, AsyncSession
from sqlalchemy.orm import sessionmaker
from sqlalchemy import select, update

from app.config import settings
from app.models import Tenant, Pet, Appointment, Prescription, Report

engine = create_async_engine(
    settings.ASYNC_DATABASE_URL,
    connect_args={"statement_cache_size": 0},
)
SessionLocal = sessionmaker(engine, class_=AsyncSession, expire_on_commit=False)


async def find_closest_appointment(db, pet_id, tenant_id, target_date, doctor_id=None):
    """Find the closest PAST/COMPLETED appointment for a given pet."""
    query = select(Appointment).where(
        Appointment.pet_id == pet_id,
        Appointment.tenant_id == tenant_id,
        Appointment.status.in_(["completed", "in_progress"]),
    )
    if doctor_id:
        query = query.where(Appointment.doctor_id == doctor_id)
    result = await db.execute(query)
    appointments = result.scalars().all()

    if not appointments:
        return None

    # Find closest by date
    best = None
    best_diff = None
    for appt in appointments:
        appt_date = appt.start_time.date() if hasattr(appt.start_time, 'date') else appt.start_time
        diff = abs((appt_date - target_date).days)
        if best_diff is None or diff < best_diff:
            best = appt
            best_diff = diff
    return best


async def link_data():
    async with SessionLocal() as db:
        # Find the pet clinic
        result = await db.execute(
            select(Tenant).where(Tenant.type == "pet_clinic", Tenant.name == "PawCare Veterinary")
        )
        tenant = result.scalar_one_or_none()
        if not tenant:
            print("Pet clinic not found.")
            return

        t_id = tenant.id
        print(f"Linking data for: {tenant.name}")

        # Get all pets
        pets_result = await db.execute(select(Pet).where(Pet.tenant_id == t_id))
        pets = pets_result.scalars().all()

        # Get all appointments for this tenant
        appts_result = await db.execute(
            select(Appointment).where(Appointment.tenant_id == t_id)
        )
        all_appointments = appts_result.scalars().all()
        print(f"  Found {len(all_appointments)} total appointments")

        # Link prescriptions
        rx_result = await db.execute(
            select(Prescription).where(
                Prescription.tenant_id == t_id,
                Prescription.appointment_id == None,
            )
        )
        prescriptions = rx_result.scalars().all()
        rx_linked = 0
        for rx in prescriptions:
            target_date = rx.prescribed_date.date() if hasattr(rx.prescribed_date, 'date') else rx.prescribed_date
            appt = await find_closest_appointment(db, rx.pet_id, t_id, target_date, rx.doctor_id)
            if not appt:
                # Try without doctor filter
                appt = await find_closest_appointment(db, rx.pet_id, t_id, target_date)
            if appt:
                rx.appointment_id = appt.id
                rx_linked += 1
        print(f"  Linked {rx_linked}/{len(prescriptions)} prescriptions to appointments")

        # Link reports
        rep_result = await db.execute(
            select(Report).where(
                Report.tenant_id == t_id,
                Report.appointment_id == None,
            )
        )
        reports = rep_result.scalars().all()
        rep_linked = 0
        for rep in reports:
            target_date = rep.report_date.date() if hasattr(rep.report_date, 'date') else rep.report_date
            appt = await find_closest_appointment(db, rep.pet_id, t_id, target_date, rep.doctor_id)
            if not appt:
                appt = await find_closest_appointment(db, rep.pet_id, t_id, target_date)
            if appt:
                rep.appointment_id = appt.id
                rep_linked += 1
        print(f"  Linked {rep_linked}/{len(reports)} reports to appointments")

        await db.commit()
        print("Done! Prescriptions and reports are now linked to appointments.")


if __name__ == "__main__":
    asyncio.run(link_data())
