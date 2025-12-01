from pydantic import BaseModel, Field
from datetime import datetime
from typing import List, Optional

# 댓글 작성자 정보 (작성자명을 보여주기 위함)
class CommentUserRead(BaseModel):
    user_id: int
    username: str
    
    class Config:
        from_attributes = True

# 댓글 생성 요청 (Client -> Server)
class CommentCreate(BaseModel):
    stock_code: str = Field(..., description="종목 코드 (예: AAPL)")
    content: str = Field(..., description="댓글 내용")

# 댓글 수정을 위한 요청
class CommentUpdate(BaseModel):
    content: str = Field(..., description="수정할 댓글 내용")

# 댓글 응답 (Server -> Client)
class CommentRead(BaseModel):
    comment_id: int
    content: str
    created_at: datetime
    user: CommentUserRead  # 작성자 정보 포함

    class Config:
        from_attributes = True

# 댓글 목록 응답 (페이지네이션)
class CommentList(BaseModel):
    comments: List[CommentRead]
    total: int
    page: int
    page_size: int
    total_pages: int

