import asyncio
from sqlalchemy.ext.asyncio import create_async_engine
from sqlalchemy import text
from app.core.config import settings

async def clean():
    engine = create_async_engine(settings.DATABASE_URL)
    async with engine.begin() as conn:
        try: await conn.execute(text("DELETE FROM risk_scores"))
        except: pass
        try: await conn.execute(text("DELETE FROM parent_students"))
        except: pass
        try: await conn.execute(text("DELETE FROM students"))
        except: pass
        try: await conn.execute(text("DELETE FROM users WHERE role NOT IN ('admin','mentor')"))
        except: pass
        try: await conn.execute(text("DELETE FROM interventions"))
        except: pass
    print("Database wiped clean!")

if __name__ == "__main__":
    asyncio.run(clean())
