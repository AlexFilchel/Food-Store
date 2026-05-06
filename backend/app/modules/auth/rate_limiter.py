from collections import defaultdict, deque
from dataclasses import dataclass
from datetime import datetime, timedelta
from functools import lru_cache
from typing import Deque

from app.core.config import get_settings
from app.core.time import utc_now


@dataclass(slots=True)
class RateLimitDecision:
    allowed: bool
    retry_after_seconds: int = 0


class LoginRateLimiter:
    def __init__(self, *, max_attempts: int, window_minutes: int) -> None:
        self.max_attempts = max_attempts
        self.window = timedelta(minutes=window_minutes)
        self._failures: dict[str, Deque[datetime]] = defaultdict(deque)

    def _prune(self, key: str) -> None:
        now = utc_now()
        attempts = self._failures[key]
        while attempts and now - attempts[0] >= self.window:
            attempts.popleft()
        if not attempts:
            self._failures.pop(key, None)

    def check(self, key: str) -> RateLimitDecision:
        self._prune(key)
        attempts = self._failures.get(key)
        if attempts is None or len(attempts) < self.max_attempts:
            return RateLimitDecision(allowed=True)
        retry_after = max(1, int((attempts[0] + self.window - utc_now()).total_seconds()))
        return RateLimitDecision(allowed=False, retry_after_seconds=retry_after)

    def record_failure(self, key: str) -> None:
        self._prune(key)
        self._failures[key].append(utc_now())

    def clear(self, key: str) -> None:
        self._failures.pop(key, None)


@lru_cache
def get_login_rate_limiter() -> LoginRateLimiter:
    settings = get_settings()
    return LoginRateLimiter(
        max_attempts=settings.auth_rate_limit_max_attempts,
        window_minutes=settings.auth_rate_limit_window_minutes,
    )
