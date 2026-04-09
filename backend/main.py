from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.api import admin, auth, mentors, students
from app.core.config import settings
from app.core.database import create_tables


@asynccontextmanager
async def lifespan(app: FastAPI):
    # Create DB tables on startup (dev mode)
    if settings.ENVIRONMENT == "development":
        await create_tables()
    yield


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


@app.get("/health")
async def health():
    return {"status": "ok", "version": "1.0.0"}
