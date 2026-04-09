"""
Mentor API routes — intervention logging, student heatmap data, dashboard summary.
"""

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.database import get_db
from app.core.security import require_role
from app.models.intervention import Intervention
from app.models.risk_score import RiskScore
from app.models.student import Student
from app.schemas.risk import InterventionCreate, InterventionOut, RiskScoreOut

router = APIRouter(prefix="/api/mentors", tags=["mentors"])


@router.get("/heatmap")
async def get_heatmap(
    db: AsyncSession = Depends(get_db),
    current_user: dict = Depends(require_role("admin", "mentor")),
):
    """Returns latest risk score for every student this mentor owns."""
    # Fetch mentor's students
    student_result = await db.execute(
        select(Student).where(Student.mentor_id == current_user["id"])
    )
    students = student_result.scalars().all()

    heatmap = []
    for s in students:
        score_result = await db.execute(
            select(RiskScore)
            .where(RiskScore.student_id == s.id)
            .order_by(RiskScore.computed_at.desc())
            .limit(1)
        )
        latest = score_result.scalar_one_or_none()
        heatmap.append({
            "student_id": s.id,
            "roll_number": s.roll_number,
            "department": s.department,
            "semester": s.semester,
            "risk_score": latest.score if latest else None,
            "risk_level": latest.risk_level if latest else "unknown",
            "top_factors": latest.top_factors if latest else "",
            "computed_at": latest.computed_at.isoformat() if latest else None,
        })

    # Sort by risk score descending
    heatmap.sort(key=lambda x: x["risk_score"] or 0, reverse=True)
    return heatmap


@router.post("/interventions", response_model=InterventionOut, status_code=201)
async def log_intervention(
    payload: InterventionCreate,
    db: AsyncSession = Depends(get_db),
    current_user: dict = Depends(require_role("admin", "mentor")),
):
    intervention = Intervention(
        **payload.model_dump(),
        mentor_id=current_user["id"],
    )
    db.add(intervention)
    await db.commit()
    await db.refresh(intervention)
    return intervention


@router.get("/interventions/{student_id}", response_model=list[InterventionOut])
async def get_student_interventions(
    student_id: int,
    db: AsyncSession = Depends(get_db),
    _: dict = Depends(require_role("admin", "mentor")),
):
    result = await db.execute(
        select(Intervention)
        .where(Intervention.student_id == student_id)
        .order_by(Intervention.created_at.desc())
    )
    return result.scalars().all()


@router.get("/dashboard/summary")
async def mentor_dashboard_summary(
    db: AsyncSession = Depends(get_db),
    current_user: dict = Depends(require_role("admin", "mentor")),
):
    """Aggregate stats for the mentor's dashboard header."""
    student_result = await db.execute(
        select(Student).where(Student.mentor_id == current_user["id"])
    )
    students = student_result.scalars().all()
    total = len(students)

    at_risk = critical = 0
    for s in students:
        r = await db.execute(
            select(RiskScore)
            .where(RiskScore.student_id == s.id)
            .order_by(RiskScore.computed_at.desc())
            .limit(1)
        )
        latest = r.scalar_one_or_none()
        if latest:
            if latest.risk_level in ("high", "critical"):
                at_risk += 1
            if latest.risk_level == "critical":
                critical += 1

    return {
        "total_students": total,
        "at_risk_count": at_risk,
        "critical_count": critical,
        "safe_count": total - at_risk,
    }
