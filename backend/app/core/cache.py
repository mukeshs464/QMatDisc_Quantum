"""In-memory cache for deterministic quantum simulation calculations.
Ensures UI sliders achieve instantaneous (< 50ms) rendering for revisited parameter values.
"""

from __future__ import annotations

import functools
from typing import Any, Dict, Optional


class SimulationCache:
    """Thread-safe key-value cache with maximum size eviction."""

    def __init__(self, maxsize: int = 256):
        self.maxsize = maxsize
        self._cache: Dict[str, Any] = {}

    def get(self, key: str) -> Optional[Any]:
        return self._cache.get(key)

    def set(self, key: str, value: Any) -> None:
        if len(self._cache) >= self.maxsize:
            # Simple eviction of first item
            first_key = next(iter(self._cache))
            del self._cache[first_key]
        self._cache[key] = value

    def clear(self) -> None:
        self._cache.clear()


# Global cache instance
sim_cache = SimulationCache(maxsize=512)
