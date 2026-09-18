"""PMI prediction and model management endpoints."""

from __future__ import annotations

import logging
import os
import threading

import joblib
import pandas as pd
from fastapi import APIRouter, Depends, HTTPException, Request, status

from schemas import PMIRequest, PMIResponse
from security import limiter, require_admin_key
from services.pmi_explain import explain_prediction, prediction_interval, reset_explainer
from train_model import (
    CATEGORICAL_FEATURES,
    METRICS_PATH,
    MODEL_PATH,
    NUMERIC_FEATURES,
    load_metrics,
)
from train_model import train as run_training
from config import settings

logger = logging.getLogger("watson_board.pmi")

router = APIRouter()

# Guarded so a background retrain cannot swap the model out from under an
# in-flight prediction, and two retrains cannot run concurrently.
_model = None
_conformal_q: float | None = None
_width_p90: float | None = None
_model_lock = threading.RLock()
_training_lock = threading.Lock()


def get_model():
    with _model_lock:
        return _model


def get_conformal_q() -> float | None:
    with _model_lock:
        return _conformal_q


def get_width_p90() -> float | None:
    with _model_lock:
        return _width_p90


def _unpack(artifact):
    """
    Split a persisted artifact into (pipeline, conformal_quantile).

    Training now saves a dict so the interval calibration travels with the
    model; a bare pipeline from an older run still loads, just without
    calibrated intervals.
    """
    if isinstance(artifact, dict):
        return artifact.get("pipeline"), artifact.get("conformal_q"), artifact.get("width_p90")
    return artifact, None, None


def load_model() -> None:
    """Load the persisted model; train one first if it is missing or unreadable."""
    global _model, _conformal_q, _width_p90
    if os.path.exists(MODEL_PATH):
        try:
            pipeline, q, wp90 = _unpack(joblib.load(MODEL_PATH))
            with _model_lock:
                _model, _conformal_q, _width_p90 = pipeline, q, wp90
            reset_explainer()
            logger.info(
                "PMI model loaded from %s (conformal calibration: %s)",
                MODEL_PATH,
                "yes" if q is not None else "MISSING - retrain for calibrated intervals",
            )
            return
        except Exception as exc:
            logger.warning("PMI model load failed (%s); retraining.", exc)
    else:
        logger.info("No trained PMI model found; training now.")

    try:
        run_training()
        pipeline, q, wp90 = _unpack(joblib.load(MODEL_PATH))
        with _model_lock:
            _model, _conformal_q, _width_p90 = pipeline, q, wp90
        reset_explainer()
        logger.info("PMI model trained and loaded.")
    except Exception as exc:
        with _model_lock:
            _model, _conformal_q, _width_p90 = None, None, None
        logger.error("PMI auto-training failed: %s", exc, exc_info=True)


@router.post("/predict", response_model=PMIResponse)
@limiter.limit(settings.rate_limit_default)
def predict_pmi(request: Request, payload: PMIRequest):
    """
    Estimate the post-mortem interval from decomposition indicators.

    Invalid categorical values are rejected by the schema with a 422 listing
    the permitted options — they previously fell through as an all-zero
    one-hot vector and produced a confident but meaningless number.
    """
    model = get_model()
    if model is None:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="PMI model is not loaded. Train it via POST /api/pmi/train.",
        )

    row = payload.to_feature_row()

    try:
        prediction = float(model.predict(pd.DataFrame([row]))[0])
        low, high, confidence, unusual = prediction_interval(
            model, row, get_conformal_q(), get_width_p90()
        )
        contributions, base_value = explain_prediction(
            model, row, NUMERIC_FEATURES, CATEGORICAL_FEATURES
        )
    except Exception:
        logger.error("PMI prediction failed for payload %r", row, exc_info=True)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Prediction failed. The input was valid but the model could not score it.",
        ) from None

    metrics = load_metrics() or {}
    interval_meta = metrics.get("prediction_intervals", {})

    return PMIResponse(
        predicted_pmi_hours=round(prediction, 1),
        prediction_interval_hours=[low, high],
        interval_method=(
            "split-conformal" if get_conformal_q() is not None else "forest-spread (uncalibrated)"
        ),
        interval_coverage=interval_meta.get("target_coverage"),
        empirical_coverage=interval_meta.get("empirical_coverage"),
        confidence_score=confidence,
        unusual_combination=unusual,
        combination_note=(
            "These findings rarely occur together in the training data, so this "
            "estimate is weakly supported - treat the interval, not the point "
            "estimate, as the result."
            if unusual
            else None
        ),
        contributions=contributions,
        baseline_hours=base_value,
        message="Prediction successful.",
    )


@router.get("/model-info")
def model_info():
    """Training provenance and held-out metrics for the loaded model."""
    metrics = load_metrics()
    return {
        "loaded": get_model() is not None,
        "model_path": os.path.basename(MODEL_PATH),
        "metrics_path": os.path.basename(METRICS_PATH),
        "metrics": metrics,
        "metrics_available": metrics is not None,
    }


@router.post("/train", dependencies=[Depends(require_admin_key)])
@limiter.limit(settings.rate_limit_expensive)
def train_endpoint(request: Request):
    """
    Retrain the model from the dataset on disk.

    Admin-authenticated and rate limited — this was previously an open endpoint
    anyone could hammer to pin every CPU on the host.
    """
    if not _training_lock.acquire(blocking=False):
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="A training run is already in progress.",
        )
    try:
        metrics = run_training()
        load_model()
        return {"message": "Model retrained successfully.", "metrics": metrics}
    except Exception:
        logger.error("PMI retraining failed", exc_info=True)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Retraining failed. See server logs.",
        ) from None
    finally:
        _training_lock.release()
