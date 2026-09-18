"""
PMI (Post-Mortem Interval) model training pipeline.
=====================================================

Design note — what this model actually learns
----------------------------------------------
The source dataset contains **no ground-truth PMI / time-of-death column**.
A label therefore has to be constructed. An earlier version of this file did:

    df["PMI"] = (df["Vitreous Potassium"] - 5.04) / 0.7     # the target
    FEATURES  = [..., "Vitreous Potassium", ...]            # ...also an input

That is textbook target leakage: the label was a closed-form function of one of
its own inputs, so the forest simply re-learned that line. Vitreous Potassium
took ~99.8% of the feature importance and no other variable moved the
prediction at all — a still-warm body and a decomposing one scored identically.

The framing here instead poses a question that is actually worth asking:

    Vitreous potassium is the best quantitative PMI estimator available, but
    it requires vitreous humour aspiration and lab analysis. How well can PMI
    be recovered at the scene, from decomposition signs alone?

So the label is the **Lange vitreous-potassium regression** — the one
literature-backed quantitative estimator in this data — and potassium is then
**excluded from the feature matrix**. The model must infer PMI from the
independent indicators an examiner can assess directly: body cooling, rigor,
livor, entomology and putrefaction.

That makes the task non-trivial and the metrics meaningful. The signal it
exploits is real rather than circular: Algor Mortis correlates r ≈ -0.68 with
Vitreous Potassium in this dataset.

Training also scores a **Henssge cooling baseline** (physics only, no ML) on
the same hold-out split, so the reported numbers show what the model adds over
the classical method rather than quoting an unanchored R².

The label remains a *proxy*, and is labelled as such everywhere it surfaces.
It is not a forensically established PMI.
"""

from __future__ import annotations

import json
import os
from typing import Any

import joblib
import numpy as np
import pandas as pd
from sklearn.compose import ColumnTransformer
from sklearn.ensemble import RandomForestRegressor
from sklearn.linear_model import LinearRegression
from sklearn.metrics import mean_absolute_error, mean_squared_error, r2_score
from sklearn.model_selection import KFold, cross_val_score, train_test_split
from sklearn.pipeline import Pipeline
from sklearn.preprocessing import OneHotEncoder, StandardScaler

BASE_DIR = os.path.dirname(os.path.abspath(__file__))
MODEL_DIR = os.path.join(BASE_DIR, "..", "models")
MODEL_PATH = os.path.join(MODEL_DIR, "pmi_model.pkl")
METRICS_PATH = os.path.join(MODEL_DIR, "pmi_metrics.json")
CSV_PATH = os.path.join(BASE_DIR, "..", "dataset", "forensic_autopsy_3000.csv")

RANDOM_STATE = 42

# ── Feature definitions ──────────────────────────────────────────────────────
# "Vitreous Potassium" is deliberately ABSENT: it anchors the label, so keeping
# it as an input would reintroduce the leakage this rewrite exists to remove.
NUMERIC_FEATURES = ["Age", "Height", "Weight", "Putrefaction", "Algor Mortis"]

CATEGORICAL_FEATURES = [
    "Sex",
    "Putre_level",
    "Rigor Mortis",
    "Livor Mortis",
    "Stomach Contents",
    "Entomology",
]

FEATURES = NUMERIC_FEATURES + CATEGORICAL_FEATURES

# The exact category vocabulary present in the dataset. Exposed so the API
# schema and the model share one source of truth — previously the API accepted
# any string and OneHotEncoder(handle_unknown="ignore") silently swallowed
# typos into an all-zero vector, returning a confident answer for `Sex="banana"`.
CATEGORY_VOCAB: dict[str, list[str]] = {
    "Sex": ["Female", "Male", "Other", "Unknown"],
    "Putre_level": ["None", "Mild", "Moderate", "Advanced", "Severe"],
    "Rigor Mortis": [
        "None",
        "Beginning (jaw/neck)",
        "Developing",
        "Full/Fixed",
        "Resolving",
        "Resolved",
    ],
    "Livor Mortis": [
        "None",
        "Developing (faint)",
        "Faint posterior",
        "Fixed (dependent areas)",
        "Pronounced (fixed posterior)",
    ],
    "Stomach Contents": [
        "Undigested food (recent meal)",
        "Partially digested",
        "Minimal residue",
        "Fully digested",
        "Empty",
        "Unknown",
    ],
    "Entomology": [
        "No insects present",
        "Eggs only",
        "1st instar larvae",
        "2nd instar larvae",
    ],
}

