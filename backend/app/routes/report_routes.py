from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from typing import List, Optional
from app.database import get_db
from app.models import User, Report
from app.schemas import ReportCreate, ReportUpdate, ReportResponse
from app.core.auth import get_current_user

router = APIRouter(prefix="/api/reports", tags=["Reports"])


@router.get("", response_model=List[ReportResponse])
async def list_reports(
    patient_id: Optional[str] = Query(None),
    pet_id: Optional[str] = Query(None),
    report_type: Optional[str] = Query(None),
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    query = select(Report).where(Report.tenant_id == current_user.tenant_id)
    if patient_id:
        query = query.where(Report.patient_id == patient_id)
    if pet_id:
        query = query.where(Report.pet_id == pet_id)
    if report_type:
        query = query.where(Report.report_type == report_type)
    query = query.order_by(Report.report_date.desc())
    result = await db.execute(query)
    return [ReportResponse.model_validate(r) for r in result.scalars().all()]


@router.post("", response_model=ReportResponse, status_code=201)
async def create_report(
    data: ReportCreate,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    report = Report(tenant_id=current_user.tenant_id, **data.model_dump())
    db.add(report)
    await db.commit()
    await db.refresh(report)
    return ReportResponse.model_validate(report)


@router.get("/{report_id}", response_model=ReportResponse)
async def get_report(
    report_id: str,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(
        select(Report).where(Report.id == report_id, Report.tenant_id == current_user.tenant_id)
    )
    report = result.scalar_one_or_none()
    if not report:
        raise HTTPException(status_code=404, detail="Report not found")
    return ReportResponse.model_validate(report)


@router.put("/{report_id}", response_model=ReportResponse)
async def update_report(
    report_id: str,
    data: ReportUpdate,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(
        select(Report).where(Report.id == report_id, Report.tenant_id == current_user.tenant_id)
    )
    report = result.scalar_one_or_none()
    if not report:
        raise HTTPException(status_code=404, detail="Report not found")
    for key, value in data.model_dump(exclude_unset=True).items():
        setattr(report, key, value)
    await db.commit()
    await db.refresh(report)
    return ReportResponse.model_validate(report)


@router.delete("/{report_id}")
async def delete_report(
    report_id: str,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(
        select(Report).where(Report.id == report_id, Report.tenant_id == current_user.tenant_id)
    )
    report = result.scalar_one_or_none()
    if not report:
        raise HTTPException(status_code=404, detail="Report not found")
    await db.delete(report)
    await db.commit()
    return {"detail": "Report deleted"}
