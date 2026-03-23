import secrets
import logging
from datetime import datetime, timezone, timedelta
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from typing import List
from app.database import get_db
from app.models import User, Tenant, Doctor, Staff
from app.models.invitation import Invitation
from app.schemas.invitation import InvitationCreate, InvitationAccept, InvitationResponse, InvitationVerifyResponse
from app.core.auth import get_current_user, get_supabase_admin
from app.core.rbac import require_admin

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/api/invitations", tags=["Invitations"])


@router.get("", response_model=List[InvitationResponse])
async def list_invitations(
    current_user: User = Depends(require_admin),
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(
        select(Invitation)
        .where(Invitation.tenant_id == current_user.tenant_id)
        .order_by(Invitation.created_at.desc())
    )
    return [InvitationResponse.model_validate(i) for i in result.scalars().all()]


@router.post("", response_model=InvitationResponse, status_code=201)
async def create_invitation(
    data: InvitationCreate,
    current_user: User = Depends(require_admin),
    db: AsyncSession = Depends(get_db),
):
    # Check for existing pending invitation with same email
    existing = await db.execute(
        select(Invitation).where(
            Invitation.tenant_id == current_user.tenant_id,
            Invitation.email == data.email,
            Invitation.status == "pending",
        )
    )
    if existing.scalar_one_or_none():
        raise HTTPException(status_code=400, detail="An invitation is already pending for this email")

    token = secrets.token_urlsafe(32)
    invitation = Invitation(
        tenant_id=current_user.tenant_id,
        email=data.email,
        role=data.role,
        full_name=data.full_name,
        specialization=data.specialization,
        phone=data.phone,
        color=data.color,
        token=token,
        status="pending",
        invited_by=current_user.id,
        expires_at=datetime.now(timezone.utc) + timedelta(days=7),
    )
    db.add(invitation)

    # Also create the Doctor/Staff record immediately (without user_id)
    if data.role == "doctor":
        doctor = Doctor(
            tenant_id=current_user.tenant_id,
            full_name=data.full_name,
            specialization=data.specialization,
            email=data.email,
            phone=data.phone,
            color=data.color or "#2563EB",
        )
        db.add(doctor)
    elif data.role == "staff":
        staff = Staff(
            tenant_id=current_user.tenant_id,
            full_name=data.full_name,
            role=data.specialization or "Staff",
            email=data.email,
            phone=data.phone,
        )
        db.add(staff)

    await db.commit()
    await db.refresh(invitation)
    return InvitationResponse.model_validate(invitation)


@router.get("/{token}/verify", response_model=InvitationVerifyResponse)
async def verify_invitation(
    token: str,
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(
        select(Invitation).where(Invitation.token == token)
    )
    invitation = result.scalar_one_or_none()
    if not invitation:
        raise HTTPException(status_code=404, detail="Invalid invitation link")
    if invitation.status != "pending":
        raise HTTPException(status_code=400, detail=f"Invitation already {invitation.status}")
    if invitation.expires_at < datetime.now(timezone.utc):
        raise HTTPException(status_code=400, detail="Invitation has expired")

    # Get clinic name
    tenant_result = await db.execute(select(Tenant).where(Tenant.id == invitation.tenant_id))
    tenant = tenant_result.scalar_one()

    return InvitationVerifyResponse(
        email=invitation.email,
        full_name=invitation.full_name,
        role=invitation.role,
        clinic_name=tenant.name,
    )


@router.post("/{token}/accept")
async def accept_invitation(
    token: str,
    data: InvitationAccept,
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(
        select(Invitation).where(Invitation.token == token)
    )
    invitation = result.scalar_one_or_none()
    if not invitation:
        raise HTTPException(status_code=404, detail="Invalid invitation link")
    if invitation.status != "pending":
        raise HTTPException(status_code=400, detail=f"Invitation already {invitation.status}")
    if invitation.expires_at < datetime.now(timezone.utc):
        raise HTTPException(status_code=400, detail="Invitation has expired")

    # Create Supabase auth user
    try:
        sb = get_supabase_admin()
        auth_response = sb.auth.admin.create_user({
            "email": invitation.email,
            "password": data.password,
            "email_confirm": True,
            "user_metadata": {"full_name": invitation.full_name},
        })
        supabase_user = auth_response.user
    except Exception as e:
        logger.error(f"Supabase user creation failed: {e}")
        raise HTTPException(status_code=500, detail="Failed to create user account")

    # Create User record
    user = User(
        id=str(supabase_user.id),
        tenant_id=invitation.tenant_id,
        email=invitation.email,
        full_name=invitation.full_name,
        role=invitation.role,
    )
    db.add(user)

    # Link the Doctor/Staff record
    if invitation.role == "doctor":
        doc_result = await db.execute(
            select(Doctor).where(
                Doctor.tenant_id == invitation.tenant_id,
                Doctor.email == invitation.email,
                Doctor.user_id.is_(None),
            )
        )
        doctor = doc_result.scalar_one_or_none()
        if doctor:
            doctor.user_id = str(supabase_user.id)
    elif invitation.role == "staff":
        staff_result = await db.execute(
            select(Staff).where(
                Staff.tenant_id == invitation.tenant_id,
                Staff.email == invitation.email,
                Staff.user_id.is_(None),
            )
        )
        staff = staff_result.scalar_one_or_none()
        if staff:
            staff.user_id = str(supabase_user.id)

    # Mark invitation as accepted
    invitation.status = "accepted"
    invitation.accepted_at = datetime.now(timezone.utc)

    await db.commit()

    return {"detail": "Account created successfully. You can now sign in."}


@router.delete("/{invitation_id}")
async def revoke_invitation(
    invitation_id: str,
    current_user: User = Depends(require_admin),
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(
        select(Invitation).where(
            Invitation.id == invitation_id,
            Invitation.tenant_id == current_user.tenant_id,
        )
    )
    invitation = result.scalar_one_or_none()
    if not invitation:
        raise HTTPException(status_code=404, detail="Invitation not found")
    await db.delete(invitation)
    await db.commit()
    return {"detail": "Invitation revoked"}
