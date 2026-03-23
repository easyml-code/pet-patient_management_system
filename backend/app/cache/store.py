"""
CacheStore — typed domain methods on top of a CacheBackend.

Usage:
    from app.cache import cache

    # read
    doctors = cache.get_doctors_list(tenant_id)

    # write
    cache.set_doctors_list(tenant_id, doctors)

    # invalidate (on POST / PUT / DELETE)
    cache.invalidate_doctors(tenant_id)

Swapping to Redis later: replace `backend` with a RedisBackend instance in
__init__.py — this file is unchanged.
"""
from __future__ import annotations

from typing import Any, Optional

from app.cache import keys as k
from app.cache.backend import InMemoryBackend

# TTL constants (seconds).
#
# These are safety-net TTLs only. Because every write route calls
# cache.invalidate_*(), the cache is busted immediately on any UI change.
# Long TTLs are therefore safe — they only fire if a record is modified
# directly in the DB (bypassing the API), or on a new pod startup.
#
# At 1 lakh users across ~10k tenants:
#   - Short TTLs = high DB churn on cache miss bursts (thundering herd)
#   - Long TTLs + write invalidation = near-zero DB load for reads
_TTL_DOCTORS = 1800      # 30 min — low churn, always invalidated on write
_TTL_SERVICES = 3600     # 60 min — very low churn (price/service rarely changes)
_TTL_AVAILABILITY = 1800 # 30 min — weekly schedule template, always invalidated on write
_TTL_ANALYTICS = 300     # 5 min  — aggregate, acceptable staleness, no write hook


class CacheStore:
    def __init__(self, backend: InMemoryBackend) -> None:
        self._b = backend

    # ------------------------------------------------------------------
    # Doctors
    # ------------------------------------------------------------------

    def get_doctors_list(self, tenant_id: str) -> Optional[Any]:
        return self._b.get(k.doctors_list(tenant_id))

    def set_doctors_list(self, tenant_id: str, value: Any) -> None:
        self._b.set(k.doctors_list(tenant_id), value, _TTL_DOCTORS)

    def get_doctor(self, tenant_id: str, doctor_id: str) -> Optional[Any]:
        return self._b.get(k.doctor_item(tenant_id, doctor_id))

    def set_doctor(self, tenant_id: str, doctor_id: str, value: Any) -> None:
        self._b.set(k.doctor_item(tenant_id, doctor_id), value, _TTL_DOCTORS)

    def invalidate_doctors(self, tenant_id: str) -> None:
        """Bust all doctor keys for this tenant (list + individual items)."""
        self._b.delete_prefix(k.doctors_prefix(tenant_id))

    # ------------------------------------------------------------------
    # Services
    # ------------------------------------------------------------------

    def get_services_list(self, tenant_id: str) -> Optional[Any]:
        return self._b.get(k.services_list(tenant_id))

    def set_services_list(self, tenant_id: str, value: Any) -> None:
        self._b.set(k.services_list(tenant_id), value, _TTL_SERVICES)

    def invalidate_services(self, tenant_id: str) -> None:
        self._b.delete_prefix(k.services_prefix(tenant_id))

    # ------------------------------------------------------------------
    # Availability
    # ------------------------------------------------------------------

    def get_availability(self, tenant_id: str, doctor_id: str | None = None) -> Optional[Any]:
        return self._b.get(k.availability_list(tenant_id, doctor_id))

    def set_availability(self, tenant_id: str, value: Any, doctor_id: str | None = None) -> None:
        self._b.set(k.availability_list(tenant_id, doctor_id), value, _TTL_AVAILABILITY)

    def invalidate_availability(self, tenant_id: str) -> None:
        self._b.delete_prefix(k.availability_prefix(tenant_id))

    # ------------------------------------------------------------------
    # Analytics
    # ------------------------------------------------------------------

    def get_analytics_dashboard(self, tenant_id: str) -> Optional[Any]:
        return self._b.get(k.analytics_dashboard(tenant_id))

    def set_analytics_dashboard(self, tenant_id: str, value: Any) -> None:
        self._b.set(k.analytics_dashboard(tenant_id), value, _TTL_ANALYTICS)

    def invalidate_analytics(self, tenant_id: str) -> None:
        self._b.delete(k.analytics_dashboard(tenant_id))

    # ------------------------------------------------------------------
    # Utility
    # ------------------------------------------------------------------

    def flush_tenant(self, tenant_id: str) -> None:
        """Nuke all cached data for a tenant (e.g. on tenant deactivation)."""
        self._b.delete_prefix(f"t:{tenant_id}:")

    def clear_all(self) -> None:
        self._b.clear()
