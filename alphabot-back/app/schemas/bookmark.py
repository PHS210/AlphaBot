from pydantic import BaseModel, Field
from datetime import datetime
from typing import Optional


class BookmarkCreate(BaseModel):
    """북마크(메시지 저장) 생성 요청 스키마"""
    messages_id: int = Field(..., description="저장할 메시지 ID")
    category_id: Optional[int] = Field(None, description="카테고리 ID (없으면 미분류)")


class BookmarkRead(BaseModel):
    """북마크 응답 스키마"""
    bookmark_id: int
    user_id: int
    messages_id: int
    category_id: Optional[int] = None
    created_at: datetime

    class Config:
        from_attributes = True


class BookmarkList(BaseModel):
    """북마크 목록 응답 스키마 (페이지네이션)"""
    bookmarks: list[BookmarkRead]
    total: int
    page: int
    page_size: int
    total_pages: int


class BookmarkUpdate(BaseModel):
    """북마크 수정을 위한 요청 스키마 (예: 카테고리 이동)"""
    # 사용자가 북마크의 카테고리만 변경할 수 있도록 허용
    # null 값을 허용하여 '미분류'로 이동하는 것도 가능하게 함
    category_id: Optional[int] = Field(None, description="새 카테고리 ID (null로 보내면 미분류로 이동)")


