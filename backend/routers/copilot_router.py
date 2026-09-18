"""Retrieval-augmented Copilot endpoints."""

from __future__ import annotations

import logging

from fastapi import APIRouter, HTTPException, Query, Request, status
from fastapi.responses import StreamingResponse
from pydantic import BaseModel, Field

from config import settings
from security import limiter
from services import copilot

logger = logging.getLogger("watson_board.copilot")

router = APIRouter()


class CopilotQuery(BaseModel):
    question: str = Field(..., min_length=1, max_length=2000)
    n_results: int | None = Field(default=None, ge=1, le=settings.max_search_results)


@router.get("/status")
def copilot_status():
    """Whether generated answers are available, or only retrieval."""
    return {
        "mode": "rag" if settings.copilot_enabled else "retrieval_only",
        "generation_enabled": settings.copilot_enabled,
        "model": settings.copilot_model if settings.copilot_enabled else None,
        "retrieval_k": settings.copilot_retrieval_k,
    }


@router.get("/stream")
@limiter.limit(settings.rate_limit_expensive)
async def copilot_stream(
    request: Request,
    question: str = Query(..., min_length=1, max_length=2000),
    n_results: int | None = Query(default=None, ge=1, le=settings.max_search_results),
):
    """
    Stream a grounded answer as Server-Sent Events.

    Emits a `sources` event first (so the UI can show what the answer is based
    on), then `delta` events as the answer is generated, then `done`.
    """
    return StreamingResponse(
        copilot.stream_answer(question, n_results),
        media_type="text/event-stream",
        headers={
            "Cache-Control": "no-cache",
            "Connection": "keep-alive",
            "X-Accel-Buffering": "no",
        },
    )


@router.post("/ask")
@limiter.limit(settings.rate_limit_expensive)
async def copilot_ask(request: Request, payload: CopilotQuery):
    """Non-streaming grounded answer with citations."""
    try:
        return await copilot.answer(payload.question, payload.n_results)
    except Exception:
        logger.error("Copilot request failed", exc_info=True)
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="Copilot is temporarily unavailable.",
        ) from None
