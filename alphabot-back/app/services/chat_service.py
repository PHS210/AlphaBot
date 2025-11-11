from __future__ import annotations

from typing import List, Tuple

import os
from fastapi import HTTPException, status
from sqlalchemy.orm import Session

from app.models import Chat, Message, RoleEnum, User
from app.schemas.chats import MessageCreate

# 이 모듈은 OpenAI API를 활용해 챗봇 응답을 생성하고,
# 대화 이력을 DB에 저장/조회하는 서비스 로직을 제공합니다.


try:
    # OpenAI Python SDK v1.x 사용
    from openai import OpenAI
except Exception:  # pragma: no cover - openai 미설치/런타임 환경 보호
    OpenAI = None  # type: ignore


_OPENAI_MODEL_DEFAULT = os.getenv("OPENAI_MODEL", "gpt-5")  # 기본 모델
_OPENAI_TEMPERATURE_DEFAULT = float(os.getenv("OPENAI_TEMPERATURE", "0.2"))  # 샘플링 온도
_OPENAI_MAX_TOKENS_DEFAULT = int(os.getenv("OPENAI_MAX_TOKENS", "512"))  # 최대 토큰 수


def _get_openai_client() -> "OpenAI":
    """환경 변수에서 키를 읽어 OpenAI 클라이언트를 생성합니다. 사용 불가 시 500 오류를 발생시킵니다."""
    if OpenAI is None:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="OpenAI SDK is not installed on the server.",
        )

    # 기본적으로 SDK는 환경변수 OPENAI_API_KEY를 자동으로 읽습니다.
    # 필요하다면 OpenAI(api_key=...)로 명시적으로 지정할 수 있습니다.
    try:
        return OpenAI()
    except Exception as exc:  # pragma: no cover - network/env failures
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to initialize OpenAI client: {exc}",
        )


def _ensure_room_ownership(db: Session, room_id: int, user_id: int) -> Chat:
    """채팅방이 존재하며 현재 사용자 소유인지 검증합니다."""
    chat = (
        db.query(Chat)
        .filter(Chat.chat_id == room_id, Chat.user_id == user_id)
        .first()
    )
    if chat is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Chat room not found or permission denied",
        )
    return chat


def _load_chat_history(db: Session, room_id: int, limit: int = 30) -> List[Message]:
    """해당 채팅방의 최근 메시지 이력을 오래된 순으로 조회합니다."""
    return (
        db.query(Message)
        .filter(Message.chat_id == room_id)
        .order_by(Message.created_at.asc())
        .limit(limit)
        .all()
    )


def _convert_history_to_openai_messages(history: List[Message], system_prompt: str | None = None) -> List[dict]:
    """DB의 메시지 이력을 OpenAI Chat Completions 형식으로 변환합니다."""
    messages: List[dict] = []
    if system_prompt:
        messages.append({"role": "system", "content": system_prompt})

    for m in history:
        # SQLAlchemy Enum은 .value를 갖기도 하고, 단순 문자열일 수도 있으므로 안전하게 처리합니다.
        role_value = m.role.value if hasattr(m.role, "value") else str(m.role)
        messages.append({"role": role_value, "content": m.content})
    return messages


def _call_openai_chat(
    messages: List[dict],
    *,
    model: str = _OPENAI_MODEL_DEFAULT,
    temperature: float = _OPENAI_TEMPERATURE_DEFAULT,
    max_tokens: int = _OPENAI_MAX_TOKENS_DEFAULT,
) -> str:
    """OpenAI Chat Completions API를 호출하여 어시스턴트의 텍스트 응답을 반환합니다."""
    client = _get_openai_client()

    try:
        resp = client.chat.completions.create(
            model=model,
            messages=messages,
            temperature=temperature,
            max_tokens=max_tokens,
        )
    except Exception as exc:  # pragma: no cover - network failures
        raise HTTPException(
            status_code=status.HTTP_502_BAD_GATEWAY,
            detail=f"OpenAI chat completion failed: {exc}",
        )

    choice = resp.choices[0] if resp.choices else None
    content = choice.message.content if choice and choice.message else None
    if not content:
        raise HTTPException(
            status_code=status.HTTP_502_BAD_GATEWAY,
            detail="OpenAI returned empty response",
        )
    return content


def save_user_message(
    db: Session, *, room_id: int, current_user: User, message: MessageCreate
) -> Message:
    """사용자의 메시지를 해당 채팅방에 저장하고 저장된 레코드를 반환합니다."""
    _ensure_room_ownership(db, room_id, current_user.user_id)

    db_message = Message(
        chat_id=room_id,
        user_id=current_user.user_id,
        role=RoleEnum.USER,
        content=message.content,
    )
    db.add(db_message)
    db.commit()
    db.refresh(db_message)
    return db_message


def generate_and_save_assistant_reply(
    db: Session,
    *,
    room_id: int,
    current_user: User,
    system_prompt: str | None = None,
) -> Message:
    """최근 대화 이력을 바탕으로 OpenAI를 호출해 어시스턴트 응답을 생성하고 저장합니다."""
    _ensure_room_ownership(db, room_id, current_user.user_id)

    history = _load_chat_history(db, room_id=room_id)  # 대화 이력 로드
    oai_messages = _convert_history_to_openai_messages(history, system_prompt=system_prompt)  # OpenAI 포맷 변환

    assistant_text = _call_openai_chat(oai_messages)  # OpenAI 호출

    assistant_message = Message(
        chat_id=room_id,
        user_id=current_user.user_id,
        role=RoleEnum.ASSISTANT,
        content=assistant_text,
    )
    db.add(assistant_message)
    db.commit()
    db.refresh(assistant_message)
    return assistant_message


def create_message_and_reply(
    db: Session,
    *,
    room_id: int,
    current_user: User,
    message: MessageCreate,
    system_prompt: str | None = None,
) -> Tuple[Message, Message]:
    """사용자 메시지를 저장한 뒤 OpenAI를 호출해 응답을 생성/저장하고,
    (user_message, assistant_message) 튜플로 반환합니다."""
    user_msg = save_user_message(db, room_id=room_id, current_user=current_user, message=message)
    assistant_msg = generate_and_save_assistant_reply(
        db, room_id=room_id, current_user=current_user, system_prompt=system_prompt
    )
    return user_msg, assistant_msg


