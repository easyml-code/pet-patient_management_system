import logging
import threading
from fastapi import Depends, HTTPException
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from supabase import create_client
from cachetools import TTLCache
from app.database import get_db
from app.models import User
from app.config import settings
from log.context import tenant_id_var, user_id_var

logger = logging.getLogger(__name__)
security = HTTPBearer()

_supabase_admin = None

# Cache resolved users to avoid Supabase HTTP call on every request.
# TTL = 15 min (Supabase tokens last 1 hour — safe to cache 1/4 of lifetime).
# maxsize = 10k covers ~10k concurrent active sessions at 1 lakh user scale.
# TTLCache is not thread-safe by default; protect with a lock.
_user_cache: TTLCache = TTLCache(maxsize=10_000, ttl=900)
_cache_lock = threading.Lock()


def get_supabase_admin():
    global _supabase_admin
    if _supabase_admin is None:
        _supabase_admin = create_client(settings.SUPABASE_URL, settings.SUPABASE_SERVICE_ROLE_KEY)
    return _supabase_admin


async def get_current_user(
    credentials: HTTPAuthorizationCredentials = Depends(security),
    db: AsyncSession = Depends(get_db),
) -> User:
    token = credentials.credentials

    # Fast path: return cached user without hitting Supabase or DB
    with _cache_lock:
        cached = _user_cache.get(token)
    if cached is not None:
        tenant_id_var.set(cached.tenant_id)
        user_id_var.set(cached.id)
        return cached

    # Slow path: verify token with Supabase
    try:
        sb = get_supabase_admin()
        auth_response = sb.auth.get_user(token)
        supabase_user = auth_response.user
        if not supabase_user:
            raise HTTPException(status_code=401, detail="Invalid token")
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Supabase auth error: {e}")
        raise HTTPException(status_code=401, detail="Invalid or expired token")

    result = await db.execute(select(User).where(User.id == supabase_user.id))
    user = result.scalar_one_or_none()
    if not user:
        raise HTTPException(status_code=403, detail="User profile not set up. Please complete clinic registration.")
    if not user.is_active:
        raise HTTPException(status_code=403, detail="Account is disabled")

    with _cache_lock:
        _user_cache[token] = user

    # Inject into log context so every downstream log line carries these
    tenant_id_var.set(user.tenant_id)
    user_id_var.set(user.id)

    return user