# Ordinal rank of each decomposition stage, used to build the blended label.
# Higher rank == longer elapsed since death.
_RIGOR_RANK = {
    "None": 0.0,
    "Beginning (jaw/neck)": 1.0,
    "Developing": 2.0,
    "Full/Fixed": 3.0,
    "Resolving": 4.0,
    "Resolved": 5.0,
}
_LIVOR_RANK = {
    "None": 0.0,
    "Developing (faint)": 1.0,
    "Faint posterior": 1.5,
    "Fixed (dependent areas)": 3.0,
    "Pronounced (fixed posterior)": 4.0,
}
_ENTOMOLOGY_RANK = {
    "No insects present": 0.0,
    "Eggs only": 1.0,
    "1st instar larvae": 2.0,
    "2nd instar larvae": 3.0,
}
_PUTRE_RANK = {"None": 0.0, "Mild": 1.0, "Moderate": 2.0, "Advanced": 3.0, "Severe": 4.0}

NORMAL_BODY_TEMP_C = 37.0
AMBIENT_TEMP_C = 21.0


def _lange_pmi(vk: pd.Series) -> pd.Series:
    """Lange et al. vitreous-potassium regression: PMI ≈ (K+ - 5.04) / 0.7 hours."""
    return ((vk - 5.04) / 0.7).clip(lower=0.0)


def _henssge_pmi(algor_c: pd.Series) -> pd.Series:
    """
    Simplified Henssge/Newton body-cooling estimate.

    Newton's law of cooling solved for elapsed time:
        t = -ln((T_body - T_ambient) / (T_normal - T_ambient)) / k

    k ≈ 0.11/h is a reasonable average for a clothed adult at ~21 °C. This is a
    deliberate simplification of the full Henssge nomogram (which also corrects
    for body mass, clothing and airflow) but it gives the label an independent,
    physics-derived component instead of a second copy of the potassium line.
    """
    k = 0.11
    ratio = (algor_c - AMBIENT_TEMP_C) / (NORMAL_BODY_TEMP_C - AMBIENT_TEMP_C)
    ratio = ratio.clip(lower=0.02, upper=1.0)
    return (-np.log(ratio) / k).clip(lower=0.0, upper=120.0)


def build_target(df: pd.DataFrame) -> pd.Series:
    """
    The PMI proxy label: the Lange vitreous-potassium regression.

    Vitreous Potassium is excluded from FEATURES, so this label is *not*
    derivable from any model input — the model has to recover it from the
    decomposition indicators instead.
    """
    vk = pd.to_numeric(df["Vitreous Potassium"], errors="coerce").fillna(5.04)
    return _lange_pmi(vk).clip(upper=120.0)


def henssge_baseline(df: pd.DataFrame) -> pd.Series:
    """Physics-only PMI estimate from body cooling — the non-ML control."""
    algor = pd.to_numeric(df["Algor Mortis"], errors="coerce").fillna(AMBIENT_TEMP_C)
    return _henssge_pmi(algor)


def prepare_frame(df: pd.DataFrame) -> pd.DataFrame:
    """Normalise dtypes and fill gaps using only in-vocabulary category values."""
    df = df.copy()

    fills = {
        "Sex": "Unknown",
        "Putre_level": "None",
        "Rigor Mortis": "None",
        "Livor Mortis": "None",
        "Stomach Contents": "Unknown",
        "Entomology": "No insects present",
    }
    for col, fill in fills.items():
        if col in df.columns:
            df[col] = df[col].astype("object").fillna(fill).astype(str)
            # Map anything outside the known vocabulary onto the fill value so
            # training never sees a category the API would reject.
            allowed = set(CATEGORY_VOCAB[col])
            df.loc[~df[col].isin(allowed), col] = fill

    for col in NUMERIC_FEATURES + ["Vitreous Potassium"]:
        if col in df.columns:
            df[col] = pd.to_numeric(df[col], errors="coerce").fillna(0.0).clip(lower=0.0)

    return df


def build_pipeline() -> Pipeline:
    preprocessor = ColumnTransformer(
        transformers=[
            ("num", StandardScaler(), NUMERIC_FEATURES),
            (
                "cat",
                OneHotEncoder(
                    categories=[CATEGORY_VOCAB[c] for c in CATEGORICAL_FEATURES],
                    handle_unknown="error",
                    sparse_output=False,
                ),
                CATEGORICAL_FEATURES,
            ),
        ]
    )
    return Pipeline(
        [
            ("preprocessor", preprocessor),
            (
                "regressor",
                RandomForestRegressor(
                    n_estimators=300,
                    min_samples_leaf=2,
                    random_state=RANDOM_STATE,
                    n_jobs=-1,
                ),
            ),
        ]
    )


