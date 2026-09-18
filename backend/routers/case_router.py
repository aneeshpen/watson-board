"""Case management, autopsy lookup, timeline/movement and evidence search."""

from __future__ import annotations

import logging

from fastapi import APIRouter, HTTPException, Query, status

from config import settings
from services.autopsy_service import autopsy_service
from services.chroma_db import query_evidence
from services.data_generator import case_exists, generate_movement, generate_timeline

logger = logging.getLogger("watson_board.cases")

router = APIRouter()


@router.get("/stats")
def get_stats():
    """
    Aggregate dashboard statistics.

    `total_autopsies` is a real count. The remaining counters are demo fixtures
    for the seeded case file and are flagged as such via `fixture_counters` so
    the UI can label them instead of presenting them as live figures — the
    dashboard previously rendered them indistinguishably from real data.
    """
    return {
        "total_autopsies": autopsy_service.count(),
        "dataset_available": autopsy_service.available,
        "active_cases": 12,
        "high_risk": 4,
        "ai_flagged": 7,
        "contradictions": 3,
        "missing_evidence": 9,
        "fixture_counters": [
            "active_cases",
            "high_risk",
            "ai_flagged",
            "contradictions",
            "missing_evidence",
        ],
        "backend_online": True,
    }


@router.get("/autopsies")
def get_autopsies(
    limit: int = Query(50, ge=1, le=settings.max_page_size),
    skip: int = Query(0, ge=0),
):
    """Paginated slice of the autopsy dataset."""
    data = autopsy_service.get_all_autopsies(limit, skip)
    return {
        "data": data,
        "count": len(data),
        "total": autopsy_service.count(),
        "limit": limit,
        "skip": skip,
    }


@router.get("/autopsy/{cpr_number}")
def get_autopsy(cpr_number: str):
    """Single autopsy record by CPR number."""
    record = autopsy_service.get_autopsy_by_cpr(cpr_number)
    if not record:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Autopsy not found")
    return record


@router.get("/cases/{case_id}/timeline")
def get_case_timeline(case_id: str):
    """Reconstructed event timeline for a known case."""
    timeline = generate_timeline(case_id)
    if timeline is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"No timeline data for case '{case_id}'.",
        )
    return {"case_id": case_id, "timeline": timeline}


@router.get("/cases/{case_id}/movement")
def get_case_movement(case_id: str):
    """Geospatial movement anchors for a known case."""
    movement = generate_movement(case_id)
    if movement is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"No movement data for case '{case_id}'.",
        )
    return {"case_id": case_id, "movement": movement}


@router.get("/cases/{case_id}")
def get_case(case_id: str):
    """Existence check plus the data available for a case."""
    if not case_exists(case_id):
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND, detail=f"Unknown case '{case_id}'."
        )
    return {"case_id": case_id.strip().upper(), "has_timeline": True, "has_movement": True}


@router.get("/search")
def search_evidence(
    query: str = Query(..., min_length=1, max_length=500),
    n_results: int = Query(5, ge=1, le=settings.max_search_results),
):
    """Semantic search across the case evidence corpus."""
    try:
        return {"query": query, "results": query_evidence(query, n_results)}
    except Exception:
        # Log internally; never return the raw exception text — it leaked
        # absolute filesystem paths to the client.
        logger.error("Evidence search failed for query %r", query, exc_info=True)
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="Evidence search is temporarily unavailable.",
        ) from None
