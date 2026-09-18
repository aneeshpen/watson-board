"""
Read-only access to the autopsy dataset.

Fixes over the original:
  * `fillna("")` replaced every missing numeric with an empty string, so a
    single column could serialise as a mix of floats and "". Numerics now keep
    their type and become JSON `null` when missing.
  * `get_all_autopsies` had no upper bound, so `?limit=999999` streamed the
    entire 2.2 MB dataset. The caller's limit is clamped.
  * CPR lookups did a full linear scan per request; an index is built once.
"""

from __future__ import annotations

import logging
import math
from typing import Any

import pandas as pd

from config import settings

logger = logging.getLogger("watson_board.autopsy")


def _json_safe(value: Any) -> Any:
    """NaN/NaT -> None so the payload is valid JSON without stringifying numbers."""
    if value is None:
        return None
    if isinstance(value, float) and (math.isnan(value) or math.isinf(value)):
        return None
    if value is pd.NaT:
        return None
    try:
        if pd.isna(value):
            return None
    except (TypeError, ValueError):
        pass
    if hasattr(value, "item"):  # numpy scalar -> python scalar
        return value.item()
    return value


def _records(frame: pd.DataFrame) -> list[dict[str, Any]]:
    return [
        {col: _json_safe(val) for col, val in row.items()}
        for row in frame.to_dict(orient="records")
    ]


class AutopsyService:
    def __init__(self, csv_path: str | None = None) -> None:
        self.csv_path = csv_path or settings.dataset_path
        self._index: dict[str, int] = {}
        try:
            self.df = pd.read_csv(self.csv_path)
            if "CPR Number" in self.df.columns:
                # Position index for O(1) lookups instead of a per-request scan.
                self._index = {
                    str(cpr): pos
                    for pos, cpr in enumerate(self.df["CPR Number"].tolist())
                }
        except (OSError, pd.errors.ParserError) as exc:
            logger.error("Could not load autopsy dataset from %s: %s", self.csv_path, exc)
            self.df = pd.DataFrame()

    @property
    def available(self) -> bool:
        return not self.df.empty

    def count(self) -> int:
        return int(len(self.df))

    def get_all_autopsies(self, limit: int = 50, skip: int = 0) -> list[dict[str, Any]]:
        if self.df.empty:
            return []
        limit = max(1, min(int(limit), settings.max_page_size))
        skip = max(0, int(skip))
        return _records(self.df.iloc[skip : skip + limit])

    def get_autopsy_by_cpr(self, cpr_number: str) -> dict[str, Any] | None:
        if self.df.empty:
            return None
        pos = self._index.get(str(cpr_number))
        if pos is None:
            return None
        row = self.df.iloc[pos].to_dict()
        return {col: _json_safe(val) for col, val in row.items()}


autopsy_service = AutopsyService()
