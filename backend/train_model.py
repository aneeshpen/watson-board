import os
import pandas as pd
from sklearn.compose import ColumnTransformer
from sklearn.preprocessing import StandardScaler, OneHotEncoder
from sklearn.ensemble import RandomForestRegressor
from sklearn.pipeline import Pipeline
import joblib

MODEL_PATH = os.path.join(os.path.dirname(__file__), "../models/pmi_model.pkl")
CSV_PATH = os.path.join(os.path.dirname(__file__), "../dataset/forensic_autopsy_3000.csv")

FEATURES = [
    "Age", "Sex", "Height", "Weight", "Putrefaction", "Putre_level",
    "Rigor Mortis", "Livor Mortis", "Algor Mortis", "Stomach Contents",
    "Vitreous Potassium", "Entomology"
]

NUMERIC_FEATURES = [
    "Age", "Height", "Weight", "Putrefaction", "Algor Mortis", "Vitreous Potassium"
]

CATEGORICAL_FEATURES = [
    "Sex", "Putre_level", "Rigor Mortis", "Livor Mortis", "Stomach Contents", "Entomology"
]

# PMI formula (Lange et al.): PMI ≈ (VK - 5.04) / 0.7 hours
def _derive_pmi(vk: pd.Series) -> pd.Series:
    return ((vk - 5.04) / 0.7).clip(lower=0)


def train():
    print(f"Loading dataset from {CSV_PATH} ...")
    df = pd.read_csv(CSV_PATH)

    # Fill missing categoricals before feature use
    cat_fill = {
        "Putre_level": "None",
        "Rigor Mortis": "None",
        "Livor Mortis": "None",
        "Stomach Contents": "Unknown",
        "Entomology": "None",
        "Sex": "Unknown",
    }
    for col, val in cat_fill.items():
        if col in df.columns:
            df[col] = df[col].fillna(val).astype(str)

    # Clip negative numeric values
    for col in NUMERIC_FEATURES:
        if col in df.columns:
            df[col] = pd.to_numeric(df[col], errors="coerce").fillna(0).clip(lower=0)

    # Derive target from Vitreous Potassium
    df["PMI"] = _derive_pmi(df["Vitreous Potassium"])

    X = df[FEATURES]
    y = df["PMI"]

    preprocessor = ColumnTransformer(
        transformers=[
            ("num", StandardScaler(), NUMERIC_FEATURES),
            ("cat", OneHotEncoder(handle_unknown="ignore", sparse_output=False), CATEGORICAL_FEATURES),
        ]
    )

    pipeline = Pipeline([
        ("preprocessor", preprocessor),
        ("regressor", RandomForestRegressor(n_estimators=200, random_state=42, n_jobs=-1)),
    ])

    print(f"Training on {len(X)} samples ...")
    pipeline.fit(X, y)

    os.makedirs(os.path.dirname(MODEL_PATH), exist_ok=True)
    joblib.dump(pipeline, MODEL_PATH)
    print(f"Model saved to {MODEL_PATH}")


if __name__ == "__main__":
    train()
