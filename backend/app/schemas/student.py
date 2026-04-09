from datetime import datetime

from pydantic import BaseModel


class StudentCreate(BaseModel):
    user_id: int
    mentor_id: int | None = None
    roll_number: str
    department: str
    semester: int
    batch_year: int


class StudentOut(BaseModel):
    id: int
    user_id: int
    mentor_id: int | None
    roll_number: str
    department: str
    semester: int
    batch_year: int
    created_at: datetime

    model_config = {"from_attributes": True}


class AssessmentCreate(BaseModel):
    student_id: int
    subject: str
    semester: int
    attendance_pct: float
    internal_marks: float
    assignment_submission_rate: float
    external_marks: float | None = None


class AssessmentOut(AssessmentCreate):
    id: int
    recorded_at: datetime

    model_config = {"from_attributes": True}
