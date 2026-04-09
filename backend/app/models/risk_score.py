from datetime import datetime

from sqlalchemy import DateTime, Float, ForeignKey, String, Text, func
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.core.database import Base

from typing import TYPE_CHECKING
if TYPE_CHECKING:
    from app.models.student import Student


class RiskScore(Base):
    __tablename__ = "risk_scores"

    id: Mapped[int] = mapped_column(primary_key=True, index=True)
    student_id: Mapped[int] = mapped_column(ForeignKey("students.id", ondelete="CASCADE"), index=True)

    # 0-100 composite risk score
    score: Mapped[float] = mapped_column(Float)

    # Human-readable SHAP explanation (JSON string)
    explanation: Mapped[str] = mapped_column(Text)

    # Top contributing factors summary
    top_factors: Mapped[str] = mapped_column(Text)

    # Risk tier
    risk_level: Mapped[str] = mapped_column(String(20))  # low / medium / high / critical

    computed_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())

    student: Mapped["Student"] = relationship("Student", back_populates="risk_scores")  # type: ignore[name-defined]
