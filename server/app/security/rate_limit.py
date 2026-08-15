import time
from collections import defaultdict, deque

from fastapi import Depends, HTTPException

from app.core.dependencies import get_current_user

# simple hits sliding window rate limit technique, for each user per whateveer applicable endpoint
# so heavy use of one endpoint doesn't eat another endpoint budget.
# look into replacing with a redis cache based rate limit system as this dict based
# one resets on redeploys and is per instance of backend.

RATE_LIMIT_MAX_REQUESTS = 20
RATE_LIMIT_WINDOW_SECONDS = 60


_hits: dict[str, deque] = defaultdict(deque)


def _check(key: str) -> None:
    now = time.monotonic()
    window_start = now - RATE_LIMIT_WINDOW_SECONDS
    q = _hits[key]
    while q and q[0] < window_start:
        q.popleft()
    if len(q) >= RATE_LIMIT_MAX_REQUESTS:
        retry_after = int(q[0] + RATE_LIMIT_WINDOW_SECONDS - now) + 1
        raise HTTPException(
            status_code=429,
            detail="Too many requests. Please slow down.",
            headers={"Retry-After": str(max(retry_after, 1))},
        )
    q.append(now)


def rate_limit(scope: str = "default"):
    def dependency(user_id: str = Depends(get_current_user)) -> str:
        _check(f"{user_id}:{scope}")
        return user_id
    return dependency