from pydantic import BaseModel, Field
from typing import List, Optional


class FrameAnalysis(BaseModel):
    """A single analyzed frame from CCTV footage."""
    timestamp: str = Field(
        ...,
        description="Exact time from start of video in HH:MM:SS format",
        examples=["00:01:45"],
    )
    description: str = Field(
        ...,
        description="Short, objective, investigation-focused description (max 20 words)",
        examples=["Single male in black hoodie walking from left to right across the frame"],
    )


class CCTVAnalysisResponse(BaseModel):
    """Full analysis result for an uploaded CCTV video."""
    filename: str = Field(..., description="Original uploaded filename")
    video_duration_seconds: float = Field(..., description="Total video duration in seconds")
    fps: float = Field(..., description="Frames per second of the source video")
    total_frames_extracted: int = Field(..., description="Number of key frames analyzed")
    analysis: List[FrameAnalysis] = Field(
        ..., description="Frame-by-frame forensic analysis"
    )


class CCTVHealthResponse(BaseModel):
    """Health check response for the CCTV module."""
    status: str = "operational"
    module: str = "cctv_forensic_analyzer"
    opencv_version: Optional[str] = None
    supported_formats: List[str] = [".mp4", ".avi", ".mkv", ".mov", ".wmv", ".flv"]
