from datetime import datetime

from pydantic import BaseModel


class RiskScoreOut(BaseModel):
    id: int
    student_id: int
    score: float
    explanation: str
    top_factors: str
    risk_level: str
    computed_at: datetime

    model_config = {"from_attributes": True}


class InterventionCreate(BaseModel):
    student_id: int
    action_type: str
    notes: str | None = None
    outcome: str | None = None


class InterventionOut(InterventionCreate):
    id: int
    mentor_id: int
    created_at: datetime

    model_config = {"from_attributes": True}
