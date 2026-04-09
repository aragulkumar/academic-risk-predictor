import enum
from datetime import datetime

from sqlalchemy import DateTime, Enum, ForeignKey, String, Text, func
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.core.database import Base


class InterventionType(str, enum.Enum):
    check_in = "check_in"
    resource_sent = "resource_sent"
    counseling_flag = "counseling_flag"
    parent_notified = "parent_notified"
    custom = "custom"


class Intervention(Base):
    __tablename__ = "interventions"

    id: Mapped[int] = mapped_column(primary_key=True, index=True)
    student_id: Mapped[int] = mapped_column(ForeignKey("students.id", ondelete="CASCADE"), index=True)
    mentor_id: Mapped[int] = mapped_column(ForeignKey("users.id"))
    action_type: Mapped[InterventionType] = mapped_column(Enum(InterventionType))
    notes: Mapped[str | None] = mapped_column(Text, nullable=True)
    outcome: Mapped[str | None] = mapped_column(String(255), nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())

    student: Mapped["Student"] = relationship("Student", back_populates="interventions")  # type: ignore[name-defined]
    mentor: Mapped["User"] = relationship("User")  # type: ignore[name-defined]
