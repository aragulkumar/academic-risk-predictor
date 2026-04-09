"""
Student API routes — CRUD for student profiles, assessments, and risk scores.
"""

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.database import get_db
from app.core.security import get_current_user, require_role
from app.models.assessment import Assessment
from app.models.risk_score import RiskScore
from app.models.student import Student
from app.schemas.risk import AssessmentOut, RiskScoreOut
from app.schemas.student import AssessmentCreate, StudentCreate, StudentOut
from app.services.risk_service import compute_and_save_risk

router = APIRouter(prefix="/api/students", tags=["students"])


@router.post("/", response_model=StudentOut, status_code=status.HTTP_201_CREATED)
async def create_student(
    payload: StudentCreate,
    db: AsyncSession = Depends(get_db),
    _: dict = Depends(require_role("admin", "mentor")),
):
    student = Student(**payload.model_dump())
    db.add(student)
    await db.commit()
    await db.refresh(student)
    return student


@router.get("/", response_model=list[StudentOut])
async def list_students(
    db: AsyncSession = Depends(get_db),
    current_user: dict = Depends(require_role("admin", "mentor")),
):
    if current_user["role"] == "mentor":
        result = await db.execute(
            select(Student).where(Student.mentor_id == current_user["id"])
        )
    else:
        result = await db.execute(select(Student))
    return result.scalars().all()


@router.get("/{student_id}", response_model=StudentOut)
async def get_student(
    student_id: int,
    db: AsyncSession = Depends(get_db),
    current_user: dict = Depends(get_current_user),
):
    result = await db.execute(select(Student).where(Student.id == student_id))
    student = result.scalar_one_or_none()
    if not student:
        raise HTTPException(status_code=404, detail="Student not found")

    # Students can only view themselves
    if current_user["role"] == "student" and student.user_id != current_user["id"]:
        raise HTTPException(status_code=403, detail="Access denied")

    return student


@router.post("/{student_id}/assessments", response_model=AssessmentOut, status_code=201)
async def add_assessment(
    student_id: int,
    payload: AssessmentCreate,
    db: AsyncSession = Depends(get_db),
    _: dict = Depends(require_role("admin", "mentor")),
):
    payload.student_id = student_id
    assessment = Assessment(**payload.model_dump())
    db.add(assessment)
    await db.commit()
    await db.refresh(assessment)
    return assessment


@router.get("/{student_id}/assessments", response_model=list[AssessmentOut])
async def get_assessments(
    student_id: int,
    db: AsyncSession = Depends(get_db),
    _: dict = Depends(get_current_user),
):
    result = await db.execute(
        select(Assessment).where(Assessment.student_id == student_id).order_by(Assessment.recorded_at.desc())
    )
    return result.scalars().all()


@router.post("/{student_id}/predict", response_model=RiskScoreOut, status_code=201)
async def trigger_risk_prediction(
    student_id: int,
    db: AsyncSession = Depends(get_db),
    _: dict = Depends(require_role("admin", "mentor")),
):
    """Manually trigger ML risk prediction for a student."""
    try:
        return await compute_and_save_risk(student_id, db)
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))


@router.get("/{student_id}/risk-scores", response_model=list[RiskScoreOut])
async def get_risk_scores(
    student_id: int,
    db: AsyncSession = Depends(get_db),
    _: dict = Depends(get_current_user),
):
    result = await db.execute(
        select(RiskScore).where(RiskScore.student_id == student_id).order_by(RiskScore.computed_at.desc())
    )
    return result.scalars().all()
