"""
Admin API routes — user management, institution data, role assignment.
"""

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.database import get_db
from app.core.security import hash_password, require_role
from app.models.user import User
from app.schemas.user import UserCreate, UserOut, UserUpdate

router = APIRouter(prefix="/api/admin", tags=["admin"])


@router.get("/users", response_model=list[UserOut])
async def list_users(
    db: AsyncSession = Depends(get_db),
    _: dict = Depends(require_role("admin")),
):
    result = await db.execute(select(User).order_by(User.created_at.desc()))
    return result.scalars().all()


@router.post("/users", response_model=UserOut, status_code=201)
async def create_user(
    payload: UserCreate,
    db: AsyncSession = Depends(get_db),
    _: dict = Depends(require_role("admin")),
):
    existing = await db.execute(select(User).where(User.email == payload.email))
    if existing.scalar_one_or_none():
        raise HTTPException(status_code=400, detail="Email already exists")

    user = User(
        name=payload.name,
        email=payload.email,
        hashed_password=hash_password(payload.password),
        role=payload.role,
        phone=payload.phone,
    )
    db.add(user)
    await db.commit()
    await db.refresh(user)
    return user


@router.patch("/users/{user_id}", response_model=UserOut)
async def update_user(
    user_id: int,
    payload: UserUpdate,
    db: AsyncSession = Depends(get_db),
    _: dict = Depends(require_role("admin")),
):
    result = await db.execute(select(User).where(User.id == user_id))
    user = result.scalar_one_or_none()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")

    for field, value in payload.model_dump(exclude_none=True).items():
        setattr(user, field, value)

    await db.commit()
    await db.refresh(user)
    return user


@router.delete("/users/{user_id}", status_code=204)
async def delete_user(
    user_id: int,
    db: AsyncSession = Depends(get_db),
    _: dict = Depends(require_role("admin")),
):
    result = await db.execute(select(User).where(User.id == user_id))
    user = result.scalar_one_or_none()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    await db.delete(user)
    await db.commit()


@router.get("/stats")
async def institution_stats(
    db: AsyncSession = Depends(get_db),
    _: dict = Depends(require_role("admin")),
):
    from sqlalchemy import func
    from app.models.student import Student
    from app.models.risk_score import RiskScore

    total_users = (await db.execute(select(func.count(User.id)))).scalar()
    total_students = (await db.execute(select(func.count(Student.id)))).scalar()
    total_scores = (await db.execute(select(func.count(RiskScore.id)))).scalar()
    avg_score = (await db.execute(select(func.avg(RiskScore.score)))).scalar()

    return {
        "total_users": total_users,
        "total_students": total_students,
        "risk_scores_computed": total_scores,
        "average_risk_score": round(float(avg_score or 0), 1),
    }

class EnrollmentIn(BaseModel):
    # Student details
    student_name: str
    student_email: str
    student_password: str
    roll_number: str
    department: str
    semester: int
    batch_year: int
    # Parent details
    parent_name: str
    parent_email: str
    parent_phone: str
    parent_password: str

@router.post("/enroll-student", status_code=201)
async def enroll_student(
    payload: EnrollmentIn,
    db: AsyncSession = Depends(get_db),
    _: dict = Depends(require_role("admin")),
):
    from app.models.student import Student
    from app.models.parent_student import ParentStudent

    # 1. Create Student User
    existing_stu = await db.execute(select(User).where(User.email == payload.student_email))
    if existing_stu.scalar_one_or_none():
        raise HTTPException(status_code=400, detail="Student email already exists")

    stu_user = User(
        name=payload.student_name,
        email=payload.student_email,
        hashed_password=hash_password(payload.student_password),
        role="student"
    )
    db.add(stu_user)
    await db.flush()

    # 2. Create Student Profile
    student = Student(
        user_id=stu_user.id,
        roll_number=payload.roll_number,
        department=payload.department,
        semester=payload.semester,
        batch_year=payload.batch_year
    )
    db.add(student)
    await db.flush()

    # 3. Handle Parent User
    parent_res = await db.execute(select(User).where(User.email == payload.parent_email))
    parent_user = parent_res.scalar_one_or_none()

    if not parent_user:
        parent_user = User(
            name=payload.parent_name,
            email=payload.parent_email,
            phone=payload.parent_phone,
            hashed_password=hash_password(payload.parent_password),
            role="parent"
        )
        db.add(parent_user)
        await db.flush()

    # 4. Link Parent and Student
    link = ParentStudent(parent_id=parent_user.id, student_id=student.id)
    db.add(link)

    await db.commit()
    return {"message": "Enrollment successful", "student_user_id": stu_user.id, "student_id": student.id}
