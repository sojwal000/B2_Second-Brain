"""
In-Memory Cache Implementation
Replaces Redis for development purposes.
Uses cachetools for TTL-based caching.
"""

from typing import Any, Optional, Callable, TypeVar
from functools import wraps
import hashlib
import json
import logging
from datetime import datetime, timedelta
from cachetools import TTLCache
import threading

from app.core.config import settings

logger = logging.getLogger(__name__)

T = TypeVar('T')


class InMemoryCache:
    """
    Thread-safe in-memory cache with TTL support.
    Replacement for Redis in development.
    """
    
    def __init__(
        self,
        maxsize: int = 1000,
        ttl: int = 300  # 5 minutes default
    ):
        self.cache = TTLCache(maxsize=maxsize, ttl=ttl)
        self.lock = threading.RLock()
        self.stats = {
            "hits": 0,
            "misses": 0,
            "sets": 0,
            "deletes": 0
        }
    
    def get(self, key: str) -> Optional[Any]:
        """Get value from cache."""
        with self.lock:
            value = self.cache.get(key)
            if value is not None:
                self.stats["hits"] += 1
                logger.debug(f"Cache HIT: {key}")
            else:
                self.stats["misses"] += 1
                logger.debug(f"Cache MISS: {key}")
            return value
    
    def set(
        self,
        key: str,
        value: Any,
        ttl: Optional[int] = None
    ) -> None:
        """Set value in cache with optional custom TTL."""
        with self.lock:
            # If custom TTL, we need to handle it differently
            # For simplicity, we use the default TTL
            self.cache[key] = value
            self.stats["sets"] += 1
            logger.debug(f"Cache SET: {key}")
    
    def delete(self, key: str) -> bool:
        """Delete key from cache."""
        with self.lock:
            if key in self.cache:
                del self.cache[key]
                self.stats["deletes"] += 1
                logger.debug(f"Cache DELETE: {key}")
                return True
            return False
    
    def clear(self) -> None:
        """Clear all cache entries."""
        with self.lock:
            self.cache.clear()
            logger.info("Cache cleared")
    
    def exists(self, key: str) -> bool:
        """Check if key exists in cache."""
        with self.lock:
            return key in self.cache
    
    def get_stats(self) -> dict:
        """Get cache statistics."""
        with self.lock:
            return {
                **self.stats,
                "size": len(self.cache),
                "maxsize": self.cache.maxsize,
                "hit_rate": self.stats["hits"] / max(1, self.stats["hits"] + self.stats["misses"])
            }
    
    def keys(self, pattern: str = "*") -> list:
        """Get all keys matching pattern (simplified)."""
        with self.lock:
            if pattern == "*":
                return list(self.cache.keys())
            # Simple pattern matching for prefix:*
            if pattern.endswith("*"):
                prefix = pattern[:-1]
                return [k for k in self.cache.keys() if k.startswith(prefix)]
            return [k for k in self.cache.keys() if pattern in k]


# ============================================================================
# Cache Instances for Different Purposes
# ============================================================================

# Main application cache
app_cache = InMemoryCache(
    maxsize=settings.MAX_CACHE_SIZE,
    ttl=settings.CACHE_TTL_SECONDS
)

# Query results cache (shorter TTL)
query_cache = InMemoryCache(maxsize=500, ttl=60)

# Embedding cache (longer TTL)
embedding_cache = InMemoryCache(maxsize=2000, ttl=3600)

# User session cache
session_cache = InMemoryCache(maxsize=1000, ttl=1800)


# ============================================================================
# Cache Decorators
# ============================================================================

def generate_cache_key(*args, **kwargs) -> str:
    """Generate a cache key from function arguments."""
    key_parts = [str(arg) for arg in args]
    key_parts.extend(f"{k}={v}" for k, v in sorted(kwargs.items()))
    key_string = ":".join(key_parts)
    return hashlib.md5(key_string.encode()).hexdigest()


def cached(
    cache_instance: InMemoryCache = app_cache,
    prefix: str = "",
    ttl: Optional[int] = None
):
    """
    Decorator to cache function results.
    
    Usage:
        @cached(prefix="user")
        async def get_user(user_id: int):
            ...
    """
    def decorator(func: Callable[..., T]) -> Callable[..., T]:
        @wraps(func)
        async def async_wrapper(*args, **kwargs) -> T:
            # Generate cache key
            key = f"{prefix}:{func.__name__}:{generate_cache_key(*args, **kwargs)}"
            
            # Try to get from cache
            cached_value = cache_instance.get(key)
            if cached_value is not None:
                return cached_value
            
            # Execute function
            result = await func(*args, **kwargs)
            
            # Store in cache
            cache_instance.set(key, result, ttl)
            
            return result
        
        @wraps(func)
        def sync_wrapper(*args, **kwargs) -> T:
            # Generate cache key
            key = f"{prefix}:{func.__name__}:{generate_cache_key(*args, **kwargs)}"
            
            # Try to get from cache
            cached_value = cache_instance.get(key)
            if cached_value is not None:
                return cached_value
            
            # Execute function
            result = func(*args, **kwargs)
            
            # Store in cache
            cache_instance.set(key, result, ttl)
            
            return result
        
        # Return appropriate wrapper based on function type
        import asyncio
        if asyncio.iscoroutinefunction(func):
            return async_wrapper
        return sync_wrapper
    
    return decorator


def invalidate_cache(
    cache_instance: InMemoryCache = app_cache,
    pattern: str = "*"
) -> int:
    """
    Invalidate cache entries matching pattern.
    Returns number of deleted entries.
    """
    keys = cache_instance.keys(pattern)
    count = 0
    for key in keys:
        if cache_instance.delete(key):
            count += 1
    logger.info(f"Invalidated {count} cache entries matching '{pattern}'")
    return count
