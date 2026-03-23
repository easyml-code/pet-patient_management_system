from fastapi import Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from app.models import User, Doctor
from app.core.auth import get_current_user
from app.database import get_db


class RoleChecker:
    """FastAPI dependency that checks if the current user has one of the allowed roles.
    Users with is_admin=True are treated as having admin privileges regardless of their primary role.
    """

    def __init__(self, allowed_roles: list[str]):
        self.allowed_roles = allowed_roles

    async def __call__(self, user: User = Depends(get_current_user)) -> User:
        # Users with is_admin flag always pass admin-level checks
        if user.is_admin and "admin" in self.allowed_roles:
            return user
        if user.role not in self.allowed_roles:
            raise HTTPException(status_code=403, detail="Insufficient permissions")
        return user


require_admin = RoleChecker(["admin"])
require_admin_or_staff = RoleChecker(["admin", "staff"])
require_any = RoleChecker(["admin", "staff", "doctor"])


async def get_linked_doctor(user: User, db: AsyncSession) -> Doctor | None:
    """Find the Doctor record linked to a user (for users with doctor role)."""
    if user.role not in ("doctor",):
        return None
    result = await db.execute(
        select(Doctor).where(Doctor.user_id == user.id, Doctor.tenant_id == user.tenant_id)
    )
    return result.scalar_one_or_none()
