from sqlalchemy.ext.asyncio import AsyncSession, async_sessionmaker, create_async_engine
from sqlalchemy.orm import DeclarativeBase

from app.core.config import settings

engine = create_async_engine(
    settings.DATABASE_URL,
    echo=False,           # Never log raw SQL — it adds significant overhead
    pool_pre_ping=True,   # Detect dead connections before using them
    pool_size=5,
    max_overflow=10,
    pool_recycle=300,     # Recycle connections every 5 min (beats Neon idle timeout)
)

AsyncSessionLocal = async_sessionmaker(
    engine, class_=AsyncSession, expire_on_commit=False
)


class Base(DeclarativeBase):
    pass


async def get_db() -> AsyncSession:  # type: ignore[return]
    async with AsyncSessionLocal() as session:
        yield session


async def create_tables() -> None:
    """Create all tables on startup (for dev). Use Alembic for production."""
    async with engine.begin() as conn:
        from app.models import assessment, intervention, risk_score, student, user  # noqa: F401
        await conn.run_sync(Base.metadata.create_all)
