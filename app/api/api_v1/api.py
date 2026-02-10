from fastapi import APIRouter
from app.api.api_v1.endpoints import login, users, requests, budgets, organizations, approval_matrix

api_router = APIRouter()
api_router.include_router(login.router, tags=["login"])
api_router.include_router(users.router, prefix="/users", tags=["users"])
api_router.include_router(requests.router, prefix="/requests", tags=["requests"])
api_router.include_router(budgets.router, prefix="/budgets", tags=["budgets"])
api_router.include_router(organizations.router, prefix="/organizations", tags=["organizations"])
api_router.include_router(approval_matrix.router, prefix="/approval-matrix", tags=["approval-matrix"])
