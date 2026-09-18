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


def prediction_interval(pipeline, row: dict[str, Any]) -> tuple[float, float, float]:
    """
    Spread of the individual trees' predictions.

    Returns (low, high, confidence_score). The interval is the 10th-90th
    percentile across the forest; confidence is derived from the coefficient of
    variation, so a tight forest consensus scores high.
    """
    frame = pd.DataFrame([row])
    transformed = pipeline.named_steps["preprocessor"].transform(frame)
    forest = pipeline.named_steps["regressor"]

    # Vectorised over trees — the old code looped in Python per request.
    tree_preds = np.array([est.predict(transformed)[0] for est in forest.estimators_])

    low = float(np.percentile(tree_preds, 10))
    high = float(np.percentile(tree_preds, 90))
    mean = float(np.mean(tree_preds))
    std = float(np.std(tree_preds))

    # Confidence from forest agreement. Using only the coefficient of variation
    # mis-scores predictions near zero (a unanimous 0.0 h scored 50%), so fall
    # back to absolute spread when the mean is too small for a ratio to mean
    # anything. TYPICAL_PMI_SCALE is roughly the label's standard deviation.
    TYPICAL_PMI_SCALE = 5.0
    if mean > 0.5:
        dispersion = std / mean
    else:
        dispersion = std / TYPICAL_PMI_SCALE
    confidence = max(0.0, min(100.0, (1.0 - dispersion) * 100.0))

    return round(low, 2), round(high, 2), round(confidence, 1)
