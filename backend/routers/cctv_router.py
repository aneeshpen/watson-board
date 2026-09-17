"""
Watson-Board CCTV Forensic Analysis Router
=====================================
FastAPI endpoints for uploading and analyzing CCTV footage.
"""

from fastapi import APIRouter, UploadFile, File, HTTPException, Query
from cctv_schemas import CCTVAnalysisResponse, CCTVHealthResponse, FrameAnalysis
from services.cctv_analyzer import analyze_video

import cv2
import os
import uuid
import tempfile
import logging

logger = logging.getLogger("watson_board.cctv")

router = APIRouter()

# Allowed video file extensions
ALLOWED_EXTENSIONS = {".mp4", ".avi", ".mkv", ".mov", ".wmv", ".flv", ".webm", ".m4v"}

# Maximum upload size: 500 MB
MAX_UPLOAD_SIZE = 500 * 1024 * 1024


def _get_temp_dir() -> str:
    """Get or create a temp directory for video uploads inside the backend folder."""
    temp_dir = os.path.join(os.path.dirname(__file__), "..", "temp_uploads")
    os.makedirs(temp_dir, exist_ok=True)
    return temp_dir


@router.get("/health", response_model=CCTVHealthResponse)
def cctv_health():
    """Health check for the CCTV forensic analysis module."""
    return CCTVHealthResponse(
        status="operational",
        module="cctv_forensic_analyzer",
        opencv_version=cv2.__version__,
        supported_formats=list(ALLOWED_EXTENSIONS),
    )


@router.post("/analyze", response_model=CCTVAnalysisResponse)
async def analyze_cctv(
    file: UploadFile = File(..., description="CCTV video file to analyze"),
    max_frames: int = Query(500, ge=10, le=2000, description="Max number of frames to extract"),
    interval: float = Query(1.5, ge=0.5, le=10.0, description="Base interval in seconds between frame samples"),
):
    """
    Upload a CCTV video file and receive a structured forensic frame-by-frame analysis.

    Accepts most common video formats (MP4, AVI, MKV, MOV, WMV, FLV).
    Returns a JSON array of timestamps and descriptions for each key frame.
    """
    # ── Validate file extension ──
    filename = file.filename or "unknown_video"
    ext = os.path.splitext(filename)[1].lower()
    if ext not in ALLOWED_EXTENSIONS:
        raise HTTPException(
            status_code=400,
            detail=f"Unsupported file format '{ext}'. Allowed: {', '.join(sorted(ALLOWED_EXTENSIONS))}",
        )

    # ── Save uploaded file to temp location ──
    temp_dir = _get_temp_dir()
    temp_filename = f"{uuid.uuid4().hex}{ext}"
    temp_path = os.path.join(temp_dir, temp_filename)

    try:
        # Stream-write to disk to handle large files
        total_bytes = 0
        with open(temp_path, "wb") as f:
            while True:
                chunk = await file.read(1024 * 1024)  # 1 MB chunks
                if not chunk:
                    break
                total_bytes += len(chunk)
                if total_bytes > MAX_UPLOAD_SIZE:
                    raise HTTPException(
                        status_code=413,
                        detail=f"File too large. Maximum allowed size is {MAX_UPLOAD_SIZE // (1024*1024)} MB.",
                    )
                f.write(chunk)

        logger.info(f"Uploaded {filename} ({total_bytes / (1024*1024):.1f} MB) -> {temp_path}")

        # ── Run analysis ──
        result = analyze_video(
            video_path=temp_path,
            interval_seconds=interval,
            max_frames=max_frames,
        )

        metadata = result["metadata"]
        analysis = result["analysis"]

        # ── Build response ──
        return CCTVAnalysisResponse(
            filename=filename,
            video_duration_seconds=metadata.get("duration_seconds", 0.0),
            fps=metadata.get("fps", 0.0),
            total_frames_extracted=len(analysis),
            analysis=[
                FrameAnalysis(timestamp=a["timestamp"], description=a["description"])
                for a in analysis
            ],
        )

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Analysis failed for {filename}: {e}", exc_info=True)
        raise HTTPException(
            status_code=500,
            detail=f"Video analysis failed: {str(e)}",
        )
    finally:
        # ── Cleanup temp file ──
        if os.path.exists(temp_path):
            try:
                os.remove(temp_path)
                logger.debug(f"Cleaned up temp file: {temp_path}")
            except OSError:
                pass


@router.post("/analyze/raw")
async def analyze_cctv_raw(
    file: UploadFile = File(..., description="CCTV video file to analyze"),
    max_frames: int = Query(500, ge=10, le=2000, description="Max number of frames to extract"),
    interval: float = Query(1.5, ge=0.5, le=10.0, description="Base interval in seconds between frame samples"),
):
    """
    Same as /analyze but returns ONLY the raw JSON array as specified in
    the Watson-Board forensic output format (no wrapper metadata).

    Output: [ { "timestamp": "HH:MM:SS", "description": "..." }, ... ]
    """
    # ── Validate file extension ──
    filename = file.filename or "unknown_video"
    ext = os.path.splitext(filename)[1].lower()
    if ext not in ALLOWED_EXTENSIONS:
        raise HTTPException(
            status_code=400,
            detail=f"Unsupported file format '{ext}'. Allowed: {', '.join(sorted(ALLOWED_EXTENSIONS))}",
        )

    temp_dir = _get_temp_dir()
    temp_filename = f"{uuid.uuid4().hex}{ext}"
    temp_path = os.path.join(temp_dir, temp_filename)

    try:
        total_bytes = 0
        with open(temp_path, "wb") as f:
            while True:
                chunk = await file.read(1024 * 1024)
                if not chunk:
                    break
                total_bytes += len(chunk)
                if total_bytes > MAX_UPLOAD_SIZE:
                    raise HTTPException(
                        status_code=413,
                        detail=f"File too large. Maximum allowed size is {MAX_UPLOAD_SIZE // (1024*1024)} MB.",
                    )
                f.write(chunk)

        result = analyze_video(
            video_path=temp_path,
            interval_seconds=interval,
            max_frames=max_frames,
        )

        # Return raw array only — matches the exact forensic output spec
        return result["analysis"]

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Raw analysis failed for {filename}: {e}", exc_info=True)
        raise HTTPException(
            status_code=500,
            detail=f"Video analysis failed: {str(e)}",
        )
    finally:
        if os.path.exists(temp_path):
            try:
                os.remove(temp_path)
            except OSError:
                pass
