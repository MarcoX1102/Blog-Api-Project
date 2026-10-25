from typing import Optional
from datetime import datetime
from typing import List, Optional

from pydantic import BaseModel, ConfigDict, Field


# ---------- Users ----------
class UserCreate(BaseModel):
    username: str = Field(min_length=3, max_length=50)
    password: str = Field(min_length=6, max_length=72)


class UserResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    username: str


# ---------- Blogs ----------
class BlogCreate(BaseModel):
    title: str = Field(min_length=1, max_length=200)
    content: str = Field(min_length=1)


class BlogResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    title: str
    content: str
    created_at: Optional[datetime] = None
    author: UserResponse


class BlogUpdate(BaseModel):
       title: Optional[str] = None
       content: Optional[str] = None


class BlogList(BaseModel):
    page: int
    limit: int
    total: int
    data: List[BlogResponse]