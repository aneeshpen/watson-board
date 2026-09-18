"""
Authentication and rate limiting.

Every endpoint used to be public and unauthenticated, including
`POST /api/pmi/train` — anyone could trigger unbounded model retraining, and
anyone could push 500 MB videos at the CCTV analyser.

Expensive/mutating routes now require `X-API-Key`. If `ADMIN_API_KEY` is unset
the dependency allows the request through (so a fresh clone still runs) but
startup logs a loud warning — the gap is never silent.
"""

from __future__ import annotations

import hmac
import logging

from fastapi import Header, HTTPException, Request, status
from slowapi import Limiter
from slowapi.util import get_remote_address

from config import settings

logger = logging.getLogger("watson_board.security")

limiter = Limiter(key_func=get_remote_address, default_limits=[settings.rate_limit_default])


async def require_admin_key(x_api_key: str | None = Header(default=None)) -> None:
    """FastAPI dependency guarding expensive or state-changing endpoints."""
    expected = settings.admin_api_key
    if not expected:
        logger.warning(
            "ADMIN_API_KEY is not set - privileged endpoint served without auth. "
            "Set ADMIN_API_KEY before deploying."
        )
        return
    if not x_api_key or not hmac.compare_digest(x_api_key, expected):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Valid X-API-Key header required for this endpoint.",
            headers={"WWW-Authenticate": "ApiKey"},
        )


def client_ip(request: Request) -> str:
    return get_remote_address(request)
