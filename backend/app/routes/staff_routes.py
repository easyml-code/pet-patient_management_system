from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from typing import List
from app.database import get_db
from app.models import User, Staff
from app.schemas import StaffCreate, StaffUpdate, StaffResponse
from app.core.auth import get_current_user
from app.core.rbac import require_admin

router = APIRouter(prefix="/api/staff", tags=["Staff"])


@router.get("", response_model=List[StaffResponse])
async def list_staff(
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(
        select(Staff).where(Staff.tenant_id == current_user.tenant_id).order_by(Staff.full_name)
    )
    return [StaffResponse.model_validate(s) for s in result.scalars().all()]


@router.get("/{staff_id}", response_model=StaffResponse)
async def get_staff(
    staff_id: str,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(
        select(Staff).where(Staff.id == staff_id, Staff.tenant_id == current_user.tenant_id)
    )
    staff = result.scalar_one_or_none()
    if not staff:
        raise HTTPException(status_code=404, detail="Staff member not found")
    return StaffResponse.model_validate(staff)


@router.post("", response_model=StaffResponse, status_code=201)
async def create_staff(
    data: StaffCreate,
    current_user: User = Depends(require_admin),
    db: AsyncSession = Depends(get_db),
):
    staff = Staff(tenant_id=current_user.tenant_id, **data.model_dump())
    db.add(staff)
    await db.commit()
    await db.refresh(staff)
    return StaffResponse.model_validate(staff)


@router.put("/{staff_id}", response_model=StaffResponse)
async def update_staff(
    staff_id: str,
    data: StaffUpdate,
    current_user: User = Depends(require_admin),
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(
        select(Staff).where(Staff.id == staff_id, Staff.tenant_id == current_user.tenant_id)
    )
    staff = result.scalar_one_or_none()
    if not staff:
        raise HTTPException(status_code=404, detail="Staff member not found")

    for key, value in data.model_dump(exclude_unset=True).items():
        setattr(staff, key, value)
    await db.commit()
    await db.refresh(staff)
    return StaffResponse.model_validate(staff)


@router.delete("/{staff_id}")
async def delete_staff(
    staff_id: str,
    current_user: User = Depends(require_admin),
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(
        select(Staff).where(Staff.id == staff_id, Staff.tenant_id == current_user.tenant_id)
    )
    staff = result.scalar_one_or_none()
    if not staff:
        raise HTTPException(status_code=404, detail="Staff member not found")
    await db.delete(staff)
    await db.commit()
    return {"detail": "Staff member deleted"}
