from typing import Optional
from pydantic import BaseModel, ConfigDict, EmailStr
from uuid import UUID


class UserBase(BaseModel):
    email: EmailStr
    is_active: Optional[bool] = True
    full_name: Optional[str] = None


class UserCreate(UserBase):
    password: str
    role_id: UUID


class UserUpdate(BaseModel):
    email: Optional[EmailStr] = None
    full_name: Optional[str] = None
    is_active: Optional[bool] = None
    role_id: Optional[UUID] = None
    password: Optional[str] = None


class UserResponse(UserBase):
    model_config = ConfigDict(from_attributes=True)

    id: UUID
    role_id: UUID
    role_name: Optional[str] = None


# Keep backward compat alias used in other files
User = UserResponse
