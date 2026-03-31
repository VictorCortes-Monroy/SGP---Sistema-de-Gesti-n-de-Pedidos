from fastapi import APIRouter, Depends
from sqlalchemy.ext.asyncio import AsyncSession
from typing import Any

from app.api import deps
from app.models.users import User
from app.schemas.maintenance.analytics import MaintenanceAnalyticsSummary
from app.services.maintenance.analytics_service import AnalyticsService

router = APIRouter()

@router.get("/summary", response_model=MaintenanceAnalyticsSummary)
async def get_analytics_summary(
    *,
    db: AsyncSession = Depends(deps.get_db),
    current_user: User = Depends(deps.get_current_user)
) -> Any:
    """Retrieve key performance indicators and alerts for Maintenance Dashboard."""
    summary = await AnalyticsService.get_summary(db=db)
    return summary