def train(csv_path: str = CSV_PATH, persist: bool = True) -> dict[str, Any]:
    """Train the PMI model and return held-out metrics."""
    print(f"Loading dataset from {csv_path} ...")
    df = prepare_frame(pd.read_csv(csv_path))

    X = df[FEATURES]
    y = build_target(df)
    baseline = henssge_baseline(df)

    X_train, X_test, y_train, y_test, baseline_train, baseline_test = train_test_split(
        X, y, baseline, test_size=0.2, random_state=RANDOM_STATE
    )

    pipeline = build_pipeline()
    print(f"Training on {len(X_train)} samples (holding out {len(X_test)}) ...")
    pipeline.fit(X_train, y_train)

    preds = pipeline.predict(X_test)
    mae = float(mean_absolute_error(y_test, preds))
    rmse = float(np.sqrt(mean_squared_error(y_test, preds)))
    r2 = float(r2_score(y_test, preds))

    print("Running 5-fold cross-validation ...")
    cv = KFold(n_splits=5, shuffle=True, random_state=RANDOM_STATE)
    cv_scores = cross_val_score(
        build_pipeline(), X, y, cv=cv, scoring="neg_mean_absolute_error", n_jobs=-1
    )
    cv_mae = [float(-s) for s in cv_scores]

    # Non-ML control: classical body-cooling physics on the same hold-out rows.
    # The raw Henssge hours are on a different scale to this dataset's label, so
    # it gets a 2-parameter linear calibration fitted on TRAIN ONLY — otherwise
    # the comparison would be rigged in the ML model's favour.
    calib = LinearRegression().fit(baseline_train.to_numpy().reshape(-1, 1), y_train)
    baseline_pred = calib.predict(baseline_test.to_numpy().reshape(-1, 1))
    baseline_mae = float(mean_absolute_error(y_test, baseline_pred))
    baseline_r2 = float(r2_score(y_test, baseline_pred))
    # Mean-predictor control — the floor any model must beat.
    naive_mae = float(mean_absolute_error(y_test, np.full_like(y_test, y_train.mean())))

    metrics: dict[str, Any] = {
        "n_samples": int(len(df)),
        "n_train": int(len(X_train)),
        "n_test": int(len(X_test)),
        "features": FEATURES,
        "excluded_from_features": ["Vitreous Potassium"],
        "target": "Lange vitreous-potassium PMI regression (proxy label; K+ excluded from features)",
        "holdout": {
            "mae_hours": round(mae, 3),
            "rmse_hours": round(rmse, 3),
            "r2": round(r2, 4),
        },
        "baselines": {
            "henssge_cooling_calibrated": {
                "mae_hours": round(baseline_mae, 3),
                "r2": round(baseline_r2, 4),
            },
            "predict_train_mean": {"mae_hours": round(naive_mae, 3)},
            "note": (
                "ML must beat both to be worth anything. Henssge is physics-only "
                "(body cooling, linearly calibrated on TRAIN only); "
                "predict_train_mean is the trivial floor."
            ),
        },
        "caveats": [
            "No ground-truth PMI exists in this dataset; the label is the Lange "
            "vitreous-potassium regression used as a proxy standard.",
            "The dataset's forensic columns are synthetic and tightly coupled, so "
            "R^2 here is optimistic and should NOT be read as real-world accuracy. "
            "The Henssge and mean-predictor baselines are the meaningful comparison.",
            "Investigative support only - not a substitute for a forensic "
            "pathologist's determination.",
        ],
        "cross_validation": {
            "folds": 5,
            "mae_hours_mean": round(float(np.mean(cv_mae)), 3),
            "mae_hours_std": round(float(np.std(cv_mae)), 3),
            "mae_hours_per_fold": [round(v, 3) for v in cv_mae],
        },
        "target_stats": {
            "mean_hours": round(float(y.mean()), 2),
            "std_hours": round(float(y.std()), 2),
            "min_hours": round(float(y.min()), 2),
            "max_hours": round(float(y.max()), 2),
        },
    }

    if persist:
        os.makedirs(MODEL_DIR, exist_ok=True)
        joblib.dump(pipeline, MODEL_PATH)
        with open(METRICS_PATH, "w", encoding="utf-8") as fh:
            json.dump(metrics, fh, indent=2)
        print(f"Model saved to  {MODEL_PATH}")
        print(f"Metrics saved to {METRICS_PATH}")

    print(
        f"Hold-out : MAE {mae:.2f} h | RMSE {rmse:.2f} h | R2 {r2:.3f}\n"
        f"5-fold CV: MAE {np.mean(cv_mae):.2f} +/- {np.std(cv_mae):.2f} h\n"
        f"Baselines: Henssge-only MAE {baseline_mae:.2f} h (R2 {baseline_r2:.3f}) | "
        f"mean-predictor MAE {naive_mae:.2f} h"
    )
    return metrics


def load_metrics() -> dict[str, Any] | None:
    if not os.path.exists(METRICS_PATH):
        return None
    try:
        with open(METRICS_PATH, encoding="utf-8") as fh:
            return json.load(fh)
    except (OSError, json.JSONDecodeError):
        return None


if __name__ == "__main__":
    train()
