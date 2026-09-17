"""
Watson-Board CCTV Forensic Video Analyzer
===================================
Extracts key frames from CCTV footage using motion detection, scene-change
detection, and time-interval sampling, then generates forensic descriptions
for each extracted frame using OpenCV computer-vision heuristics.
"""

import cv2
import numpy as np
from typing import List, Dict, Tuple, Optional
from dataclasses import dataclass, field
import logging

logger = logging.getLogger("watson_board.cctv")


# ─── Data Structures ─────────────────────────────────────────────────────────

@dataclass
class ExtractedFrame:
    """A single key frame extracted from video."""
    frame_index: int
    timestamp_seconds: float
    frame: np.ndarray
    extraction_reason: str  # "interval" | "motion" | "scene_change" | "first" | "last"


@dataclass
class DetectedObject:
    """An object detected in a frame."""
    label: str           # "person", "vehicle", "object"
    bbox: Tuple[int, int, int, int]  # x, y, w, h
    confidence: float
    attributes: Dict = field(default_factory=dict)


@dataclass
class FrameDescription:
    """Forensic description for a single frame."""
    timestamp: str       # HH:MM:SS
    description: str     # max 20 words


# ─── Frame Extractor ─────────────────────────────────────────────────────────

class FrameExtractor:
    """
    Extracts key frames from video using three strategies:
    1. Time-based interval sampling (~1.5s)
    2. Motion detection via frame differencing
    3. Scene change detection via histogram comparison
    """

    def __init__(
        self,
        interval_seconds: float = 1.5,
        motion_threshold: float = 25.0,
        motion_pixel_ratio: float = 0.02,
        scene_change_threshold: float = 0.6,
        max_frames: int = 500,
    ):
        self.interval_seconds = interval_seconds
        self.motion_threshold = motion_threshold
        self.motion_pixel_ratio = motion_pixel_ratio
        self.scene_change_threshold = scene_change_threshold
        self.max_frames = max_frames

    def extract(self, video_path: str) -> Tuple[List[ExtractedFrame], dict]:
        """
        Extract key frames from the video file.

        Returns:
            Tuple of (list of ExtractedFrame, video_metadata dict)
        """
        cap = cv2.VideoCapture(video_path)
        if not cap.isOpened():
            raise ValueError(f"Cannot open video file: {video_path}")

        fps = cap.get(cv2.CAP_PROP_FPS) or 30.0
        total_frames = int(cap.get(cv2.CAP_PROP_FRAME_COUNT))
        duration = total_frames / fps if fps > 0 else 0

        metadata = {
            "fps": round(fps, 2),
            "total_frames": total_frames,
            "duration_seconds": round(duration, 2),
            "width": int(cap.get(cv2.CAP_PROP_FRAME_WIDTH)),
            "height": int(cap.get(cv2.CAP_PROP_FRAME_HEIGHT)),
        }

        logger.info(
            f"Video opened: {metadata['width']}x{metadata['height']}, "
            f"{fps:.1f} FPS, {total_frames} frames, {duration:.1f}s duration"
        )

        interval_frames = max(1, int(fps * self.interval_seconds))
        extracted: List[ExtractedFrame] = []
        prev_gray: Optional[np.ndarray] = None
        prev_hist: Optional[np.ndarray] = None
        frame_idx = 0
        last_extracted_idx = -interval_frames  # ensure first frame is always taken

        while True:
            ret, frame = cap.read()
            if not ret:
                break

            timestamp = frame_idx / fps if fps > 0 else 0.0
            gray = cv2.cvtColor(frame, cv2.COLOR_BGR2GRAY)
            gray_small = cv2.resize(gray, (320, 240))
            hist = cv2.calcHist([gray_small], [0], None, [64], [0, 256])
            cv2.normalize(hist, hist)

            should_extract = False
            reason = ""

            # ── Strategy 1: First frame ──
            if frame_idx == 0:
                should_extract = True
                reason = "first"

            # ── Strategy 2: Time-interval sampling ──
            elif (frame_idx - last_extracted_idx) >= interval_frames:
                should_extract = True
                reason = "interval"

            # ── Strategy 3: Motion detection ──
            if not should_extract and prev_gray is not None:
                diff = cv2.absdiff(prev_gray, gray_small)
                _, thresh = cv2.threshold(diff, int(self.motion_threshold), 255, cv2.THRESH_BINARY)
                motion_ratio = np.count_nonzero(thresh) / thresh.size
                if motion_ratio > self.motion_pixel_ratio:
                    # Only extract if enough distance from last extraction
                    if (frame_idx - last_extracted_idx) >= max(1, interval_frames // 3):
                        should_extract = True
                        reason = "motion"

            # ── Strategy 4: Scene change detection ──
            if not should_extract and prev_hist is not None:
                correlation = cv2.compareHist(prev_hist, hist, cv2.HISTCMP_CORREL)
                if correlation < self.scene_change_threshold:
                    should_extract = True
                    reason = "scene_change"

            if should_extract:
                extracted.append(ExtractedFrame(
                    frame_index=frame_idx,
                    timestamp_seconds=timestamp,
                    frame=frame.copy(),
                    extraction_reason=reason,
                ))
                last_extracted_idx = frame_idx

                if len(extracted) >= self.max_frames:
                    logger.warning(f"Max frames ({self.max_frames}) reached, stopping extraction")
                    break

            prev_gray = gray_small
            prev_hist = hist.copy()
            frame_idx += 1

        # ── Always include the last frame if not already included ──
        if extracted and frame_idx > 0:
            last_ts = (frame_idx - 1) / fps if fps > 0 else 0.0
            if extracted[-1].frame_index != (frame_idx - 1):
                # Re-read last frame
                cap.set(cv2.CAP_PROP_POS_FRAMES, frame_idx - 1)
                ret, last_frame = cap.read()
                if ret:
                    extracted.append(ExtractedFrame(
                        frame_index=frame_idx - 1,
                        timestamp_seconds=last_ts,
                        frame=last_frame.copy(),
                        extraction_reason="last",
                    ))

        cap.release()
        logger.info(f"Extracted {len(extracted)} key frames from {frame_idx} total frames")
        return extracted, metadata


# ─── Forensic Describer ──────────────────────────────────────────────────────

class ForensicDescriber:
    """
    Generates forensic descriptions for extracted frames using
    OpenCV computer-vision heuristics.
    """

    def __init__(self):
        # HOG-based person detector
        self.hog = cv2.HOGDescriptor()
        self.hog.setSVMDetector(cv2.HOGDescriptor_getDefaultPeopleDetector())

    def describe_frame(
        self,
        frame: ExtractedFrame,
        prev_frame: Optional[ExtractedFrame] = None,
    ) -> FrameDescription:
        """Generate a forensic description for a single frame."""
        timestamp_str = self._format_timestamp(frame.timestamp_seconds)
        img = frame.frame

        # Collect observations
        observations = []

        # ── Detect people ──
        people = self._detect_people(img)
        if people:
            observations.append(self._describe_people(people, img))

        # ── Detect potential vehicles (large contours with vehicle-like aspect ratio) ──
        vehicles = self._detect_vehicles(img)
        if vehicles:
            observations.append(self._describe_vehicles(vehicles))

        # ── Estimate motion direction if previous frame available ──
        if prev_frame is not None:
            motion_desc = self._describe_motion(prev_frame.frame, img)
            if motion_desc:
                observations.append(motion_desc)

        # ── Scene characteristics ──
        scene = self._describe_scene(img)
        if scene and not observations:
            observations.append(scene)

        # ── Extraction reason context ──
        if not observations:
            observations.append(self._describe_by_reason(frame))

        # ── Compose final description (max ~20 words) ──
        description = ". ".join(observations)
        description = self._truncate_to_words(description, 20)

        return FrameDescription(
            timestamp=timestamp_str,
            description=description,
        )

    def _detect_people(self, img: np.ndarray) -> List[Tuple[int, int, int, int]]:
        """Detect people using HOG + SVM."""
        try:
            # Resize for faster detection
            scale = 1.0
            h, w = img.shape[:2]
            if w > 640:
                scale = 640 / w
                img_resized = cv2.resize(img, (640, int(h * scale)))
            else:
                img_resized = img

            boxes, weights = self.hog.detectMultiScale(
                img_resized,
                winStride=(8, 8),
                padding=(4, 4),
                scale=1.05,
            )

            if len(boxes) == 0:
                return []

            # Scale boxes back to original size and convert to list of tuples
            result = []
            for (x, y, bw, bh) in boxes:
                result.append((
                    int(x / scale),
                    int(y / scale),
                    int(bw / scale),
                    int(bh / scale),
                ))
            return result
        except Exception:
            return []

    def _describe_people(self, boxes: List[Tuple], img: np.ndarray) -> str:
        """Describe detected people."""
        count = len(boxes)
        if count == 1:
            x, y, w, h = boxes[0]
            position = self._get_position_label(x + w // 2, img.shape[1])
            return f"Single person detected at {position} of frame"
        else:
            return f"{count} people visible in the frame"

    def _detect_vehicles(self, img: np.ndarray) -> List[Dict]:
        """Detect potential vehicles using contour analysis."""
        try:
            gray = cv2.cvtColor(img, cv2.COLOR_BGR2GRAY)
            blurred = cv2.GaussianBlur(gray, (5, 5), 0)
            edges = cv2.Canny(blurred, 50, 150)

            # Dilate to close gaps
            kernel = cv2.getStructuringElement(cv2.MORPH_RECT, (5, 5))
            dilated = cv2.dilate(edges, kernel, iterations=2)

            contours, _ = cv2.findContours(dilated, cv2.RETR_EXTERNAL, cv2.CHAIN_APPROX_SIMPLE)

            vehicles = []
            img_area = img.shape[0] * img.shape[1]

            for cnt in contours:
                area = cv2.contourArea(cnt)
                if area < img_area * 0.02 or area > img_area * 0.6:
                    continue

                x, y, w, h = cv2.boundingRect(cnt)
                aspect_ratio = w / h if h > 0 else 0

                # Vehicle-like aspect ratios (wider than tall, typically 1.5-4.0)
                if 1.3 <= aspect_ratio <= 4.5 and w > 80:
                    # Estimate dominant color in the bounding box
                    roi = img[y:y+h, x:x+w]
                    color = self._get_dominant_color_name(roi)
                    vehicles.append({
                        "bbox": (x, y, w, h),
                        "color": color,
                        "aspect_ratio": aspect_ratio,
                    })

            return vehicles[:3]  # Cap at 3 vehicles
        except Exception:
            return []

    def _describe_vehicles(self, vehicles: List[Dict]) -> str:
        """Describe detected vehicles."""
        if len(vehicles) == 1:
            v = vehicles[0]
            return f"{v['color']} vehicle visible in frame"
        else:
            return f"{len(vehicles)} vehicles detected in frame"

    def _describe_motion(self, prev_img: np.ndarray, curr_img: np.ndarray) -> Optional[str]:
        """Estimate overall motion direction between frames."""
        try:
            prev_gray = cv2.cvtColor(prev_img, cv2.COLOR_BGR2GRAY)
            curr_gray = cv2.cvtColor(curr_img, cv2.COLOR_BGR2GRAY)

            # Resize for speed
            prev_small = cv2.resize(prev_gray, (320, 240))
            curr_small = cv2.resize(curr_gray, (320, 240))

            # Optical flow on sparse features
            features = cv2.goodFeaturesToTrack(prev_small, maxCorners=100, qualityLevel=0.3, minDistance=7)
            if features is None or len(features) < 5:
                return None

            next_pts, status, _ = cv2.calcOpticalFlowPyrLK(prev_small, curr_small, features, None)
            if next_pts is None:
                return None

            good_old = features[status.flatten() == 1]
            good_new = next_pts[status.flatten() == 1]

            if len(good_old) < 3:
                return None

            dx = np.mean(good_new[:, 0] - good_old[:, 0])
            dy = np.mean(good_new[:, 1] - good_old[:, 1])

            magnitude = np.sqrt(dx**2 + dy**2)
            if magnitude < 2.0:
                return None

            direction = self._get_direction(dx, dy)

            if magnitude > 15:
                return f"Significant movement detected toward {direction}"
            elif magnitude > 5:
                return f"Moderate movement toward {direction}"
            else:
                return f"Slight movement toward {direction}"

        except Exception:
            return None

    def _describe_scene(self, img: np.ndarray) -> str:
        """Characterize the scene (brightness, indoor/outdoor estimate)."""
        try:
            gray = cv2.cvtColor(img, cv2.COLOR_BGR2GRAY)
            mean_brightness = np.mean(gray)

            hsv = cv2.cvtColor(img, cv2.COLOR_BGR2HSV)
            mean_saturation = np.mean(hsv[:, :, 1])

            parts = []

            if mean_brightness < 50:
                parts.append("Dark/low-light scene")
            elif mean_brightness < 100:
                parts.append("Dimly lit scene")
            elif mean_brightness > 200:
                parts.append("Brightly lit scene")

            # High saturation + brightness often suggests outdoor
            if mean_saturation > 80 and mean_brightness > 100:
                parts.append("likely outdoor environment")
            elif mean_saturation < 40 and mean_brightness > 80:
                parts.append("likely indoor environment")

            if parts:
                return ", ".join(parts)

            return "Static scene with no significant activity"
        except Exception:
            return "Scene frame captured"

    def _describe_by_reason(self, frame: ExtractedFrame) -> str:
        """Fallback description based on extraction reason."""
        reason_map = {
            "first": "Opening frame of footage, establishing scene",
            "last": "Final frame of footage captured",
            "interval": "Routine interval capture, no significant change detected",
            "motion": "Motion detected in frame",
            "scene_change": "Significant scene change or camera transition detected",
        }
        return reason_map.get(frame.extraction_reason, "Frame captured for analysis")

    # ─── Utility Methods ──────────────────────────────────────────────────────

    @staticmethod
    def _format_timestamp(seconds: float) -> str:
        """Convert seconds to HH:MM:SS format."""
        hours = int(seconds // 3600)
        minutes = int((seconds % 3600) // 60)
        secs = int(seconds % 60)
        return f"{hours:02d}:{minutes:02d}:{secs:02d}"

    @staticmethod
    def _get_position_label(x_center: int, frame_width: int) -> str:
        """Get spatial position label."""
        ratio = x_center / frame_width if frame_width > 0 else 0.5
        if ratio < 0.33:
            return "left side"
        elif ratio > 0.66:
            return "right side"
        else:
            return "center"

    @staticmethod
    def _get_direction(dx: float, dy: float) -> str:
        """Convert displacement vector to cardinal direction."""
        angle = np.degrees(np.arctan2(-dy, dx))  # -dy because image y is inverted
        if -22.5 <= angle < 22.5:
            return "right"
        elif 22.5 <= angle < 67.5:
            return "upper-right"
        elif 67.5 <= angle < 112.5:
            return "top"
        elif 112.5 <= angle < 157.5:
            return "upper-left"
        elif angle >= 157.5 or angle < -157.5:
            return "left"
        elif -157.5 <= angle < -112.5:
            return "lower-left"
        elif -112.5 <= angle < -67.5:
            return "bottom"
        else:
            return "lower-right"

    @staticmethod
    def _get_dominant_color_name(roi: np.ndarray) -> str:
        """Estimate the dominant color name from an ROI."""
        try:
            if roi.size == 0:
                return "unknown-colored"
            hsv = cv2.cvtColor(roi, cv2.COLOR_BGR2HSV)
            mean_h = np.mean(hsv[:, :, 0])
            mean_s = np.mean(hsv[:, :, 1])
            mean_v = np.mean(hsv[:, :, 2])

            # Achromatic colors
            if mean_s < 40:
                if mean_v < 60:
                    return "black"
                elif mean_v < 160:
                    return "gray"
                else:
                    return "white"

            # Chromatic colors based on hue
            if mean_h < 10 or mean_h >= 170:
                return "red"
            elif 10 <= mean_h < 25:
                return "orange"
            elif 25 <= mean_h < 35:
                return "yellow"
            elif 35 <= mean_h < 85:
                return "green"
            elif 85 <= mean_h < 130:
                return "blue"
            elif 130 <= mean_h < 170:
                return "purple"
            else:
                return "colored"
        except Exception:
            return "unknown-colored"

    @staticmethod
    def _truncate_to_words(text: str, max_words: int) -> str:
        """Truncate text to a maximum number of words."""
        words = text.split()
        if len(words) <= max_words:
            return text
        return " ".join(words[:max_words])


# ─── Main Analysis Pipeline ─────────────────────────────────────────────────

def analyze_video(
    video_path: str,
    interval_seconds: float = 1.5,
    motion_threshold: float = 25.0,
    max_frames: int = 500,
) -> Dict:
    """
    Full CCTV forensic analysis pipeline.

    Args:
        video_path: Path to the video file.
        interval_seconds: Base time interval for frame sampling.
        motion_threshold: Pixel-difference threshold for motion detection.
        max_frames: Maximum number of frames to extract.

    Returns:
        Dictionary with video metadata and list of frame analyses.
    """
    logger.info(f"Starting CCTV analysis: {video_path}")

    # ── Step 1: Extract key frames ──
    extractor = FrameExtractor(
        interval_seconds=interval_seconds,
        motion_threshold=motion_threshold,
        max_frames=max_frames,
    )
    frames, metadata = extractor.extract(video_path)

    if not frames:
        logger.warning("No frames extracted from video")
        return {
            "metadata": metadata,
            "analysis": [],
        }

    # ── Step 2: Generate forensic descriptions ──
    describer = ForensicDescriber()
    analysis_results: List[Dict] = []

    for i, frame in enumerate(frames):
        prev_frame = frames[i - 1] if i > 0 else None
        desc = describer.describe_frame(frame, prev_frame)
        analysis_results.append({
            "timestamp": desc.timestamp,
            "description": desc.description,
        })

    logger.info(f"Analysis complete: {len(analysis_results)} frames described")

    # ── Free frame memory ──
    for f in frames:
        del f.frame

    return {
        "metadata": metadata,
        "analysis": analysis_results,
    }
