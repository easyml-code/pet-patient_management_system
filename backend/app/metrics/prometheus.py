"""
Prometheus metrics for Zap AI backend.

Exposes /metrics endpoint with:
  - HTTP request count, duration, in-flight (via instrumentator)
  - Active tenants gauge (custom)
  - Appointment bookings counter (custom)
"""
from prometheus_client import Counter, Gauge
from prometheus_fastapi_instrumentator import Instrumentator

# Custom business metrics
active_tenants = Gauge(
    "zap_active_tenants",
    "Number of distinct tenants with at least one active user session",
)

appointments_created = Counter(
    "zap_appointments_created_total",
    "Total appointment bookings",
    labelnames=["tenant_id"],
)

auth_cache_hits = Counter(
    "zap_auth_cache_hits_total",
    "Token cache hits — Supabase round-trips avoided",
)

auth_cache_misses = Counter(
    "zap_auth_cache_misses_total",
    "Token cache misses — full Supabase verification performed",
)

_instrumentator = Instrumentator(
    should_group_status_codes=True,
    should_ignore_untemplated=True,
    should_respect_env_var=False,
    excluded_handlers=["/metrics", "/api/health"],
    body_handlers=[],
    inprogress_labels=False,
)


def setup_metrics(app) -> None:
    """Call once after `app` is created; registers /metrics endpoint."""
    _instrumentator.instrument(app).expose(app, endpoint="/metrics", include_in_schema=False)
