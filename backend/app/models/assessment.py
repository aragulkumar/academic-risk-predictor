from datetime import datetime

from sqlalchemy import DateTime, Float, ForeignKey, Integer, String, func
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.core.database import Base


class Assessment(Base):
    __tablename__ = "assessments"

    id: Mapped[int] = mapped_column(primary_key=True, index=True)
    student_id: Mapped[int] = mapped_column(ForeignKey("students.id", ondelete="CASCADE"), index=True)
    subject: Mapped[str] = mapped_column(String(120))
    semester: Mapped[int] = mapped_column(Integer)

    # Attendance (0-100 %)
    attendance_pct: Mapped[float] = mapped_column(Float)

    # Internal marks (0-100)
    internal_marks: Mapped[float] = mapped_column(Float)

    # Assignment submission rate (0-100 %)
    assignment_submission_rate: Mapped[float] = mapped_column(Float)

    # External / end-semester marks (optional, filled later)
    external_marks: Mapped[float | None] = mapped_column(Float, nullable=True)

    recorded_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())

    student: Mapped["Student"] = relationship("Student", back_populates="assessments")  # type: ignore[name-defined]
