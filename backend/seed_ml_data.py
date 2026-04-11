import asyncio
import pandas as pd
from sqlalchemy.ext.asyncio import create_async_engine, async_sessionmaker
from sqlalchemy import select

from app.models.user import User
from app.models.student import Student
from app.models.assessment import Assessment
from app.core.security import hash_password
from app.core.config import settings
from app.services.risk_service import compute_and_save_risk
from app.models import assessment, intervention, risk_score, student, user

async def seed_ml_data():
    print("Connecting to local SQLite database...")
    engine = create_async_engine(settings.DATABASE_URL)
    AsyncSessionLocal = async_sessionmaker(engine, expire_on_commit=False)
    
    async with AsyncSessionLocal() as db:
        # Load the Mentor ID
        result = await db.execute(select(User).where(User.email == "mentor@college.edu"))
        mentor = result.scalar_one_or_none()
        
        if not mentor:
            print("⚠️ Error: Mentor account not found. Please run seed_sqlite.py first!")
            return

        print("Loading trained data from ml/data/synthetic_students.csv...")
        df = pd.read_csv("../ml/data/synthetic_students.csv")
        
        # We will take the first 40 rows to populate the mentor dashboard richly
        subset = df.head(40)
        
        print(f"Inserting {len(subset)} students into the database...")
        for index, row in subset.iterrows():
            idx = index + 5  # offset logic for unique emails
            
            # Create User Account
            student_user = User(
                email=f"data_student{idx}@college.edu",
                hashed_password=hash_password("password123"),
                name=f"Student {idx:02d}",
                role="student"
            )
            db.add(student_user)
            await db.flush()  # to get student_user.id
            
            # Create Student Profile
            student_profile = Student(
                user_id=student_user.id,
                mentor_id=mentor.id,
                roll_number=f"ML2024{idx:03d}",
                department="Computer Science",
                semester=int(row['semester']),
                batch_year=2024
            )
            db.add(student_profile)
            await db.flush()
            
            # Create Assessment from the ML data
            assess = Assessment(
                student_id=student_profile.id,
                subject="Core Subjects",
                semester=int(row['semester']),
                attendance_pct=float(row['attendance_pct']),
                internal_marks=float(row['internal_marks']),
                assignment_submission_rate=float(row['assignment_submission_rate'])
            )
            db.add(assess)
            await db.commit()
            
            print(f"[{index+1}/40] Predict and Saving Risk for Student {idx:02d}")
            # Trigger the ML Model perfectly mimicking the real-time pipeline!
            await compute_and_save_risk(student_profile.id, db)

    print("\n✅ Trained data successfully inserted into visual dashboard!")

if __name__ == "__main__":
    asyncio.run(seed_ml_data())
