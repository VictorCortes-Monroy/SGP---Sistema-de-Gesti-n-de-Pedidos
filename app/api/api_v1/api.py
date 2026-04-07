from fastapi import APIRouter
from app.api.api_v1.endpoints import login, users, requests, budgets, organizations, approval_matrix, dashboard, audit, suppliers, catalog
from app.api.api_v1.endpoints.maintenance import maintenance_router
from app.api.api_v1.endpoints.purchase_orders import router as po_router, quotations_router

api_router = APIRouter()
api_router.include_router(login.router, tags=["login"])
api_router.include_router(users.router, prefix="/users", tags=["users"])
api_router.include_router(requests.router, prefix="/requests", tags=["requests"])
api_router.include_router(requests.download_router, prefix="/requests/documents", tags=["requests"])
api_router.include_router(budgets.router, prefix="/budgets", tags=["budgets"])
api_router.include_router(organizations.router, prefix="/organizations", tags=["organizations"])
api_router.include_router(approval_matrix.router, prefix="/approval-matrix", tags=["approval-matrix"])
api_router.include_router(dashboard.router, prefix="/dashboard", tags=["dashboard"])
api_router.include_router(audit.router, prefix="/audit", tags=["audit"])
api_router.include_router(maintenance_router, prefix="/maintenance", tags=["maintenance"])
api_router.include_router(suppliers.router, prefix="/suppliers", tags=["suppliers"])
api_router.include_router(catalog.router, prefix="/catalog", tags=["catalog"])
api_router.include_router(po_router, prefix="/purchase-orders", tags=["purchase-orders"])
api_router.include_router(quotations_router, prefix="/quotations", tags=["quotations"])
