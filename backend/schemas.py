"""
Request/response models for the PMI prediction API.

The categorical fields are constrained to the exact vocabulary the model was
trained on. Previously every categorical was a bare `str`; combined with
OneHotEncoder(handle_unknown="ignore") that meant `Sex="banana"` produced an
all-zero one-hot block and returned a confident prediction with HTTP 200.
Invalid input now fails loudly with a 422 listing the permitted values.
"""

from __future__ import annotations

from enum import Enum
from typing import Any

from pydantic import BaseModel, Field


class Sex(str, Enum):
    FEMALE = "Female"
    MALE = "Male"
    OTHER = "Other"
    UNKNOWN = "Unknown"


class PutrefactionLevel(str, Enum):
    NONE = "None"
    MILD = "Mild"
    MODERATE = "Moderate"
    ADVANCED = "Advanced"
    SEVERE = "Severe"


class RigorMortis(str, Enum):
    NONE = "None"
    BEGINNING = "Beginning (jaw/neck)"
    DEVELOPING = "Developing"
    FULL_FIXED = "Full/Fixed"
    RESOLVING = "Resolving"
    RESOLVED = "Resolved"


class LivorMortis(str, Enum):
    NONE = "None"
    DEVELOPING_FAINT = "Developing (faint)"
    FAINT_POSTERIOR = "Faint posterior"
    FIXED_DEPENDENT = "Fixed (dependent areas)"
    PRONOUNCED = "Pronounced (fixed posterior)"


class StomachContents(str, Enum):
    UNDIGESTED = "Undigested food (recent meal)"
    PARTIALLY_DIGESTED = "Partially digested"
    MINIMAL_RESIDUE = "Minimal residue"
    FULLY_DIGESTED = "Fully digested"
    EMPTY = "Empty"
    UNKNOWN = "Unknown"


class Entomology(str, Enum):
    NONE = "No insects present"
    EGGS = "Eggs only"
    FIRST_INSTAR = "1st instar larvae"
    SECOND_INSTAR = "2nd instar larvae"


class PMIRequest(BaseModel):
    """
    Forensic indicators used to estimate the post-mortem interval.

    Note: Vitreous Potassium is intentionally NOT an input — it defines the
    training label, so accepting it would reintroduce target leakage. See the
    design note in `train_model.py`.
    """

    Age: float = Field(..., ge=0, le=130, description="Age in years")
    Sex: Sex
    Height: float = Field(..., ge=0, le=280, description="Height in cm")
    Weight: float = Field(..., ge=0, le=500, description="Weight in kg")
    Putrefaction: int = Field(..., ge=0, le=1, description="0 = absent, 1 = present")
    Putre_level: PutrefactionLevel = Field(..., alias="Putre_level")
    Rigor_Mortis: RigorMortis = Field(..., alias="Rigor Mortis")
    Livor_Mortis: LivorMortis = Field(..., alias="Livor Mortis")
    Algor_Mortis: float = Field(
        ..., ge=0, le=45, alias="Algor Mortis", description="Body temperature in °C"
    )
    Stomach_Contents: StomachContents = Field(..., alias="Stomach Contents")
    Entomology: Entomology

    model_config = {
        "populate_by_name": True,
        "json_schema_extra": {
            "example": {
                "Age": 34,
                "Sex": "Male",
                "Height": 172,
                "Weight": 68,
                "Putrefaction": 0,
                "Putre_level": "None",
                "Rigor Mortis": "Developing",
                "Livor Mortis": "Fixed (dependent areas)",
                "Algor Mortis": 20.4,
                "Stomach Contents": "Partially digested",
                "Entomology": "No insects present",
            }
        },
    }

    def to_feature_row(self) -> dict[str, Any]:
        """Flatten to the exact column names the trained pipeline expects."""
        raw = self.model_dump(by_alias=True)
        return {k: (v.value if isinstance(v, Enum) else v) for k, v in raw.items()}


class FeatureContribution(BaseModel):
    feature: str
    value: Any
    contribution_hours: float = Field(
        ..., description="Signed SHAP contribution of this feature, in hours"
    )


class PMIResponse(BaseModel):
    predicted_pmi_hours: float
    confidence_interval_hours: list[float] = Field(
        ..., description="[low, high] from the spread across forest trees"
    )
    confidence_score: float
    contributions: list[FeatureContribution] = Field(
        ...,
        description=(
            "Per-prediction SHAP values — how THIS input moved the estimate away "
            "from the dataset mean. Not global feature importance."
        ),
    )
    baseline_hours: float = Field(..., description="Model's mean output (SHAP base value)")
    message: str
    disclaimer: str = (
        "Proxy estimate for investigative triage only. Not a forensic determination."
    )
