from fastapi import APIRouter, HTTPException, BackgroundTasks
import pandas as pd
import numpy as np
import joblib
import os

from schemas import PMIRequest, PMIResponse
from train_model import train as run_training, MODEL_PATH, FEATURES, NUMERIC_FEATURES, CATEGORICAL_FEATURES

router = APIRouter()

# ─── Global model holder ─────────────────────────────────────────────────────
model = None

def load_model():
    """Load the saved model from disk; auto-retrain if missing or incompatible."""
    global model
    if os.path.exists(MODEL_PATH):
        try:
            model = joblib.load(MODEL_PATH)
            print(f"Model loaded from {MODEL_PATH}")
            return
        except Exception as e:
            print(f"Model load failed ({e}), retraining ...")
    else:
        print("No trained model found, training now ...")
    try:
        run_training()
        model = joblib.load(MODEL_PATH)
        print("Model trained and loaded successfully.")
    except Exception as e:
        model = None
        print(f"Auto-training failed: {e}")

# ─── Feature importance helper ────────────────────────────────────────────────
def extract_feature_importance(pipeline):
    """
    Extract per-feature importance from the trained pipeline and map
    one-hot-encoded columns back to the original base features.
    """
    try:
        preprocessor = pipeline.named_steps["preprocessor"]
        rf = pipeline.named_steps["regressor"]

        encoded_names = list(preprocessor.get_feature_names_out())
        importances = rf.feature_importances_

        base_importance = {}
        for enc_name, imp in zip(encoded_names, importances):
            matched = False
            for col in NUMERIC_FEATURES:
                tag = f"num__{col}"
                if enc_name == tag:
                    base_importance[col] = base_importance.get(col, 0.0) + imp
                    matched = True
                    break
            if matched:
                continue
            for col in CATEGORICAL_FEATURES:
                tag = f"cat__{col}_"
                if enc_name.startswith(tag):
                    base_importance[col] = base_importance.get(col, 0.0) + imp
                    matched = True
                    break
            if not matched:
                base_importance[enc_name] = base_importance.get(enc_name, 0.0) + imp

        sorted_items = sorted(base_importance.items(), key=lambda x: x[1], reverse=True)
        total = sum(v for _, v in sorted_items) or 1.0
        return {k: round(v / total * 100, 2) for k, v in sorted_items}

    except Exception as e:
        print(f"Feature importance extraction failed: {e}")
        return {"info": 0.0}


# ─── Endpoints ────────────────────────────────────────────────────────────────

@router.post("/predict", response_model=PMIResponse)
async def predict_pmi(request: PMIRequest):
    """Predict Postmortem Interval (hours) from 12 forensic features."""
    if model is None:
        raise HTTPException(
            status_code=503,
            detail="Model not loaded. Train the model first via POST /train.",
        )

    try:
        data_dict = request.model_dump(by_alias=True)
        df = pd.DataFrame([data_dict])

        prediction = model.predict(df)[0]

        rf = model.named_steps["regressor"]
        preprocessed = model.named_steps["preprocessor"].transform(df)
        tree_preds = np.array([t.predict(preprocessed)[0] for t in rf.estimators_])
        std_dev = float(np.std(tree_preds))
        mean_pred = float(np.mean(tree_preds))

        if mean_pred > 0:
            cv = std_dev / mean_pred
            confidence = max(0.0, min(100.0, (1 - cv) * 100))
        else:
            confidence = 50.0

        explanation = extract_feature_importance(model)

        return PMIResponse(
            predicted_pmi_hours=round(float(prediction), 1),
            confidence_score=round(confidence, 1),
            explanation=explanation,
            message="Prediction successful.",
        )

    except Exception as e:
        raise HTTPException(status_code=400, detail=f"Prediction error: {e}")

@router.post("/train")
async def train_endpoint(background_tasks: BackgroundTasks):
    """Retrain the model in the background using the CSV on disk."""
    def _train():
        try:
            run_training()
            load_model()
            print("Model retrained and reloaded.")
        except Exception as e:
            print(f"Training failed: {e}")

    background_tasks.add_task(_train)
    return {"message": "Training started in the background. Check server logs for progress."}

# ─── Data Cleaning Module ──────────────────────────────────────────────────
def clean_dataset(df: pd.DataFrame) -> pd.DataFrame:
    df = df.copy()
    fixes = 0

    mask = (df["Putrefaction"] == 0) & (df["Putre_level"].isna())
    n = mask.sum()
    if n > 0:
        df.loc[mask, "Putre_level"] = "None"
        fixes += n

    mask = df["Rigor Mortis"].isna()
    n = mask.sum()
    if n > 0:
        df.loc[mask, "Rigor Mortis"] = "None"
        fixes += n

    mask = df["Livor Mortis"].isna()
    n = mask.sum()
    if n > 0:
        df.loc[mask, "Livor Mortis"] = "None"
        fixes += n

    col = "abdominal cavity"
    if col in df.columns:
        neg = (df[col] < 0).sum()
        if neg > 0:
            df[col] = df[col].clip(lower=0)
            fixes += neg

    print(f"  Total cell-level fixes applied in data cleaning module: {fixes}")
    return df
