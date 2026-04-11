import asyncio
from sqlalchemy.ext.asyncio import create_async_engine, async_sessionmaker
from app.models.user import User
from app.models.student import Student
from app.core.security import hash_password
from app.core.config import settings
from app.models import assessment, intervention, risk_score, student, user

async def seed():
    engine = create_async_engine(settings.DATABASE_URL)
    AsyncSessionLocal = async_sessionmaker(engine, expire_on_commit=False)
    
    async with AsyncSessionLocal() as db:
        print("Creating Admin...")
        admin = User(email="admin@college.edu", hashed_password=hash_password("admin123"), name="System Admin", role="admin")
        db.add(admin)

        print("Creating Mentor...")
        mentor = User(email="mentor@college.edu", hashed_password=hash_password("mentor123"), name="Dr. Smith", role="mentor")
        db.add(mentor)
        await db.commit()

        print("Creating Students...")
        student_user = User(email="student1@college.edu", hashed_password=hash_password("password123"), name="John Doe", role="student")
        db.add(student_user)
        await db.commit()
        
        # Link student profile
        student_profile = Student(user_id=student_user.id, mentor_id=mentor.id, roll_number="CS2024001", department="Computer Science", semester=1, batch_year=2024)
        db.add(student_profile)
        await db.commit()
        
    print("\n✅ Seeded successfully!")
    print("Admin: admin@college.edu / admin123")
    print("Mentor: mentor@college.edu / mentor123")
    print("Student: student1@college.edu / password123")

if __name__ == "__main__":
    asyncio.run(seed())
