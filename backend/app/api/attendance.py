"""
Attendance API — Mentors/Admin mark daily attendance.
Parents and students can view it.
"""
from datetime import date
from typing import Any

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.database import get_db
from app.core.security import get_current_user, require_role
from app.models.attendance import AttendanceRecord
from app.models.student import Student

router = APIRouter(prefix="/api/attendance", tags=["attendance"])


class AttendanceIn(BaseModel):
    student_id: int
    date: date
    subject: str
    is_present: bool = True


class BulkAttendanceIn(BaseModel):
    date: date
    subject: str
    records: list[dict]  # [{"student_id": 1, "is_present": True}, ...]


# ── Mark single attendance ────────────────────────────────


@router.post("/", status_code=201)
async def mark_attendance(
    payload: AttendanceIn,
    db: AsyncSession = Depends(get_db),
    current_user: dict = Depends(require_role("admin", "mentor")),
) -> dict:
    # Check if already marked for this date/subject
    existing = await db.execute(
        select(AttendanceRecord).where(
            AttendanceRecord.student_id == payload.student_id,
            AttendanceRecord.date == payload.date,
            AttendanceRecord.subject == payload.subject,
        )
    )
    record = existing.scalar_one_or_none()

    if record:
        # Update existing
        record.is_present = payload.is_present
        record.recorded_by = current_user["id"]
    else:
        record = AttendanceRecord(
            student_id=payload.student_id,
            date=payload.date,
            subject=payload.subject,
            is_present=payload.is_present,
            recorded_by=current_user["id"],
        )
        db.add(record)

    await db.commit()
    return {
        "message": "Attendance recorded",
        "student_id": payload.student_id,
        "date": payload.date.isoformat(),
        "subject": payload.subject,
        "is_present": payload.is_present,
    }


# ── Mark bulk attendance for entire class ─────────────────


@router.post("/bulk", status_code=201)
async def bulk_mark_attendance(
    payload: BulkAttendanceIn,
    db: AsyncSession = Depends(get_db),
    current_user: dict = Depends(require_role("admin", "mentor")),
) -> dict:
    saved = 0
    for item in payload.records:
        sid = item.get("student_id")
        present = item.get("is_present", True)

        existing = await db.execute(
            select(AttendanceRecord).where(
                AttendanceRecord.student_id == sid,
                AttendanceRecord.date == payload.date,
                AttendanceRecord.subject == payload.subject,
            )
        )
        record = existing.scalar_one_or_none()
        if record:
            record.is_present = present
        else:
            record = AttendanceRecord(
                student_id=sid,
                date=payload.date,
                subject=payload.subject,
                is_present=present,
                recorded_by=current_user["id"],
            )
            db.add(record)
        saved += 1

    await db.commit()
    return {"message": f"Attendance marked for {saved} students", "date": payload.date.isoformat()}


# ── Get attendance for a student (mentor/admin/student/parent) ─


@router.get("/student/{student_id}")
async def get_attendance(
    student_id: int,
    db: AsyncSession = Depends(get_db),
    current_user: dict = Depends(get_current_user),
) -> list[dict[str, Any]]:
    # Students can only see their own
    if current_user["role"] == "student":
        s = await db.execute(select(Student).where(Student.user_id == current_user["id"]))
        student = s.scalar_one_or_none()
        if not student or student.id != student_id:
            raise HTTPException(status_code=403, detail="Access denied")

    result = await db.execute(
        select(AttendanceRecord)
        .where(AttendanceRecord.student_id == student_id)
        .order_by(AttendanceRecord.date.desc())
        .limit(60)
    )
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
