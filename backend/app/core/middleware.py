"""
Pure ASGI request context middleware.

Why NOT BaseHTTPMiddleware:
  Starlette's BaseHTTPMiddleware uses anyio task groups internally,
  which creates a child context for the handler. ContextVar mutations
  inside the handler (e.g. tenant_id set by auth) never propagate back
  to the middleware. Pure ASGI middleware shares one context, so
  contextvars work correctly end-to-end.
"""
import time
import uuid
import logging
from starlette.types import ASGIApp, Receive, Scope, Send

from log.context import request_id_var, tenant_id_var, user_id_var

logger = logging.getLogger(__name__)


class RequestContextMiddleware:
    def __init__(self, app: ASGIApp) -> None:
        self.app = app

    async def __call__(self, scope: Scope, receive: Receive, send: Send) -> None:
        if scope["type"] not in ("http", "websocket"):
            await self.app(scope, receive, send)
            return

        # Set fresh context for this request
        request_id_var.set(uuid.uuid4().hex[:12])
        tenant_id_var.set("-")
        user_id_var.set("-")

        method = scope.get("method", "WS")
        path = scope.get("path", "")
        start = time.perf_counter()
        logger.info(f"→ {method} {path}")

        status_code = 0

        async def send_wrapper(message: dict) -> None:
            nonlocal status_code
            if message["type"] == "http.response.start":
                status_code = message["status"]
            await send(message)

        await self.app(scope, receive, send_wrapper)

        # Auth has run by now — tenant_id/user_id are set in the same context
        duration_ms = (time.perf_counter() - start) * 1000
        logger.info(
            f"← {method} {path} status={status_code} [{duration_ms:.1f}ms]"
        )
