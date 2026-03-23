import logging
from fastapi import APIRouter, Depends, HTTPException
from fastapi.security import HTTPAuthorizationCredentials
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from pydantic import BaseModel
from typing import Optional
from app.database import get_db
from app.models import User, Tenant, Doctor, Staff
from app.schemas import UserResponse, TenantResponse, TenantUpdate
from app.core.auth import get_current_user, get_supabase_admin, security
from app.core.rbac import require_admin

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/api/auth", tags=["Authentication"])


class SetupClinicRequest(BaseModel):
    clinic_name: str
    clinic_type: str = "human_clinic"
    email: Optional[str] = None
    phone: Optional[str] = None
    address: Optional[str] = None
    city: Optional[str] = None
    state: Optional[str] = None
    country: Optional[str] = None
    postal_code: Optional[str] = None
    website_url: Optional[str] = None
    timezone: Optional[str] = None
    logo_url: Optional[str] = None
    description: Optional[str] = None
    theme_color: Optional[str] = "#2563EB"


@router.post("/setup-clinic")
async def setup_clinic(
    data: SetupClinicRequest,
    credentials: HTTPAuthorizationCredentials = Depends(security),
    db: AsyncSession = Depends(get_db),
):
    token = credentials.credentials
    try:
        sb = get_supabase_admin()
        auth_response = sb.auth.get_user(token)
        supabase_user = auth_response.user
        if not supabase_user:
            raise HTTPException(status_code=401, detail="Invalid token")
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Auth error: {e}")
        raise HTTPException(status_code=401, detail="Invalid or expired token")

    existing = await db.execute(select(User).where(User.id == str(supabase_user.id)))
    if existing.scalar_one_or_none():
        raise HTTPException(status_code=400, detail="Clinic already set up for this user")

    tenant = Tenant(
        name=data.clinic_name,
        type=data.clinic_type,
        email=data.email or supabase_user.email,
        phone=data.phone,
        address=data.address,
        city=data.city,
        state=data.state,
        country=data.country,
        postal_code=data.postal_code,
        website_url=data.website_url,
        timezone=data.timezone,
        logo_url=data.logo_url,
        description=data.description,
        theme_color=data.theme_color,
    )
    db.add(tenant)
    await db.flush()

    user = User(
        id=str(supabase_user.id),
        tenant_id=tenant.id,
        email=supabase_user.email,
        full_name=supabase_user.user_metadata.get("full_name", supabase_user.email.split("@")[0]),
        role="admin",
        is_admin=True,
    )
    db.add(user)
    await db.commit()
    await db.refresh(user)
    await db.refresh(tenant)

    return {
        "user": UserResponse.model_validate(user),
        "tenant": TenantResponse.model_validate(tenant),
    }


@router.get("/me", response_model=UserResponse)
async def get_me(
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    resp = UserResponse.model_validate(current_user)
    # If user record has no photo, check linked doctor/staff record
    if not resp.photo_url:
        if current_user.role == "doctor":
            result = await db.execute(
                select(Doctor).where(Doctor.user_id == current_user.id, Doctor.tenant_id == current_user.tenant_id)
            )
            doctor = result.scalar_one_or_none()
            if doctor and doctor.photo_url:
                resp.photo_url = doctor.photo_url
        elif current_user.role == "staff":
            result = await db.execute(
                select(Staff).where(Staff.user_id == current_user.id, Staff.tenant_id == current_user.tenant_id)
            )
            staff = result.scalar_one_or_none()
            if staff and staff.photo_url:
                resp.photo_url = staff.photo_url
    return resp


# ─── Tenant Routes ──────────────────────────────────
tenant_router = APIRouter(prefix="/api/tenant", tags=["Tenant"])


@tenant_router.get("/me", response_model=TenantResponse)
async def get_tenant(
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(select(Tenant).where(Tenant.id == current_user.tenant_id))
    tenant = result.scalar_one_or_none()
    if not tenant:
        raise HTTPException(status_code=404, detail="Tenant not found")
    return TenantResponse.model_validate(tenant)


@tenant_router.put("/me", response_model=TenantResponse)
async def update_tenant(
    data: TenantUpdate,
    current_user: User = Depends(require_admin),
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(select(Tenant).where(Tenant.id == current_user.tenant_id))
    tenant = result.scalar_one_or_none()
    if not tenant:
        raise HTTPException(status_code=404, detail="Tenant not found")

    for key, value in data.model_dump(exclude_unset=True).items():
        setattr(tenant, key, value)
    await db.commit()
    await db.refresh(tenant)
    return TenantResponse.model_validate(tenant)
