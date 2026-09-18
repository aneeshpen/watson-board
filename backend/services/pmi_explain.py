"""
Per-prediction explanations for the PMI model.

The previous implementation returned `rf.feature_importances_` — the model's
*global* importance vector. It was recomputed on every request and was
byte-identical for every input, yet the UI presented it as the reasoning behind
that specific case.

This module uses TreeSHAP, which attributes each individual prediction back to
its inputs: contributions sum to (prediction - base_value) for that one row.
"""

from __future__ import annotations

import logging
import math
import threading
from typing import Any

import numpy as np
import pandas as pd

logger = logging.getLogger("watson_board.pmi")

_explainer = None
_explainer_lock = threading.Lock()
_explainer_for: int | None = None


def _feature_labels(pipeline) -> list[str]:
    """Encoded column names from the fitted ColumnTransformer."""
    return list(pipeline.named_steps["preprocessor"].get_feature_names_out())


def _get_explainer(pipeline):
    """Build (once) a TreeSHAP explainer for the fitted forest."""
    global _explainer, _explainer_for
    with _explainer_lock:
        if _explainer is not None and _explainer_for == id(pipeline):
            return _explainer
        import shap  # imported lazily: heavy, and only needed on first explain

        _explainer = shap.TreeExplainer(pipeline.named_steps["regressor"])
        _explainer_for = id(pipeline)
        return _explainer


def reset_explainer() -> None:
    """Drop the cached explainer — call after the model is retrained."""
    global _explainer, _explainer_for
    with _explainer_lock:
        _explainer = None
        _explainer_for = None


def _collapse_to_base_features(
    encoded_names: list[str],
    shap_values: np.ndarray,
    numeric_features: list[str],
    categorical_features: list[str],
) -> dict[str, float]:
    """
    Map one-hot encoded contributions back onto the original feature names.

    `num__Age` -> `Age`; `cat__Sex_Male` -> `Sex` (summing every level).
    """
    collapsed: dict[str, float] = {}
    for name, value in zip(encoded_names, shap_values):
        base = None
        if name.startswith("num__"):
            candidate = name[len("num__") :]
            if candidate in numeric_features:
                base = candidate
        elif name.startswith("cat__"):
            remainder = name[len("cat__") :]
            # Longest match first so "Rigor Mortis" wins over a shorter prefix.
            for col in sorted(categorical_features, key=len, reverse=True):
                if remainder.startswith(f"{col}_"):
                    base = col
                    break
        if base is None:
            base = name
        collapsed[base] = collapsed.get(base, 0.0) + float(value)
    return collapsed


def explain_prediction(
    pipeline,
    row: dict[str, Any],
    numeric_features: list[str],
    categorical_features: list[str],
) -> tuple[list[dict[str, Any]], float]:
    """
    Return (contributions, base_value) for a single input row.

    Contributions are signed and in hours: positive pushes the PMI estimate up.
    Falls back to an empty list if SHAP is unavailable, so a prediction never
    fails just because the explainer could not be built.
    """
    frame = pd.DataFrame([row])
    try:
        transformed = pipeline.named_steps["preprocessor"].transform(frame)
        explainer = _get_explainer(pipeline)
        values = np.asarray(explainer.shap_values(transformed))[0]
        base_value = float(np.asarray(explainer.expected_value).reshape(-1)[0])

        collapsed = _collapse_to_base_features(
            _feature_labels(pipeline), values, numeric_features, categorical_features
        )
        ordered = sorted(collapsed.items(), key=lambda kv: abs(kv[1]), reverse=True)
        contributions = [
            {
                "feature": name,
                "value": row.get(name),
                "contribution_hours": round(float(delta), 3),
            }
            for name, delta in ordered
        ]
        return contributions, round(base_value, 3)
    except Exception as exc:  # pragma: no cover - explanation is best-effort
        logger.warning("SHAP explanation unavailable: %s", exc)
        return [], 0.0


def prediction_interval(
    pipeline,
    row: dict[str, Any],
    conformal_q: float | None = None,
    width_p90: float | None = None,
) -> tuple[float, float, float, bool]:
    """
    Calibrated prediction interval for a single row.

    Returns (low, high, confidence_score, is_unusual_combination).

    This used to return the 10th-90th percentile of the forest's own
    predictions. That measures how much the trees disagree, which is not a
    prediction interval and carries no coverage guarantee — a forest can agree
    and still be wrong. It now uses the split-conformal quantile calibrated at
    training time (see `fit_conformal` in train_model.py), which has a
    distribution-free coverage guarantee verified on held-out data.

    Because the interval is normalised by forest spread, its width doubles as a
    novelty signal. The dataset's findings are tightly coupled — `Putre_level =
    "None"` never co-occurs with `Rigor Mortis = "Developing"`, for instance —
    so an unusually wide interval means the combination of findings is one the
    model has effectively never seen. For a forensic tool that is worth saying
    out loud rather than hiding behind a point estimate.
    """
    from train_model import conformal_interval, tree_spread

    frame = pd.DataFrame([row])

    if conformal_q is None:
        # No calibration available: fall back to forest spread and report a
        # deliberately conservative confidence.
        spread = float(tree_spread(pipeline, frame)[0])
        pred = float(pipeline.predict(frame)[0])
        return round(max(pred - 2 * spread, 0.0), 2), round(pred + 2 * spread, 2), 50.0, False

    _, low, high = conformal_interval(pipeline, frame, conformal_q)
    low_v, high_v = float(low[0]), float(high[0])
    width = high_v - low_v

    # Exponential decay rather than a linear ramp: a linear score pinned itself
    # to 0 for every interval wider than ~11 h, which is not a rare case.
    # TARGET_SPREAD_HOURS is roughly the standard deviation of the PMI label.
    TARGET_SPREAD_HOURS = 5.6
    confidence = 100.0 * math.exp(-width / (2 * TARGET_SPREAD_HOURS))

    unusual = bool(width_p90 is not None and width > width_p90)

    return round(low_v, 2), round(high_v, 2), round(confidence, 1), unusual
