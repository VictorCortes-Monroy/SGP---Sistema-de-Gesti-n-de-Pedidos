from typing import List
from uuid import UUID
from datetime import datetime
from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func
from sqlalchemy.orm import selectinload

from app.api.deps import get_db, get_current_user, require_role
from app.core import security
from app.models.users import User as UserModel
from app.schemas.user import UserCreate, UserUpdate, UserResponse
from app.schemas.pagination import PaginatedResponse

router = APIRouter()


def _to_response(user: UserModel) -> dict:
    return {
        "id": user.id,
        "email": user.email,
        "full_name": user.full_name,
        "is_active": user.is_active,
        "role_id": user.role_id,
        "role_name": user.role.name if user.role else None,
    }


@router.get("/me", response_model=UserResponse)
async def get_me(
    current_user: UserModel = Depends(get_current_user),
):
    """Get current authenticated user."""
    return _to_response(current_user)


@router.put("/me", response_model=UserResponse)
async def update_me(
    data: UserUpdate,
    db: AsyncSession = Depends(get_db),
    current_user: UserModel = Depends(get_current_user),
):
    """Update own profile (name, email, password). Cannot change role."""
    update_data = data.model_dump(exclude_unset=True)
    # Users cannot change their own role or active status
    update_data.pop("role_id", None)
    update_data.pop("is_active", None)

    if "password" in update_data:
        update_data["hashed_password"] = security.get_password_hash(update_data.pop("password"))

    for field, value in update_data.items():
        setattr(current_user, field, value)

    await db.commit()
    await db.refresh(current_user)
    return _to_response(current_user)


@router.get("/", response_model=PaginatedResponse[UserResponse])
async def list_users(
    skip: int = Query(0, ge=0),
    limit: int = Query(50, ge=1, le=200),
    db: AsyncSession = Depends(get_db),
    current_user: UserModel = Depends(get_current_user),
):
    """List all users (any authenticated user can see the list)."""
    base = select(UserModel).where(UserModel.is_deleted == False)

    total_result = await db.execute(select(func.count()).select_from(base.subquery()))
    total = total_result.scalar()

    query = (
        base.options(selectinload(UserModel.role))
        .order_by(UserModel.full_name)
        .offset(skip)
        .limit(limit)
    )
    result = await db.execute(query)
    users = result.scalars().all()
    return {"items": [_to_response(u) for u in users], "total": total, "skip": skip, "limit": limit}


@router.get("/{user_id}", response_model=UserResponse)
async def get_user(
    user_id: UUID,
    db: AsyncSession = Depends(get_db),
    current_user: UserModel = Depends(get_current_user),
):
    query = (
        select(UserModel)
        .options(selectinload(UserModel.role))
        .where(UserModel.id == user_id, UserModel.is_deleted == False)
    )
    result = await db.execute(query)
    user = result.scalars().first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    return _to_response(user)


@router.post("/", response_model=UserResponse, status_code=201)
async def create_user(
    user_in: UserCreate,
    db: AsyncSession = Depends(get_db),
    current_user: UserModel = Depends(require_role("Admin")),
):
    """Create a new user. Requires Admin role."""
    existing = await db.execute(select(UserModel).where(UserModel.email == user_in.email))
    if existing.scalars().first():
        raise HTTPException(status_code=400, detail="A user with this email already exists")

    db_user = UserModel(
        email=user_in.email,
        hashed_password=security.get_password_hash(user_in.password),
        full_name=user_in.full_name,
        role_id=user_in.role_id,
        is_active=user_in.is_active,
    )
    db.add(db_user)
    await db.commit()

    # Reload with role
    query = select(UserModel).options(selectinload(UserModel.role)).where(UserModel.id == db_user.id)
    result = await db.execute(query)
    db_user = result.scalars().first()
    return _to_response(db_user)


@router.put("/{user_id}", response_model=UserResponse)
async def update_user(
    user_id: UUID,
    data: UserUpdate,
    db: AsyncSession = Depends(get_db),
    current_user: UserModel = Depends(require_role("Admin")),
):
    """Update any user. Requires Admin role."""
    query = select(UserModel).options(selectinload(UserModel.role)).where(UserModel.id == user_id)
    result = await db.execute(query)
    user = result.scalars().first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")

    update_data = data.model_dump(exclude_unset=True)
    if "password" in update_data:
        update_data["hashed_password"] = security.get_password_hash(update_data.pop("password"))

    for field, value in update_data.items():
        setattr(user, field, value)

    await db.commit()
    await db.refresh(user)
    return _to_response(user)


@router.delete("/{user_id}", status_code=204)
async def delete_user(
    user_id: UUID,
    db: AsyncSession = Depends(get_db),
    current_user: UserModel = Depends(require_role("Admin")),
):
    """Soft delete a user. Requires Admin role."""
    result = await db.execute(
        select(UserModel).where(UserModel.id == user_id, UserModel.is_deleted == False)
    )
    user = result.scalars().first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")

    user.is_deleted = True
    user.is_active = False
    user.deleted_at = datetime.utcnow()
    await db.commit()
