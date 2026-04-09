"""
Risk Service — aggregates student assessment data, runs ML prediction,
persists risk score to DB, and triggers alerts if above threshold.
"""

from __future__ import annotations

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.ml.predictor import predict
from app.models.assessment import Assessment
from app.models.risk_score import RiskScore
from app.models.student import Student


async def compute_and_save_risk(student_id: int, db: AsyncSession) -> RiskScore:
    """
    Aggregates latest assessment data for a student, predicts risk,
    saves to DB, and returns the new RiskScore record.
    """
    # Fetch latest assessment stats
    result = await db.execute(
        select(Assessment)
        .where(Assessment.student_id == student_id)
        .order_by(Assessment.recorded_at.desc())
        .limit(10)
    )
    assessments = result.scalars().all()

    if not assessments:
        raise ValueError(f"No assessments found for student {student_id}")

    # Aggregate across subjects
    avg_attendance = sum(a.attendance_pct for a in assessments) / len(assessments)
    avg_marks = sum(a.internal_marks for a in assessments) / len(assessments)
    avg_submission = sum(a.assignment_submission_rate for a in assessments) / len(assessments)
    semester = assessments[0].semester

    # Trend: compare first half vs second half if enough records
    mid = len(assessments) // 2
    if mid > 0:
        recent_att = sum(a.attendance_pct for a in assessments[:mid]) / mid
        older_att = sum(a.attendance_pct for a in assessments[mid:]) / (len(assessments) - mid)
        att_trend = recent_att - older_att

        recent_marks = sum(a.internal_marks for a in assessments[:mid]) / mid
        older_marks = sum(a.internal_marks for a in assessments[mid:]) / (len(assessments) - mid)
        marks_trend = recent_marks - older_marks
    else:
        att_trend = 0.0
        marks_trend = 0.0

    prediction = predict(
        attendance_pct=avg_attendance,
        internal_marks=avg_marks,
        assignment_submission_rate=avg_submission,
        semester=semester,
        attendance_trend=att_trend,
        marks_trend=marks_trend,
    )

    risk = RiskScore(
        student_id=student_id,
        score=prediction["risk_score"],
        explanation=prediction["explanation"],
        top_factors=prediction["top_factors"],
        risk_level=prediction["risk_level"],
    )
    db.add(risk)
    await db.commit()
    await db.refresh(risk)

    # Trigger alert (handled separately)
    from app.services.alert_service import maybe_send_alert  # avoid circular
    student_result = await db.execute(select(Student).where(Student.id == student_id))
    student = student_result.scalar_one_or_none()
    if student:
        await maybe_send_alert(student, risk, db)

    return risk
