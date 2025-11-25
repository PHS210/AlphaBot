from typing import List
from fastapi import APIRouter, Depends, HTTPException, status, Query
from sqlalchemy.orm import Session
from sqlalchemy import desc

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
# [추가] RoleEnum 추가
from app.models.models import User, Chat, Message, TrashEnum ,RoleEnum
# [추가] RAG 서비스 임포트
from app.services.rag_service import RAGService
from app.services.chat_service import (
    normalize_stock_code,
    upsert_chat_by_stock,
    save_user_message,
    create_message_and_reply,
)

router = APIRouter(tags=["chat"])

# [추가] RAG 서비스 인스턴스 생성
rag_client = RAGService()


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
# [수정] RAG 서비스를 이용하여 답변을 생성
def create_message_with_openai(
    room_id: int,
    request: ChatCompletionRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """
    사용자 메시지 저장하고 RAG 분석을 통해 OpenAI 응답 생성하여 반환
    """
    # 1. 채팅방 정보 조회 (종목 코드를 알기 위해 필요)
    chat_room = db.query(Chat).filter(Chat.chat_id == room_id).first()
    if not chat_room:
        raise HTTPException(status_code=404, detail="Chat room not found")
    
    # 2. 사용자 메시지 DB에 우선 저장
    user_msg = save_user_message(
        db,
        room_id=room_id,
        current_user=current_user,
        message=MessageCreate(content=request.content)
    )

    # 3. RAG 서비스 호출 (AI 답변 생성)
    try:
        rag_result = rag_client.chat_with_rag(
            user_query=request.content,
            user_id=str(current_user.user_id),
            stock_code=chat_room.stock_code,
            news_db=db, # 뉴스 벡터 데이터가 있는 DB (지금은 main DB와 공유)
            main_db=db, # 사용자/채팅/주식 정보가 있는 DB
        )
        
        ai_response_text = rag_result.get("response", "죄송합니다. 답변을 생성하지 못했습니다.")
        
    except Exception as e:
        # RAG 실패 시 에러 로그 출력
        print(f"RAG Error: {e}")
        ai_response_text = "일시적인 오류로 AI 답변을 생성할 수 없습니다."

    # 4. AI 답변(Assistant Message) DB에 저장
    assistant_msg = Message(
        chat_id=room_id,
        user_id=current_user.user_id,
        role=RoleEnum.assistant,
        content=ai_response_text,
    )
    db.add(assistant_msg)
    
    # 채팅방의 마지막 대화 시간 업데이트
    chat_room.lastchat_at = assistant_msg.created_at
    
    db.commit()
    db.refresh(assistant_msg)

    # 5. 결과 반환
    return ChatCompletionResponse(
        user_message=user_msg, 
        assistant_message=assistant_msg
    )


@router.get("/rooms/{room_id}/messages", response_model=List[MessageRead])
def get_messages(
    room_id: int,
    last_message_id: int | None = None,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """특정 채팅방의 메시지 내역을 조회"""
    chat = db.query(Chat).filter(Chat.chat_id == room_id, Chat.user_id == current_user.user_id).first()
    if not chat:
        raise HTTPException(status_code=404, detail="Chat room not found or permission denied")

    query = db.query(Message).filter(Message.chat_id == room_id)
    if last_message_id:
        query = query.filter(Message.messages_id > last_message_id)

    messages = query.order_by(Message.created_at.asc()).all()
    return messages


@router.get("/rooms", response_model=List[ChatRead])
def get_chat_rooms(
    db: Session = Depends(get_db), current_user: User = Depends(get_current_user)
):
    """현재 사용자가 참여 중인 모든 채팅방 목록을 조회"""
    # [추가] 실제 메신저처럼 정렬 로직 적용
    chat_rooms = (
            db.query(Chat)
            .filter(Chat.user_id == current_user.user_id)
            # 1순위: 마지막 대화 시간(최신순), 대화 없으면(null) 뒤로 보냄
            # 2순위: 대화 기록이 둘 다 없으면 방 생성 최신순
            .order_by(
                desc(Chat.lastchat_at).nulls_last(),
                Chat.created_at.desc()
            )
            .all()
        )
    return chat_rooms


@router.put("/v1/chats/by-stock/{stock_code}", response_model=ChatByStockResponse)
def enter_chat_by_stock(
    stock_code: str,
    title: str | None = Query(default=None, max_length=100, description="신규 생성 시 사용할 제목"),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    # [추가] 설명 보충
    """
    사용자/종목 조합으로 채팅방을 조회하거나 생성 후 chat_id를 반환
    (기존 방이 없으면 새로 생성하고, 휴지통으로 간 방은 자동으로 복구합니다.)
    """
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
    existing_chat = None
    if chat_in.stock_code:
        existing_chat = (
            db.query(Chat)
            .filter(
                Chat.user_id == current_user.user_id,
                Chat.stock_code == chat_in.stock_code,
                Chat.trash_can == "out", #[수정] in -> out
            )
            .first()
        )
    if existing_chat:
        return existing_chat

    new_chat = Chat(
        user_id=current_user.user_id,
        title=chat_in.title,
        stock_code=chat_in.stock_code,
    )
    db.add(new_chat)
    db.commit()
    db.refresh(new_chat)
    return new_chat


@router.get("/rooms/by-stock/{stock_code}", response_model=ChatRead)
def get_chat_room_by_stock(
    stock_code: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """현재 사용자의 특정 종목 채팅방 조회"""
    chat = (
        db.query(Chat)
        .filter(
            Chat.user_id == current_user.user_id,
            Chat.stock_code == stock_code,
            Chat.trash_can == "out", #[수정] in -> out
        )
        .first()
    )
    if not chat:
        raise HTTPException(status_code=404, detail="Chat room for stock not found")
    return chat


@router.patch("/rooms/{room_id}", response_model=ChatRead)
def update_chat_room(
    room_id: int,
    chat_in: ChatUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """채팅방 정보를 수정 (현재는 제목 및 휴지통 상태만 지원)"""
    chat = (
        db.query(Chat)
        .filter(Chat.chat_id == room_id, Chat.user_id == current_user.user_id)
        .first()
    )
    if not chat:
        raise HTTPException(status_code=404, detail="Chat room not found or permission denied")

    updated = False

    if chat_in.title is not None:
        normalized_title = chat_in.title.strip()
        if not normalized_title:
            raise HTTPException(status_code=400, detail="Title must not be empty")
        chat.title = normalized_title
        updated = True

    if chat_in.trash_can is not None:
        if chat_in.trash_can not in (TrashEnum.in_.value, TrashEnum.out.value):
            raise HTTPException(status_code=400, detail="Invalid trash_can value")
        chat.trash_can = chat_in.trash_can
        updated = True

    if not updated:
        return chat

    db.commit()
    db.refresh(chat)
    return chat


@router.delete("/rooms/{room_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_chat_room(
    room_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """
    휴지통에 있는 채팅방을 완전히 삭제(trash_can 상태가 in인 경우 삭제)
    """
    
    chat = (
        db.query(Chat)
        .filter(Chat.chat_id == room_id, Chat.user_id == current_user.user_id)
        .first()
    )

    if not chat:
        raise HTTPException(status_code=404, detail="Chat room not found")

    if chat.trash_can == TrashEnum.out.value:
        raise HTTPException(
            status_code=400, 
            detail="Active chat rooms cannot be deleted. Move to trash first."
        )

    db.delete(chat)
    db.commit()
    
    return None