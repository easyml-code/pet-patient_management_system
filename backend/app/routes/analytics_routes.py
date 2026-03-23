from fastapi import APIRouter, Depends, Query
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func, and_, case
from typing import Optional
from datetime import datetime, timezone, date, timedelta
from app.database import get_db
from app.models import User, Appointment, Patient, Doctor, Staff
from app.schemas import AnalyticsOverview
from app.core.auth import get_current_user
from app.core.rbac import get_linked_doctor

router = APIRouter(prefix="/api/analytics", tags=["Analytics"])


@router.get("/overview", response_model=AnalyticsOverview)
async def get_overview(
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    tid = current_user.tenant_id
    today = date.today()
    start = datetime(today.year, today.month, today.day, 0, 0, 0, tzinfo=timezone.utc)
    end = datetime(today.year, today.month, today.day, 23, 59, 59, tzinfo=timezone.utc)

    # Doctor role: scope appointment stats to own appointments only
    linked_doc_id = None
    if current_user.role == "doctor":
        linked_doctor = await get_linked_doctor(current_user, db)
        if linked_doctor:
            linked_doc_id = linked_doctor.id
        else:
            return AnalyticsOverview(
                total_appointments=0, total_patients=0, total_doctors=0,
                total_staff=0, today_appointments=0, completed_today=0,
                no_shows_today=0, cancelled_today=0,
            )

    # Total appointments (scoped for doctors)
    appt_q = select(func.count()).select_from(Appointment).where(Appointment.tenant_id == tid)
    if linked_doc_id:
        appt_q = appt_q.where(Appointment.doctor_id == linked_doc_id)
    total_appts = (await db.execute(appt_q)).scalar() or 0

    total_patients = (await db.execute(
        select(func.count()).select_from(Patient).where(Patient.tenant_id == tid)
    )).scalar() or 0

    total_doctors = (await db.execute(
        select(func.count()).select_from(Doctor).where(Doctor.tenant_id == tid)
    )).scalar() or 0

    total_staff = (await db.execute(
        select(func.count()).select_from(Staff).where(Staff.tenant_id == tid)
    )).scalar() or 0

    # Today's stats (scoped for doctors)
    today_q = select(func.count()).select_from(Appointment).where(
        Appointment.tenant_id == tid,
        Appointment.start_time >= start,
        Appointment.start_time <= end,
    )
    if linked_doc_id:
        today_q = today_q.where(Appointment.doctor_id == linked_doc_id)

    today_appts = (await db.execute(today_q)).scalar() or 0

    completed_q = today_q.where(Appointment.status == 'completed')
    completed = (await db.execute(completed_q)).scalar() or 0

    noshows_q = today_q.where(Appointment.status == 'no_show')
    no_shows = (await db.execute(noshows_q)).scalar() or 0

    cancelled_q = today_q.where(Appointment.status == 'cancelled')
    cancelled = (await db.execute(cancelled_q)).scalar() or 0

    return AnalyticsOverview(
        total_appointments=total_appts,
        total_patients=total_patients,
        total_doctors=total_doctors,
        total_staff=total_staff,
        today_appointments=today_appts,
        completed_today=completed,
        no_shows_today=no_shows,
        cancelled_today=cancelled,
    )


@router.get("/appointments-trend")
async def get_appointment_trends(
    days: int = Query(default=30, ge=1, le=365),
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    tid = current_user.tenant_id
    start_date = date.today() - timedelta(days=days)

    result = await db.execute(
        select(
            func.date(Appointment.start_time).label('date'),
            func.count().label('total'),
            func.sum(case((Appointment.status == 'completed', 1), else_=0)).label('completed'),
            func.sum(case((Appointment.status == 'cancelled', 1), else_=0)).label('cancelled'),
            func.sum(case((Appointment.status == 'no_show', 1), else_=0)).label('no_show'),
        )
        .where(Appointment.tenant_id == tid, func.date(Appointment.start_time) >= start_date)
        .group_by(func.date(Appointment.start_time))
        .order_by(func.date(Appointment.start_time))
    )

    return [
        {
            "date": str(row.date),
            "count": row.total,
            "completed": row.completed or 0,
            "cancelled": row.cancelled or 0,
            "no_show": row.no_show or 0,
        }
        for row in result.all()
    ]


@router.get("/doctor-utilization")
async def get_doctor_utilization(
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    tid = current_user.tenant_id
    last_30 = date.today() - timedelta(days=30)

    result = await db.execute(
        select(
            Doctor.id,
            Doctor.full_name,
            Doctor.color,
            func.count(Appointment.id).label('total_appointments'),
            func.sum(case((Appointment.status == 'completed', 1), else_=0)).label('completed'),
            func.sum(case((Appointment.status == 'no_show', 1), else_=0)).label('no_shows'),
        )
        .outerjoin(Appointment, and_(
            Doctor.id == Appointment.doctor_id,
            func.date(Appointment.start_time) >= last_30,
        ))
        .where(Doctor.tenant_id == tid, Doctor.is_active == True)
        .group_by(Doctor.id, Doctor.full_name, Doctor.color)
        .order_by(Doctor.full_name)
    )

    return [
        {
            "doctor_id": row.id,
            "doctor_name": row.full_name,
            "color": row.color,
            "total_appointments": row.total_appointments or 0,
            "completed": row.completed or 0,
            "no_shows": row.no_shows or 0,
        }
        for row in result.all()
    ]
