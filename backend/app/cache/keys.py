"""
Centralised cache key builders.

All keys are namespaced by tenant_id so multi-tenant isolation is guaranteed.
When Redis is added, these same keys work as Redis key strings.
"""


def doctors_list(tenant_id: str) -> str:
    return f"t:{tenant_id}:doctors:list"


def doctor_item(tenant_id: str, doctor_id: str) -> str:
    return f"t:{tenant_id}:doctors:{doctor_id}"


def doctors_prefix(tenant_id: str) -> str:
    """Prefix for bulk invalidation of all doctor keys for a tenant."""
    return f"t:{tenant_id}:doctors:"


def services_list(tenant_id: str) -> str:
    return f"t:{tenant_id}:services:list"


def services_prefix(tenant_id: str) -> str:
    return f"t:{tenant_id}:services:"


def availability_list(tenant_id: str, doctor_id: str | None = None) -> str:
    suffix = doctor_id or "all"
    return f"t:{tenant_id}:availability:{suffix}"


def availability_prefix(tenant_id: str) -> str:
    return f"t:{tenant_id}:availability:"


def analytics_dashboard(tenant_id: str) -> str:
    return f"t:{tenant_id}:analytics:dashboard"
