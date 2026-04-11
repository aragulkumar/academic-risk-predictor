"""
Parent API — Parents can view their linked students' attendance,
exam results, semester results, and current risk level.
"""
from datetime import date
from typing import Any

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.database import get_db
from app.core.security import get_current_user, require_role
from app.models.assessment import Assessment
from app.models.attendance import AttendanceRecord
from app.models.parent_student import ParentStudent
from app.models.risk_score import RiskScore
from app.models.semester_result import SemesterResult
from app.models.student import Student
from app.models.user import User

router = APIRouter(prefix="/api/parents", tags=["parents"])


async def _get_linked_student(
    student_id: int, parent_id: int, db: AsyncSession
) -> Student:
    """Fetch a student only if linked to this parent."""
    result = await db.execute(
        select(ParentStudent).where(
            ParentStudent.parent_id == parent_id,
            ParentStudent.student_id == student_id,
        )
    )
    link = result.scalar_one_or_none()
    if not link:
        raise HTTPException(status_code=403, detail="Not linked to this student")
    result2 = await db.execute(select(Student).where(Student.id == student_id))
    s = result2.scalar_one_or_none()
    if not s:
        raise HTTPException(status_code=404, detail="Student not found")
    return s


# ── My Children ──────────────────────────────────────────


@router.get("/my-students")
async def get_my_students(
    db: AsyncSession = Depends(get_db),
    current_user: dict = Depends(require_role("parent")),
) -> list[dict[str, Any]]:
    """Get all students linked to this parent."""
    result = await db.execute(
        select(ParentStudent).where(ParentStudent.parent_id == current_user["id"])
    )
    links = result.scalars().all()

    out = []
    for link in links:
        s_res = await db.execute(select(Student).where(Student.id == link.student_id))
        student = s_res.scalar_one_or_none()
        if not student:
            continue
        u_res = await db.execute(select(User).where(User.id == student.user_id))
        user = u_res.scalar_one_or_none()

        # latest risk score
        rr = await db.execute(
            select(RiskScore)
            .where(RiskScore.student_id == student.id)
            .order_by(RiskScore.computed_at.desc())
            .limit(1)
        )
        risk = rr.scalar_one_or_none()

        out.append({
            "student_id": student.id,
            "name": user.name if user else "Unknown",
            "roll_number": student.roll_number,
            "department": student.department,
            "semester": student.semester,
            "risk_score": risk.score if risk else None,
            "risk_level": risk.risk_level if risk else "unknown",
        })
    return out


# ── Daily Attendance ──────────────────────────────────────


@router.get("/students/{student_id}/attendance")
async def get_student_attendance(
    student_id: int,
    month: int | None = None,
    year: int | None = None,
    db: AsyncSession = Depends(get_db),
    current_user: dict = Depends(require_role("parent")),
) -> list[dict[str, Any]]:
    """Daily attendance records. Optionally filter by month/year."""
    await _get_linked_student(student_id, current_user["id"], db)

    query = select(AttendanceRecord).where(AttendanceRecord.student_id == student_id)
    if month and year:
        from sqlalchemy import extract
        query = query.where(
            extract("month", AttendanceRecord.date) == month,
            extract("year", AttendanceRecord.date) == year,
        )
    query = query.order_by(AttendanceRecord.date.desc())

    result = await db.execute(query)
    records = result.scalars().all()

    return [
        {
            "id": r.id,
            "date": r.date.isoformat(),
            "subject": r.subject,
            "is_present": r.is_present,
            "status": "Present ✅" if r.is_present else "Absent ❌",
        }
        for r in records
    ]


# ── Internal Exam Results ─────────────────────────────────


@router.get("/students/{student_id}/assessments")
async def get_student_assessments(
    student_id: int,
    db: AsyncSession = Depends(get_db),
    current_user: dict = Depends(require_role("parent")),
) -> list[dict[str, Any]]:
    """Recent internal exam marks for a student."""
    await _get_linked_student(student_id, current_user["id"], db)

    result = await db.execute(
        select(Assessment)
        .where(Assessment.student_id == student_id)
        .order_by(Assessment.recorded_at.desc())
        .limit(20)
    )
    assessments = result.scalars().all()

    return [
        {
            "id": a.id,
            "subject": a.subject,
            "semester": a.semester,
            "attendance_pct": round(a.attendance_pct, 1),
            "internal_marks": round(a.internal_marks, 1),
            "assignment_submission_rate": round(a.assignment_submission_rate, 1),
            "external_marks": a.external_marks,
            "grade": _grade(a.internal_marks),
            "recorded_at": a.recorded_at.isoformat(),
        }
        for a in assessments
    ]


# ── Semester Results ──────────────────────────────────────


@router.get("/students/{student_id}/semester-results")
async def get_semester_results(
    student_id: int,
    db: AsyncSession = Depends(get_db),
    current_user: dict = Depends(require_role("parent")),
) -> list[dict[str, Any]]:
    """Semester pass/fail results for a student."""
    await _get_linked_student(student_id, current_user["id"], db)

    result = await db.execute(
        select(SemesterResult)
        .where(SemesterResult.student_id == student_id)
        .order_by(SemesterResult.semester.desc())
    )
    results = result.scalars().all()

    return [
        {
            "id": r.id,
            "semester": r.semester,
            "academic_year": r.academic_year,
            "gpa": r.gpa,
            "total_marks": r.total_marks,
            "max_marks": r.max_marks,
            "passed": r.passed,
            "arrears": r.arrears,
            "status": "PASSED ✅" if r.passed else f"FAILED ❌ ({r.arrears} arrears)",
            "remarks": r.remarks,
            "recorded_at": r.recorded_at.isoformat(),
        }
        for r in results
    ]


# ── Risk Summary ──────────────────────────────────────────


@router.get("/students/{student_id}/risk")
async def get_student_risk(
    student_id: int,
    db: AsyncSession = Depends(get_db),
    current_user: dict = Depends(require_role("parent")),
) -> dict[str, Any]:
    """Current risk score and explanation for a student."""
    await _get_linked_student(student_id, current_user["id"], db)

    result = await db.execute(
        select(RiskScore)
        .where(RiskScore.student_id == student_id)
        .order_by(RiskScore.computed_at.desc())
        .limit(1)
    )
    risk = result.scalar_one_or_none()

    if not risk:
        return {"message": "No risk data available yet"}

    return {
        "score": risk.score,
        "risk_level": risk.risk_level,
        "top_factors": risk.top_factors,
        "computed_at": risk.computed_at.isoformat(),
        "advice": _advice(risk.risk_level),
    }


# ── Helpers ───────────────────────────────────────────────

def _grade(marks: float) -> str:
    if marks >= 90: return "O (Outstanding)"
    if marks >= 80: return "A+ (Excellent)"
    if marks >= 70: return "A (Very Good)"
    if marks >= 60: return "B+ (Good)"
    if marks >= 50: return "B (Average)"
    if marks >= 40: return "C (Pass)"
    return "F (Fail)"


def _advice(level: str) -> str:
    return {
        "low":      "Your child is performing well. Encourage them to keep it up!",
        "medium":   "Your child needs attention. Please check their attendance and study habits.",
        "high":     "Your child is at HIGH risk. Please meet with their mentor urgently.",
        "critical": "CRITICAL: Your child may fail. Immediate intervention required.",
    }.get(level, "No data available yet.")
