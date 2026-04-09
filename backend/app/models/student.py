from datetime import datetime

from sqlalchemy import DateTime, ForeignKey, Integer, String, func
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.core.database import Base


class Student(Base):
    __tablename__ = "students"

    id: Mapped[int] = mapped_column(primary_key=True, index=True)
    user_id: Mapped[int] = mapped_column(ForeignKey("users.id", ondelete="CASCADE"), unique=True)
    mentor_id: Mapped[int | None] = mapped_column(ForeignKey("users.id"), nullable=True)
    roll_number: Mapped[str] = mapped_column(String(30), unique=True, index=True)
    department: Mapped[str] = mapped_column(String(100))
    semester: Mapped[int] = mapped_column(Integer)
    batch_year: Mapped[int] = mapped_column(Integer)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())

    # Relationships
    user: Mapped["User"] = relationship("User", foreign_keys=[user_id])  # type: ignore[name-defined]
    mentor: Mapped["User | None"] = relationship("User", foreign_keys=[mentor_id])  # type: ignore[name-defined]
    assessments: Mapped[list["Assessment"]] = relationship("Assessment", back_populates="student")  # type: ignore[name-defined]
    risk_scores: Mapped[list["RiskScore"]] = relationship("RiskScore", back_populates="student")  # type: ignore[name-defined]
    interventions: Mapped[list["Intervention"]] = relationship("Intervention", back_populates="student")  # type: ignore[name-defined]
