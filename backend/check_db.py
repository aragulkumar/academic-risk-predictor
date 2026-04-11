import asyncio
from sqlalchemy.ext.asyncio import create_async_engine, async_sessionmaker
from sqlalchemy import text
from app.core.config import settings

async def check():
    engine = create_async_engine(settings.DATABASE_URL)
    Session = async_sessionmaker(engine)
    async with Session() as db:
        r = await db.execute(text("SELECT COUNT(*) FROM users WHERE role='student'"))
        print("Students:", r.scalar())
        r2 = await db.execute(text("SELECT COUNT(*) FROM users WHERE role='parent'"))
        print("Parents:", r2.scalar())
        r3 = await db.execute(text("SELECT COUNT(*) FROM risk_scores"))
        print("Risk Scores:", r3.scalar())
        r4 = await db.execute(text("SELECT name, email FROM users WHERE role='student' LIMIT 5"))
        print("Sample students:")
        for row in r4.fetchall():
            print(f"  name={row[0]}, username={row[1]}")

asyncio.run(check())
