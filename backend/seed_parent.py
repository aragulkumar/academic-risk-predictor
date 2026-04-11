import asyncio
from datetime import date, timedelta
from sqlalchemy.ext.asyncio import create_async_engine, async_sessionmaker
from sqlalchemy import select

from app.models.user import User
from app.models.student import Student
from app.models.attendance import AttendanceRecord
from app.models.semester_result import SemesterResult
from app.models.parent_student import ParentStudent
from app.models.assessment import Assessment
from app.models.risk_score import RiskScore
from app.models.intervention import Intervention
from app.core.security import hash_password
from app.core.config import settings

async def seed_parent_data():
    print("Connecting to local SQLite database...")
    engine = create_async_engine(settings.DATABASE_URL)
    AsyncSessionLocal = async_sessionmaker(engine, expire_on_commit=False)
    
    async with AsyncSessionLocal() as db:
        # Find ML Student 5 
        result = await db.execute(select(User).where(User.email == "data_student5@college.edu"))
        student_user = result.scalar_one_or_none()
        
        if not student_user:
            print("Student5 not found. Please run seed_ml_data.py first.")
            return
            
        s_res = await db.execute(select(Student).where(Student.user_id == student_user.id))
        student = s_res.scalar_one_or_none()

        # Find ML Student 6 
        result2 = await db.execute(select(User).where(User.email == "data_student6@college.edu"))
        student_user2 = result2.scalar_one_or_none()
        student2 = None
        if student_user2:
             s_res2 = await db.execute(select(Student).where(Student.user_id == student_user2.id))
             student2 = s_res2.scalar_one_or_none()
             
        # Check if parent already exists
        p_res = await db.execute(select(User).where(User.email == "parent@college.edu"))
        parent = p_res.scalar_one_or_none()
        
        if not parent:
            print("Creating Parent User...")
            parent = User(
                email="parent@college.edu",
                hashed_password=hash_password("parent123"),
                name="John Doe (Parent)",
                role="parent"
            )
            db.add(parent)
            await db.flush()
        
        # Link Parent to Student 1
        link1_res = await db.execute(select(ParentStudent).where(ParentStudent.parent_id == parent.id, ParentStudent.student_id == student.id))
        if not link1_res.scalar_one_or_none():
            db.add(ParentStudent(parent_id=parent.id, student_id=student.id))
            
        # Link Parent to ML Student 5 (so parent has 2 kids)
        if student2:
            link2_res = await db.execute(select(ParentStudent).where(ParentStudent.parent_id == parent.id, ParentStudent.student_id == student2.id))
            if not link2_res.scalar_one_or_none():
                db.add(ParentStudent(parent_id=parent.id, student_id=student2.id))

        # Seed Daily Attendance for Student 1
        print("Seeding Daily Attendance...")
        today = date.today()
        subjects = ["Mathematics", "Physics", "Computer Science"]
        for i in range(5):
            d = today - timedelta(days=i)
            # Student 1 attendance
            if not (await db.execute(select(AttendanceRecord).where(AttendanceRecord.student_id==student.id, AttendanceRecord.date==d))).scalar_one_or_none():
                db.add(AttendanceRecord(student_id=student.id, date=d, subject=subjects[i%3], is_present=(i != 2))) # 1 absent
                
            # Student 2 attendance
            if student2 and not (await db.execute(select(AttendanceRecord).where(AttendanceRecord.student_id==student2.id, AttendanceRecord.date==d))).scalar_one_or_none():
                db.add(AttendanceRecord(student_id=student2.id, date=d, subject=subjects[i%3], is_present=True)) 

        # Seed Semester Results for Student 1
        print("Seeding Semester Results...")
        sem1 = await db.execute(select(SemesterResult).where(SemesterResult.student_id==student.id, SemesterResult.semester==1))
        if not sem1.scalar_one_or_none():
            db.add(SemesterResult(student_id=student.id, semester=1, academic_year="2024", gpa=8.2, total_marks=420, max_marks=500, passed=True, arrears=0))
            
        sem2 = await db.execute(select(SemesterResult).where(SemesterResult.student_id==student.id, SemesterResult.semester==2))
        if not sem2.scalar_one_or_none():
            db.add(SemesterResult(student_id=student.id, semester=2, academic_year="2024", gpa=5.4, total_marks=280, max_marks=500, passed=False, arrears=2, remarks="Needs to clear Math and Physics"))

        await db.commit()
        print("Parent and History Data Seeded Successfully!")
        print("Parent Login: parent@college.edu / parent123")

if __name__ == "__main__":
    asyncio.run(seed_parent_data())
