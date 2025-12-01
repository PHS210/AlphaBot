from pydantic import BaseModel, Field
from datetime import datetime
from typing import Optional


class CategoryCreate(BaseModel):
    """카테고리 생성을 위한 요청 스키마"""
    title: str = Field(..., max_length=50, description="카테고리 제목")


class CategoryUpdate(BaseModel):
    """카테고리 수정을 위한 요청 스키마"""
    title: Optional[str] = Field(None, max_length=50, description="카테고리 제목")


class Category(BaseModel):
    """클라이언트에 카테고리 정보를 반환하기 위한 응답 스키마"""
    category_id: int
    user_id: int  # user_id 필드 추가
    title: str
    created_at: datetime

    class Config:
        from_attributes = True  # orm_mode = True


class CategoryList(BaseModel):
    """카테고리 목록 응답 스키마"""
    categories: list[Category]  # 응답 스키마를 Category로 사용
    total: int
    page: int
    page_size: int
    total_pages: int