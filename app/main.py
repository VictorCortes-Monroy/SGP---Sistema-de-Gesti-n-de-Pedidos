import logging
from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from apscheduler.schedulers.asyncio import AsyncIOScheduler
from apscheduler.triggers.interval import IntervalTrigger

from app.core.config import settings
from app.api.api_v1.api import api_router
from app.db.session import AsyncSessionLocal
from app.services.maintenance.sla_service import SLAService

logger = logging.getLogger(__name__)

scheduler = AsyncIOScheduler()


async def _run_sla_job():
    """Job periódico: verifica SLAs y crea alertas."""
    async with AsyncSessionLocal() as db:
        try:
            svc = SLAService(db)
            created = await svc.run_checks()
            if created:
                logger.info(f"SLA check: {created} nuevas alertas creadas")
        except Exception as e:
            logger.error(f"SLA job error: {e}")


@asynccontextmanager
async def lifespan(app: FastAPI):
    # Startup
    scheduler.add_job(
        _run_sla_job,
        trigger=IntervalTrigger(hours=1),
        id="sla_check",
        replace_existing=True,
    )
    scheduler.start()
    logger.info("SLA scheduler started (interval: 1h)")
    yield
    # Shutdown
    scheduler.shutdown(wait=False)


app = FastAPI(
    title=settings.PROJECT_NAME,
    openapi_url=f"{settings.API_V1_STR}/openapi.json",
    lifespan=lifespan,
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(api_router, prefix=settings.API_V1_STR)


@app.get("/")
def root():
    return {"message": "Welcome to SGP API"}


@app.get("/health")
def health():
    return {"status": "healthy"}
