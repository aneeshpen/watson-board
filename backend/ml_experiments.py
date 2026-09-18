"""
Model-selection study for the PMI estimator.

Run with:  python ml_experiments.py

This is the experiment that chose the production configuration in
`train_model.py`. It is kept in the repo so the choice is reproducible and
auditable rather than asserted — every number in the README's model section
comes from this script.

It compares, under identical 5-fold cross-validation:
  * four feature representations (one-hot -> ordinal -> engineered -> pruned)
  * four model families (Ridge, RandomForest, ExtraTrees, HistGradientBoosting)
and then runs an ablation over feature groups on the winner.

All encoders are fitted inside each CV fold, so nothing leaks across the split.
"""

from __future__ import annotations

import numpy as np
import pandas as pd
from sklearn.base import BaseEstimator, TransformerMixin
from sklearn.compose import ColumnTransformer
from sklearn.ensemble import ExtraTreesRegressor, HistGradientBoostingRegressor, RandomForestRegressor
from sklearn.linear_model import Ridge
from sklearn.model_selection import KFold, cross_val_score
from sklearn.pipeline import Pipeline
from sklearn.preprocessing import OneHotEncoder, StandardScaler

from train_model import (
    AMBIENT_TEMP_C,
    CATEGORICAL_FEATURES,
    CSV_PATH,
    NORMAL_BODY_TEMP_C,
    NUMERIC_FEATURES,
    RANDOM_STATE,
    build_target,
    prepare_frame,
)

ORDERED_CATEGORICALS = [
    "Rigor Mortis",
    "Livor Mortis",
    "Entomology",
    "Putre_level",
    "Stomach Contents",
]
NOMINAL_CATEGORICALS = ["Sex"]
DEMOGRAPHIC_FEATURES = ["Age", "Height", "Weight"]


class TargetOrderedOrdinal(BaseEstimator, TransformerMixin):
    """
    Encode ordered categoricals as ranks learned from the training target.

    One-hot encoding throws away the ordering in `Rigor Mortis`,
    `Putre_level` and friends, which is exactly the information those
    observations carry. Hand-written rank tables risk being wrong — the data
    here shows "Minimal residue" implies a LONGER interval than "Empty",
    which is the opposite of the intuitive ordering.

    So the ordering is learned: each level maps to its rank by mean target,
    fitted per CV fold. Unseen levels fall back to the middle rank.
    """

    def __init__(self, columns: list[str]):
        self.columns = columns

    def fit(self, X: pd.DataFrame, y=None):
        self.maps_: dict[str, dict[str, float]] = {}
        self.fallback_: dict[str, float] = {}
        target = pd.Series(np.asarray(y), index=X.index)
        for col in self.columns:
            means = target.groupby(X[col]).mean().sort_values()
            self.maps_[col] = {level: float(rank) for rank, level in enumerate(means.index)}
            self.fallback_[col] = (len(means) - 1) / 2.0
        return self

    def transform(self, X: pd.DataFrame) -> np.ndarray:
        out = pd.DataFrame(index=X.index)
        for col in self.columns:
            out[col] = X[col].map(self.maps_[col]).fillna(self.fallback_[col])
        return out.to_numpy(dtype=float)

    def get_feature_names_out(self, input_features=None):
        return np.asarray(self.columns, dtype=object)


def engineer(df: pd.DataFrame) -> pd.DataFrame:
    """Physics-informed derived features (all functions of existing inputs)."""
    out = df.copy()
    algor = pd.to_numeric(out["Algor Mortis"], errors="coerce").fillna(AMBIENT_TEMP_C)

    # How far the body has cooled toward ambient.
    out["temp_deficit"] = (NORMAL_BODY_TEMP_C - algor).clip(lower=0)

    # Newton-cooling hours: gives the model a linearised view of the cooling
    # curve instead of making it rediscover a logarithm from raw temperature.
    ratio = ((algor - AMBIENT_TEMP_C) / (NORMAL_BODY_TEMP_C - AMBIENT_TEMP_C)).clip(0.02, 1.0)
    out["henssge_hours"] = (-np.log(ratio) / 0.11).clip(0, 120)

    # Body mass affects cooling rate.
    height_m = (pd.to_numeric(out["Height"], errors="coerce").fillna(170) / 100).clip(lower=0.5)
    out["bmi"] = (pd.to_numeric(out["Weight"], errors="coerce").fillna(70) / height_m**2).clip(5, 80)
    return out


ENGINEERED = ["temp_deficit", "henssge_hours", "bmi"]


