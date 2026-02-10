from typing import Generator, Optional
from fastapi import Depends, HTTPException, status, Request as FastAPIRequest
from fastapi.security import OAuth2PasswordBearer
from jose import jwt, JWTError
from pydantic import ValidationError
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from sqlalchemy.orm import selectinload

from app.db.session import get_db
from app.core import security
from app.core.config import settings
from app.models.users import User, Role
from app.schemas.token import TokenPayload

reusable_oauth2 = OAuth2PasswordBearer(
    tokenUrl=f"{settings.API_V1_STR}/login/access-token"
)

async def get_current_user(
    db: AsyncSession = Depends(get_db),
    token: str = Depends(reusable_oauth2)
) -> User:
    try:
        payload = jwt.decode(
            token, settings.SECRET_KEY, algorithms=[security.ALGORITHM]
        )
        token_data = TokenPayload(**payload)
    except (JWTError, ValidationError):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Could not validate credentials",
        )

    query = select(User).options(selectinload(User.role)).where(User.id == token_data.sub)
    result = await db.execute(query)
    user = result.scalars().first()

    if not user or user.is_deleted:
        raise HTTPException(status_code=404, detail="User not found")
    if not user.is_active:
        raise HTTPException(status_code=400, detail="Inactive user")
    return user


def require_role(*role_names: str):
    """Factory that returns a dependency requiring the user to have one of the specified roles."""
    async def _check(
        current_user: User = Depends(get_current_user),
    ) -> User:
        if not current_user.role or current_user.role.name not in role_names:
            raise HTTPException(
                status_code=403,
                detail=f"Role not authorized. Required: {role_names}"
            )
        return current_user
    return _check


def get_client_ip(request: FastAPIRequest) -> str:
    """Extract client IP from request, considering X-Forwarded-For proxy header."""
    forwarded = request.headers.get("X-Forwarded-For")
    if forwarded:
        return forwarded.split(",")[0].strip()
    return request.client.host if request.client else "unknown"
