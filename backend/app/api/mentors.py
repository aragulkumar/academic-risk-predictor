"""
Mentor API routes — intervention logging, student heatmap data, dashboard summary.
"""

from fastapi import APIRouter, Depends
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.database import get_db
from app.core.security import require_role
from app.models.intervention import Intervention
from app.models.risk_score import RiskScore
from app.models.student import Student
from app.models.user import User
from app.schemas.risk import InterventionCreate, InterventionOut

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
        # Get risk score
        score_result = await db.execute(
            select(RiskScore)
            .where(RiskScore.student_id == s.id)
            .order_by(RiskScore.computed_at.desc())
            .limit(1)
        )
        latest = score_result.scalar_one_or_none()

        # Get Student user details (Name)
        u_res = await db.execute(select(User).where(User.id == s.user_id))
        stu_user = u_res.scalar_one_or_none()

        # Get Parent details
        from app.models.parent_student import ParentStudent
        p_link = await db.execute(select(ParentStudent).where(ParentStudent.student_id == s.id))
        link = p_link.scalar_one_or_none()
        parent_info = None
        if link:
            p_user = await db.execute(select(User).where(User.id == link.parent_id))
            p = p_user.scalar_one_or_none()
            if p:
                parent_info = {"name": p.name, "email": p.email, "phone": p.phone}

        heatmap.append({
            "student_id": s.id,
            "name": stu_user.name if stu_user else "Unknown",
            "roll_number": s.roll_number,
            "department": s.department,
            "semester": s.semester,
            "risk_score": latest.score if latest else None,
            "risk_level": latest.risk_level if latest else "unknown",
            "top_factors": latest.top_factors if latest else "",
            "computed_at": latest.computed_at.isoformat() if latest else None,
            "parent_contact": parent_info
        })

    # Sort by risk score descending
    heatmap.sort(key=lambda x: x["risk_score"] or 0, reverse=True)
    return heatmap

from pydantic import BaseModel
class NotifyParentIn(BaseModel):
    student_id: int
    reason: str

@router.post("/notify-parent", status_code=201)
async def notify_parent(
    payload: NotifyParentIn,
    db: AsyncSession = Depends(get_db),
    current_user: dict = Depends(require_role("admin", "mentor")),
):
    from app.models.parent_student import ParentStudent
    from app.services.alert_service import send_email_alert, send_sms_alert

    # Find the parent
    p_link = await db.execute(select(ParentStudent).where(ParentStudent.student_id == payload.student_id))
    link = p_link.scalar_one_or_none()
    if not link:
        # No parent enrolled—just mock it or return warning
        return {"success": False, "message": "No parent linked to this student to notify."}

    parent = await db.execute(select(User).where(User.id == link.parent_id))
    p = parent.scalar_one_or_none()

    stu = await db.execute(select(Student).where(Student.id == payload.student_id))
    s = stu.scalar_one_or_none()
    s_user = await db.execute(select(User).where(User.id == s.user_id)) if s else None
    s_name = s_user.scalar_one_or_none().name if s_user else "Your child"

    body = f"URGENT: {s_name} is marked as high academic risk due to recent assessments. Details: {payload.reason}. Please contact the department mentor."
    
    # Attempt to send email
    if p and p.email:
        send_email_alert(p.email, f"Academic Alert for {s_name}", body)
    
    # Attempt to send SMS
    if p and p.phone:
        send_sms_alert(p.phone, body)

    # Log the intervention automatically
    intervention = Intervention(
        student_id=payload.student_id,
        mentor_id=current_user["id"],
        action_type="parent_notified",
        notes=f"Automated notification sent to parent ({p.name}). Reason: {payload.reason}",
        status="completed"
    )
    db.add(intervention)
    await db.commit()

    return {"success": True, "message": f"Alert sent to {p.name} successfully."}

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