def make_preprocessor(kind: str) -> tuple[ColumnTransformer, list[str]]:
    """Return (preprocessor, numeric columns used) for a feature-set variant."""
    if kind == "A_onehot":
        numeric = NUMERIC_FEATURES
        return (
            ColumnTransformer(
                [
                    ("num", StandardScaler(), numeric),
                    ("cat", OneHotEncoder(handle_unknown="ignore", sparse_output=False),
                     CATEGORICAL_FEATURES),
                ]
            ),
            numeric,
        )

    if kind == "B_ordinal":
        numeric = NUMERIC_FEATURES
        return (
            ColumnTransformer(
                [
                    ("num", StandardScaler(), numeric),
                    ("ord", TargetOrderedOrdinal(ORDERED_CATEGORICALS), ORDERED_CATEGORICALS),
                    ("nom", OneHotEncoder(handle_unknown="ignore", sparse_output=False),
                     NOMINAL_CATEGORICALS),
                ]
            ),
            numeric,
        )

    if kind == "C_engineered":
        numeric = NUMERIC_FEATURES + ENGINEERED
        return (
            ColumnTransformer(
                [
                    ("num", StandardScaler(), numeric),
                    ("ord", TargetOrderedOrdinal(ORDERED_CATEGORICALS), ORDERED_CATEGORICALS),
                    ("nom", OneHotEncoder(handle_unknown="ignore", sparse_output=False),
                     NOMINAL_CATEGORICALS),
                ]
            ),
            numeric,
        )

    if kind == "D_pruned":
        # Drop the demographics and Sex, which the EDA shows carry no signal.
        numeric = [c for c in NUMERIC_FEATURES if c not in DEMOGRAPHIC_FEATURES] + ENGINEERED
        return (
            ColumnTransformer(
                [
                    ("num", StandardScaler(), numeric),
                    ("ord", TargetOrderedOrdinal(ORDERED_CATEGORICALS), ORDERED_CATEGORICALS),
                ]
            ),
            numeric,
        )

    raise ValueError(kind)


MODELS = {
    "Ridge": Ridge(alpha=1.0, random_state=None),
    "RandomForest": RandomForestRegressor(
        n_estimators=300, min_samples_leaf=2, random_state=RANDOM_STATE, n_jobs=-1
    ),
    "ExtraTrees": ExtraTreesRegressor(
        n_estimators=300, min_samples_leaf=2, random_state=RANDOM_STATE, n_jobs=-1
    ),
    "HistGradientBoosting": HistGradientBoostingRegressor(random_state=RANDOM_STATE),
}

FEATURE_SETS = ["A_onehot", "B_ordinal", "C_engineered", "D_pruned"]


def cv_mae(pipeline: Pipeline, X: pd.DataFrame, y: pd.Series) -> tuple[float, float]:
    cv = KFold(n_splits=5, shuffle=True, random_state=RANDOM_STATE)
    scores = cross_val_score(
        pipeline, X, y, cv=cv, scoring="neg_mean_absolute_error", n_jobs=-1
    )
    return float(-scores.mean()), float(scores.std())


def main() -> None:
    df = engineer(prepare_frame(pd.read_csv(CSV_PATH)))
    y = build_target(df)

    print("=" * 78)
    print("FEATURE REPRESENTATION x MODEL FAMILY  -  5-fold CV MAE in hours (lower is better)")
    print("=" * 78)
    header = f"{'model':<22}" + "".join(f"{fs:>15}" for fs in FEATURE_SETS)
    print(header)
    print("-" * 78)

    results: dict[tuple[str, str], float] = {}
    for model_name, model in MODELS.items():
        row = f"{model_name:<22}"
        for fs in FEATURE_SETS:
            pre, numeric = make_preprocessor(fs)
            cols = numeric + ORDERED_CATEGORICALS + (
                NOMINAL_CATEGORICALS if fs != "D_pruned" else []
            )
            pipe = Pipeline([("pre", pre), ("reg", model)])
            mae, sd = cv_mae(pipe, df[cols], y)
            results[(model_name, fs)] = mae
            row += f"{mae:>10.3f}±{sd:.2f}"
        print(row)

    best = min(results, key=results.get)
    print("-" * 78)
    print(f"BEST: {best[0]} on {best[1]}  ->  CV MAE {results[best]:.3f} h")
    print()

    # ── Ablation on the winning configuration ────────────────────────────────
    print("=" * 78)
    print("ABLATION  -  drop one feature group from the winner, measure the damage")
    print("=" * 78)
    model_name, fs = best
    pre, numeric = make_preprocessor(fs)
    cols = numeric + ORDERED_CATEGORICALS + (NOMINAL_CATEGORICALS if fs != "D_pruned" else [])
    base_mae = results[best]
    print(f"{'feature group removed':<34}{'CV MAE':>10}{'delta':>12}")
    print("-" * 78)
    print(f"{'(none - full model)':<34}{base_mae:>10.3f}{'':>12}")

    groups = {
        "Rigor Mortis": ["Rigor Mortis"],
        "Putre_level + Putrefaction": ["Putre_level", "Putrefaction"],
        "Algor-derived (temp/henssge)": ["Algor Mortis", "temp_deficit", "henssge_hours"],
        "Livor Mortis": ["Livor Mortis"],
        "Entomology": ["Entomology"],
        "Stomach Contents": ["Stomach Contents"],
    }
    for label, drop in groups.items():
        keep = [c for c in cols if c not in drop]
        kept_numeric = [c for c in numeric if c not in drop]
        kept_ordered = [c for c in ORDERED_CATEGORICALS if c not in drop]
        transformers = [("num", StandardScaler(), kept_numeric)]
        if kept_ordered:
            transformers.append(("ord", TargetOrderedOrdinal(kept_ordered), kept_ordered))
        if fs != "D_pruned":
            transformers.append(
                ("nom", OneHotEncoder(handle_unknown="ignore", sparse_output=False),
                 NOMINAL_CATEGORICALS)
            )
        pipe = Pipeline(
            [("pre", ColumnTransformer(transformers)), ("reg", MODELS[model_name])]
        )
        mae, _ = cv_mae(pipe, df[keep], y)
        print(f"{label:<34}{mae:>10.3f}{mae - base_mae:>+12.3f}")

    print()
    print("Interpretation: a large positive delta means that group carries signal the")
    print("rest of the features cannot recover. A delta near zero means it is redundant.")


if __name__ == "__main__":
    main()
