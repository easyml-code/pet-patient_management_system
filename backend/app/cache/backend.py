"""
Cache backend abstraction.

Swap InMemoryBackend for RedisBackend later — CacheStore doesn't change.
"""
from __future__ import annotations

import threading
from typing import Any, Optional, Protocol

from cachetools import TTLCache


class CacheBackend(Protocol):
    """Minimal interface every backend must satisfy."""

    def get(self, key: str) -> Optional[Any]: ...
    def set(self, key: str, value: Any, ttl: int) -> None: ...
    def delete(self, key: str) -> None: ...
    def delete_prefix(self, prefix: str) -> None: ...
    def clear(self) -> None: ...


class InMemoryBackend:
    """
    Thread-safe in-memory cache backed by cachetools TTLCache.

    Per-key TTL is emulated by using a single large cache; each entry
    carries its own expiry via a nested TTLCache per-TTL-bucket.
    Simplification: one TTLCache per TTL value — most callers use 2–3 TTLs.
    """

    def __init__(self, maxsize: int = 20_000) -> None:
        self._lock = threading.Lock()
        # bucket key: ttl (int) → TTLCache(maxsize, ttl)
        self._buckets: dict[int, TTLCache] = {}
        self._maxsize = maxsize

    def _bucket(self, ttl: int) -> TTLCache:
        if ttl not in self._buckets:
            self._buckets[ttl] = TTLCache(maxsize=self._maxsize, ttl=ttl)
        return self._buckets[ttl]

    def get(self, key: str) -> Optional[Any]:
        with self._lock:
            for bucket in self._buckets.values():
                val = bucket.get(key)
                if val is not None:
                    return val
        return None

    def set(self, key: str, value: Any, ttl: int) -> None:
        with self._lock:
            self._bucket(ttl)[key] = value

    def delete(self, key: str) -> None:
        with self._lock:
            for bucket in self._buckets.values():
                bucket.pop(key, None)

    def delete_prefix(self, prefix: str) -> None:
        """Invalidate all keys that start with `prefix`."""
        with self._lock:
            for bucket in self._buckets.values():
                keys = [k for k in list(bucket.keys()) if k.startswith(prefix)]
                for k in keys:
                    bucket.pop(k, None)

    def clear(self) -> None:
        with self._lock:
            for bucket in self._buckets.values():
                bucket.clear()
