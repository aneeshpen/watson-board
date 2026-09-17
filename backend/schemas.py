from pydantic import BaseModel, Field
from typing import Dict, Any

class PMIRequest(BaseModel):
    Age: float = Field(..., alias="Age")
    Sex: str = Field(..., alias="Sex")
    Height: float = Field(..., alias="Height")
    Weight: float = Field(..., alias="Weight")
    Putrefaction: int = Field(..., alias="Putrefaction")
    Putre_level: str = Field(..., alias="Putre_level")
    Rigor_Mortis: str = Field(..., alias="Rigor Mortis")
    Livor_Mortis: str = Field(..., alias="Livor Mortis")
    Algor_Mortis: float = Field(..., alias="Algor Mortis")
    Stomach_Contents: str = Field(..., alias="Stomach Contents")
    Vitreous_Potassium: float = Field(..., alias="Vitreous Potassium")
    Entomology: str = Field(..., alias="Entomology")

class PMIResponse(BaseModel):
    predicted_pmi_hours: float
    confidence_score: float
    explanation: Dict[str, Any]
    message: str
