from fastapi import APIRouter
from . import equipment, providers, requests, analytics, documents, alerts

maintenance_router = APIRouter()
maintenance_router.include_router(equipment.router, prefix="/equipment", tags=["maintenance-equipment"])
maintenance_router.include_router(providers.router, prefix="/providers", tags=["maintenance-providers"])
maintenance_router.include_router(requests.router, prefix="/requests", tags=["maintenance-requests"])
maintenance_router.include_router(analytics.router, prefix="/analytics", tags=["maintenance-analytics"])
maintenance_router.include_router(documents.router, prefix="/requests", tags=["maintenance-documents"])
maintenance_router.include_router(documents.download_router, prefix="/documents", tags=["maintenance-documents"])
maintenance_router.include_router(alerts.router, prefix="/alerts", tags=["maintenance-alerts"])
