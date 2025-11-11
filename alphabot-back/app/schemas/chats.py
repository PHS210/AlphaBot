from pydantic import BaseModel, Field
from datetime import datetime
from typing import Optional

# 메시지 생성을 위한 요청 스키마
# POST /api/rooms/{room_id}/messages
class MessageCreate(BaseModel):
    content: str


# 클라이언트에 메시지를 반환하기 위한 응답 스키마
# GET /api/rooms/{room_id}/messages
class MessageRead(BaseModel):
    messages_id: int
    content: str
    user_id: int
    chat_id: int
    role: str = Field(description="메시지 주체: user 또는 assistant")
    created_at: datetime

    class Config:
        from_attributes = True


# 채팅방 정보 조회를 응답 위한 스키마
# GET /api/rooms
class ChatRead(BaseModel):
    chat_id: int
    title: str
    created_at: datetime
    lastchat_at: Optional[datetime] = None
    trash_can: str

    class Config:
        from_attributes = True


# 채팅방 생성/수정 요청 스키마
class ChatCreate(BaseModel):
    title: str = Field(..., min_length=1, max_length=100, description="채팅방 제목")


class ChatUpdate(BaseModel):
    title: Optional[str] = Field(None, min_length=1, max_length=100, description="채팅방 제목")
    trash_can: Optional[str] = Field(None, description="휴지통 상태: in 또는 out")


# 목록 응답 스키마 (페이지네이션)
class MessageList(BaseModel):
    messages: list[MessageRead]
    total: int
    page: int
    page_size: int
    total_pages: int


class ChatList(BaseModel):
    chats: list[ChatRead]
    total: int
    page: int
    page_size: int
    total_pages: int