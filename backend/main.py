import asyncio
import logging
from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy import text

from app.api import admin, attendance, auth, mentors, parents, students, upload
from app.core.config import settings
from app.core.database import AsyncSessionLocal, create_tables

logger = logging.getLogger(__name__)


async def _keep_alive():
    """Ping Neon every 4 min so it never cold-starts during active use."""
    while True:
        await asyncio.sleep(240)  # 4 minutes
        try:
            async with AsyncSessionLocal() as db:
                await db.execute(text("SELECT 1"))
        except Exception as e:
            logger.warning("Keep-alive ping failed: %s", e)


@asynccontextmanager
async def lifespan(app: FastAPI):
    # Always ensure tables exist, especially on new deployment DBs
    await create_tables()
    
    # Auto-seed the deployment database if it's completely empty
    from app.models.user import User
    from sqlalchemy import select
    try:
        async with AsyncSessionLocal() as db:
            result = await db.execute(select(User).limit(1))
            if not result.scalar_one_or_none():
                logger.info("Database is empty. Populating with live demo data...")
                import seed_sqlite
                import seed_demo_52
                await seed_sqlite.seed()
                await seed_demo_52.seed_52()
                logger.info("✅ Auto-seed complete!")
    except Exception as e:
        logger.error(f"Auto-seed failed (if tables not ready): {e}")

    # Start background keep-alive so Neon stays warm
    task = asyncio.create_task(_keep_alive())
    yield
    task.cancel()


app = FastAPI(
    title="Academic Risk Predictor API",
    description="AI-powered student risk detection system with SHAP explainability",
    version="1.0.0",
    lifespan=lifespan,
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=[settings.FRONTEND_URL, "http://localhost:5173"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Routers
app.include_router(auth.router)
app.include_router(students.router)
app.include_router(mentors.router)
app.include_router(admin.router)
app.include_router(upload.router)
app.include_router(parents.router)
app.include_router(attendance.router)


@app.get("/health")
async def health():
    return {"status": "ok", "version": "1.0.0"}
