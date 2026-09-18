"""
Watson-Board CCTV Forensic Analysis Router
==========================================
Endpoints for uploading and analysing CCTV footage.

Two structural fixes over the original:
  * `/analyze` and `/analyze/raw` were ~90% duplicated; the upload-validate-
    analyse-cleanup pipeline now lives in one helper.
  * Both handlers were `async def` yet called the synchronous OpenCV pipeline
    directly, blocking the event loop for the entire analysis (up to 500 MB /
    2000 frames) and freezing every other request. The CPU-bound work is now
    dispatched to a worker thread.
"""

from __future__ import annotations

import logging
import os
import uuid
from typing import Any

import anyio
import cv2
from fastapi import APIRouter, Depends, File, HTTPException, Query, Request, UploadFile, status

from cctv_schemas import CCTVAnalysisResponse, CCTVHealthResponse, FrameAnalysis
from config import settings
from security import limiter, require_admin_key
from services.cctv_analyzer import analyze_video

logger = logging.getLogger("watson_board.cctv")

router = APIRouter()

ALLOWED_EXTENSIONS = {".mp4", ".avi", ".mkv", ".mov", ".wmv", ".flv", ".webm", ".m4v"}


def _temp_dir() -> str:
    os.makedirs(settings.temp_upload_dir, exist_ok=True)
    return settings.temp_upload_dir


@router.get("/health", response_model=CCTVHealthResponse)
def cctv_health():
    """Health check for the CCTV forensic analysis module."""
    return CCTVHealthResponse(
        status="operational",
        module="cctv_forensic_analyzer",
        opencv_version=cv2.__version__,
        supported_formats=sorted(ALLOWED_EXTENSIONS),
    )


async def _receive_and_analyze(
    file: UploadFile, max_frames: int, interval: float
) -> dict[str, Any]:
    """Validate, stream to disk, analyse off the event loop, then clean up."""
    filename = file.filename or "unknown_video"
    ext = os.path.splitext(filename)[1].lower()
    if ext not in ALLOWED_EXTENSIONS:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Unsupported file format '{ext}'. Allowed: {', '.join(sorted(ALLOWED_EXTENSIONS))}",
        )

    temp_path = os.path.join(_temp_dir(), f"{uuid.uuid4().hex}{ext}")
    try:
        total_bytes = 0
        with open(temp_path, "wb") as fh:
            while chunk := await file.read(1024 * 1024):
                total_bytes += len(chunk)
                if total_bytes > settings.max_upload_bytes:
                    raise HTTPException(
                        status_code=status.HTTP_413_REQUEST_ENTITY_TOO_LARGE,
                        detail=f"File too large. Maximum allowed size is {settings.max_upload_mb} MB.",
                    )
                fh.write(chunk)

        logger.info("Uploaded %s (%.1f MB)", filename, total_bytes / (1024 * 1024))

        # OpenCV work is synchronous and CPU-heavy: run it in a worker thread so
        # concurrent requests are still served.
        result = await anyio.to_thread.run_sync(
            lambda: analyze_video(
                video_path=temp_path, interval_seconds=interval, max_frames=max_frames
            )
        )
        result["filename"] = filename
        return result

    except HTTPException:
        raise
    except Exception:
        logger.error("Analysis failed for %s", filename, exc_info=True)
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail="Video analysis failed. The file may be corrupt or use an unsupported codec.",
        ) from None
    finally:
        if os.path.exists(temp_path):
            try:
                os.remove(temp_path)
            except OSError:
                logger.debug("Could not remove temp file %s", temp_path)


@router.post(
    "/analyze",
    response_model=CCTVAnalysisResponse,
    dependencies=[Depends(require_admin_key)],
)
@limiter.limit(settings.rate_limit_expensive)
async def analyze_cctv(
    request: Request,
    file: UploadFile = File(..., description="CCTV video file to analyze"),
    max_frames: int = Query(500, ge=10, le=2000),
    interval: float = Query(1.5, ge=0.5, le=10.0),
):
    """Upload CCTV footage and receive a structured frame-by-frame analysis."""
    result = await _receive_and_analyze(file, max_frames, interval)
    metadata = result["metadata"]
    analysis = result["analysis"]
    return CCTVAnalysisResponse(
        filename=result["filename"],
        video_duration_seconds=metadata.get("duration_seconds", 0.0),
        fps=metadata.get("fps", 0.0),
        total_frames_extracted=len(analysis),
        analysis=[
            FrameAnalysis(timestamp=a["timestamp"], description=a["description"])
            for a in analysis
        ],
    )


@router.post("/analyze/raw", dependencies=[Depends(require_admin_key)])
@limiter.limit(settings.rate_limit_expensive)
async def analyze_cctv_raw(
    request: Request,
    file: UploadFile = File(..., description="CCTV video file to analyze"),
    max_frames: int = Query(500, ge=10, le=2000),
    interval: float = Query(1.5, ge=0.5, le=10.0),
):
    """
    Same as `/analyze` but returns only the bare timestamp/description array.

    Output: `[{ "timestamp": "HH:MM:SS", "description": "..." }, ...]`
    """
    result = await _receive_and_analyze(file, max_frames, interval)
    return result["analysis"]
