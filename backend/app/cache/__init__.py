"""
App-wide cache singleton.

    from app.cache import cache

To swap to Redis:
    1. Implement RedisBackend in backend.py satisfying the CacheBackend protocol
    2. Replace InMemoryBackend() with RedisBackend(url=settings.REDIS_URL) here
    3. Nothing else changes.
"""
from app.cache.backend import InMemoryBackend
from app.cache.store import CacheStore

cache: CacheStore = CacheStore(InMemoryBackend())

__all__ = ["cache"]
