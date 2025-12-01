from typing import List
from fastapi import APIRouter, Depends, HTTPException, status, Query
from sqlalchemy.orm import Session

from app.core.dependencies import get_current_user
from app.db import get_db
from app.schemas.chats import (
    MessageCreate,
    MessageRead,
    ChatRead,
    ChatCreate,
    ChatUpdate,
    ChatByStockResponse,
    ChatCompletionRequest,
    ChatCompletionResponse,
)
from app.models.models import User
from app.services.chat_service import (
    normalize_stock_code,
    upsert_chat_by_stock,
    save_user_message,
    create_message_and_reply,
    fetch_chat_messages,
    list_user_chat_rooms,
    create_chat_room_for_user,
    get_chat_room_by_stock_for_user,
    update_chat_room_for_user,
)

router = APIRouter(tags=["chat"])


@router.post("/rooms/{room_id}/messages", response_model=MessageRead)
def create_message(
    room_id: int,
    message: MessageCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """특정 채팅방에 메시지를 전송하고 DB에 저장"""
    db_message = save_user_message(db, room_id=room_id, current_user=current_user, message=message)
    return db_message


@router.post(
    "/rooms/{room_id}/chat-completions",
    response_model=ChatCompletionResponse,
    status_code=status.HTTP_201_CREATED,
)
def create_message_with_openai(
    room_id: int,
    request: ChatCompletionRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """사용자 메시지를 저장하고 OpenAI 응답을 생성하여 함께 반환"""
    user_message, assistant_message = create_message_and_reply(
        db,
        room_id=room_id,
        current_user=current_user,
        message=MessageCreate(content=request.content),
        system_prompt=request.system_prompt,
    )
    return ChatCompletionResponse(user_message=user_message, assistant_message=assistant_message)


@router.get("/rooms/{room_id}/messages", response_model=List[MessageRead])
def get_messages(
    room_id: int,
    last_message_id: int | None = None,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """특정 채팅방의 메시지 내역을 조회"""
    return fetch_chat_messages(
        db,
        room_id=room_id,
        current_user=current_user,
        last_message_id=last_message_id,
    )


@router.get("/rooms", response_model=List[ChatRead])
def get_chat_rooms(
    db: Session = Depends(get_db), current_user: User = Depends(get_current_user)
):
    """현재 사용자가 참여 중인 모든 채팅방 목록을 조회"""
    return list_user_chat_rooms(db, current_user=current_user)


@router.put("/v1/chats/by-stock/{stock_code}", response_model=ChatByStockResponse)
def enter_chat_by_stock(
    stock_code: str,
    title: str | None = Query(default=None, max_length=100, description="신규 생성 시 사용할 제목"),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """사용자/종목 조합으로 채팅방을 조회하거나 생성 후 chat_id를 반환"""
    try:
        normalized_code = normalize_stock_code(stock_code)
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc))

    if title:
        normalized_title = title.strip()
    else:
        normalized_title = None
    chat, existed = upsert_chat_by_stock(
        db,
        user=current_user,
        stock_code=normalized_code,
        title=normalized_title,
    )

    return ChatByStockResponse(
        chat_id=chat.chat_id,
        title=chat.title,
        stock_code=chat.stock_code or normalized_code,
        existed=existed,
    )
@router.post("/rooms", response_model=ChatRead, status_code=status.HTTP_201_CREATED)
def create_chat_room(
    chat_in: ChatCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """
    새 채팅방 생성 (종목별 채팅방)
    - stock_code가 전달되면 동일 사용자/종목의 활성 방이 있으면 그 방을 반환
    """
    return create_chat_room_for_user(db, current_user=current_user, chat_in=chat_in)


@router.get("/rooms/by-stock/{stock_code}", response_model=ChatRead)
def get_chat_room_by_stock(
    stock_code: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """현재 사용자의 특정 종목 채팅방 조회"""
    return get_chat_room_by_stock_for_user(db, current_user=current_user, stock_code=stock_code)


@router.patch("/rooms/{room_id}", response_model=ChatRead)
def update_chat_room(
    room_id: int,
    chat_in: ChatUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """채팅방 정보를 수정 (현재는 제목 및 휴지통 상태만 지원)"""
    return update_chat_room_for_user(
        db,
        room_id=room_id,
        current_user=current_user,
        chat_in=chat_in,
    )
