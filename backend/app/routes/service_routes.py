from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from typing import List, Optional
from app.database import get_db
from app.models import User, Service, Doctor
from app.schemas import ServiceCreate, ServiceUpdate, ServiceResponse
from app.core.auth import get_current_user
from app.core.rbac import get_linked_doctor
from app.cache import cache

router = APIRouter(prefix="/api/services", tags=["Services"])


@router.get("", response_model=List[ServiceResponse])
async def list_services(
    doctor_id: Optional[str] = Query(None),
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    tid = current_user.tenant_id
    cached = cache.get_services_list(tid)
    if cached is not None and not doctor_id:
        return cached

    query = select(Service).where(Service.tenant_id == tid, Service.is_active == True)
    if doctor_id:
        query = query.where(Service.doctor_id == doctor_id)
    query = query.order_by(Service.name)
    result = await db.execute(query)
    services = [ServiceResponse.model_validate(s) for s in result.scalars().all()]
    if not doctor_id:
        cache.set_services_list(tid, services)
    return services


@router.get("/my", response_model=List[ServiceResponse])
async def list_my_services(
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """List services owned by the current doctor."""
    linked_doctor = await get_linked_doctor(current_user, db)
    if not linked_doctor:
        raise HTTPException(status_code=403, detail="No linked doctor profile found")

    result = await db.execute(
        select(Service)
        .where(Service.tenant_id == current_user.tenant_id, Service.doctor_id == linked_doctor.id)
        .order_by(Service.name)
    )
    return [ServiceResponse.model_validate(s) for s in result.scalars().all()]


@router.post("", response_model=ServiceResponse, status_code=201)
async def create_service(
    data: ServiceCreate,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    is_admin = current_user.is_admin or current_user.role == "admin"
    is_doctor = current_user.role == "doctor"

    if not is_admin and not is_doctor:
        raise HTTPException(status_code=403, detail="Only admins and doctors can create services")

    svc_data = data.model_dump()

    # Doctors can only create services for themselves
    if is_doctor and not is_admin:
        linked_doctor = await get_linked_doctor(current_user, db)
        if not linked_doctor:
            raise HTTPException(status_code=403, detail="No linked doctor profile found")
        svc_data["doctor_id"] = linked_doctor.id

    # Admin can optionally assign to a doctor
    if is_admin and svc_data.get("doctor_id"):
        doc_result = await db.execute(
            select(Doctor).where(Doctor.id == svc_data["doctor_id"], Doctor.tenant_id == current_user.tenant_id)
        )
        if not doc_result.scalar_one_or_none():
            raise HTTPException(status_code=404, detail="Doctor not found")

    service = Service(tenant_id=current_user.tenant_id, **svc_data)
    db.add(service)
    await db.commit()
    await db.refresh(service)
    cache.invalidate_services(current_user.tenant_id)
    return ServiceResponse.model_validate(service)


@router.put("/{service_id}", response_model=ServiceResponse)
async def update_service(
    service_id: str,
    data: ServiceUpdate,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    is_admin = current_user.is_admin or current_user.role == "admin"

    result = await db.execute(
        select(Service).where(Service.id == service_id, Service.tenant_id == current_user.tenant_id)
    )
    service = result.scalar_one_or_none()
    if not service:
        raise HTTPException(status_code=404, detail="Service not found")

    # Doctors can only edit their own services
    if not is_admin:
        linked_doctor = await get_linked_doctor(current_user, db)
        if not linked_doctor or service.doctor_id != linked_doctor.id:
            raise HTTPException(status_code=403, detail="You can only edit your own services")

    for key, value in data.model_dump(exclude_unset=True).items():
        setattr(service, key, value)
    await db.commit()
    await db.refresh(service)
    cache.invalidate_services(current_user.tenant_id)
    return ServiceResponse.model_validate(service)


@router.delete("/{service_id}")
async def delete_service(
    service_id: str,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    is_admin = current_user.is_admin or current_user.role == "admin"

    result = await db.execute(
        select(Service).where(Service.id == service_id, Service.tenant_id == current_user.tenant_id)
    )
    service = result.scalar_one_or_none()
    if not service:
        raise HTTPException(status_code=404, detail="Service not found")

    # Doctors can only delete their own services
    if not is_admin:
        linked_doctor = await get_linked_doctor(current_user, db)
        if not linked_doctor or service.doctor_id != linked_doctor.id:
            raise HTTPException(status_code=403, detail="You can only delete your own services")

    await db.delete(service)
    await db.commit()
    cache.invalidate_services(current_user.tenant_id)
    return {"detail": "Service deleted"}
