import asyncio
import os
import sys
from datetime import datetime, timedelta
import random

# Add project root to path
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from sqlalchemy.ext.asyncio import create_async_engine, async_sessionmaker
from app.core.config import settings
from app.models.user import User
from app.models.student import Student
from app.models.parent_student import ParentStudent
from app.models.risk_score import RiskScore
from app.core.security import hash_password
from app.models import assessment, intervention, risk_score, student, user

INDIAN_NAMES = [
    "Aarav", "Aditi", "Akhil", "Ananya", "Arjun", "Bhavya", "Chetan", "Deepa",
    "Dhruv", "Divya", "Gaurav", "Isha", "Karthik", "Kavya", "Krish", "Lakshmi",
    "Manish", "Megha", "Neha", "Nikhil", "Pooja", "Pranav", "Priya", "Rahul",
    "Riya", "Rohan", "Sanjay", "Sanjana", "Siddharth", "Shruti", "Sneha", "Suraj",
    "Swati", "Tarun", "Tejas", "Varun", "Vidya", "Vikram", "Vivek", "Ashwin",
    "Harish", "Aishwarya", "Rakesh", "Gautam", "Preeti", "Kiran", "Nandini", "Yash",
    "Anil", "Sunil", "Anjali", "Ramesh"
]

DEPARTMENTS = ["Computer Science", "Information Technology", "Electronics", "Mechanical"]
KEY_FACTORS = [
    "Low internal assessment scores (impact: +4.1)",
    "Poor attendance trend over last 3 weeks (impact: +3.8)",
    "Missing assignments in core subjects (impact: +2.5)",
    "Consistent performance (impact: -2.1)",
    "Strong attendance record (impact: -3.5)",
    "Excellent lab scores (impact: -4.0)"
]

async def seed_52():
    engine = create_async_engine(settings.DATABASE_URL)
    AsyncSessionLocal = async_sessionmaker(engine, expire_on_commit=False)
    
    async with AsyncSessionLocal() as db:
        print("Creating 52 realistic students, parents, and risk scores...")
        
        # Get a mentor to assign these students to
        mentor_res = await db.execute(User.__table__.select().where(User.role == "mentor"))
        mentor = mentor_res.fetchone()
        if not mentor:
            print("No mentor found! Cannot assign students. Run seed_sqlite.py first.")
            return
        
        mentor_id = mentor.id
        
        for i, name in enumerate(INDIAN_NAMES[:52]):
            username = name.lower()
            parent_username = f"{username}@parent"
            
            from sqlalchemy import select
            existing = await db.execute(select(User).where(User.email == username))
            if existing.scalar_one_or_none():
                continue
                
            # --- 1. Create Student User ---
            s_user = User(
                email=username,  # Using email field as username per plan
                hashed_password=hash_password("password123"),
                name=name,
                role="student"
            )
            db.add(s_user)
            await db.commit()
            await db.refresh(s_user)
            
            # --- 2. Create Parent User ---
            p_user = User(
                email=parent_username,
                hashed_password=hash_password("password123"),
                name=f"{name}'s Parent",
                role="parent"
            )
            db.add(p_user)
            await db.commit()
            await db.refresh(p_user)
            
            # --- 3. Create Student Entity ---
            student_entity = Student(
                user_id=s_user.id,
                roll_number=f"DEMO2026{i:03d}",
                department=random.choice(DEPARTMENTS),
                semester=random.randint(1, 8),
                batch_year=2026,
                mentor_id=mentor_id
            )
            db.add(student_entity)
            await db.commit()
            await db.refresh(student_entity)
            
            # --- 4. Link Parent to Student ---
            link = ParentStudent(
                parent_id=p_user.id,
                student_id=student_entity.id
            )
            db.add(link)
            await db.commit()
            
            # --- 5. Generate Risk Score ---
            risk_level_choice = random.choices(
                ["low", "medium", "high", "critical"], 
                weights=[60, 20, 15, 5]
            )[0]
            
            score_val = 0
            factors = []
            if risk_level_choice == "low":
                score_val = random.randint(10, 30)
                factors = "\n".join(random.sample(KEY_FACTORS[3:], 2))
            elif risk_level_choice == "medium":
                score_val = random.randint(40, 60)
                factors = "\n".join([KEY_FACTORS[0], KEY_FACTORS[3]])
            elif risk_level_choice == "high":
                score_val = random.randint(70, 85)
                factors = "\n".join(random.sample(KEY_FACTORS[:3], 2))
            else: # critical
                score_val = random.randint(90, 99)
                factors = "\n".join(KEY_FACTORS[:3])
            
            r_score = RiskScore(
                student_id=student_entity.id,
                score=score_val,
                risk_level=risk_level_choice,
                top_factors=factors,
                explanation="Model prediction details automatically generated based on core metrics.",
                computed_at=datetime.utcnow() - timedelta(minutes=random.randint(5, 1000))
            )
            db.add(r_score)
            await db.commit()
        
        print("✅ Successfully seeded 52 Students, Parents, and ML Risk Scores linked to Mentor Database!")

if __name__ == "__main__":
    asyncio.run(seed_52())
