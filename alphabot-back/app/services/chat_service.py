from __future__ import annotations

from typing import Any, List, Tuple, Optional

import json

import os
import re
from contextlib import closing
from fastapi import HTTPException, status
from sqlalchemy import func
from sqlalchemy.orm import Session
from sqlalchemy.exc import IntegrityError

from app.models.models import Chat, Message, RoleEnum, TrashEnum, User
from app.schemas.chats import ChatCreate, ChatUpdate, MessageCreate
try:
    from app.services.news_vector_service import (
        get_news_session,
        is_news_db_configured,
    )
except Exception as exc:  # pragma: no cover - optional dependency
    get_news_session = None  # type: ignore
    is_news_db_configured = lambda: False  # type: ignore
    print(f"[chat_service] 뉴스 DB를 사용할 수 없어 RAG 기능을 비활성화합니다: {exc}", flush=True)
from app.services.rag_service import rag_service

# 이 모듈은 OpenAI API를 활용해 챗봇 응답을 생성하고,
# 대화 이력을 DB에 저장/조회하는 서비스 로직을 제공합니다.


try:
    # OpenAI Python SDK v1.x 사용
    from openai import OpenAI  # type: ignore[import-not-found]
except Exception:  # pragma: no cover - openai 미설치/런타임 환경 보호
    OpenAI = None  # type: ignore


_OPENAI_MODEL_DEFAULT = os.getenv("OPENAI_MODEL", "gpt-5-mini")  # 기본 모델
_OPENAI_TEMPERATURE_DEFAULT = float(os.getenv("OPENAI_TEMPERATURE", "0.2"))  # 샘플링 온도
_OPENAI_MAX_TOKENS_DEFAULT = int(os.getenv("OPENAI_MAX_TOKENS", "512"))  # 최대 토큰 수
_OPENAI_RESPONSES_MIN_OUTPUT_TOKENS = int(
    os.getenv("OPENAI_RESPONSES_MIN_OUTPUT_TOKENS", "1024")
)
_OPENAI_RESPONSES_MAX_OUTPUT_TOKENS = int(
    os.getenv("OPENAI_RESPONSES_MAX_OUTPUT_TOKENS", "4096")
)

_ENABLE_RAG_NEWS_CONFIG = os.getenv("CHAT_ENABLE_RAG_NEWS", "true").lower() not in {
    "0",
    "false",
    "no",
}
_ENABLE_RAG_NEWS_AVAILABLE = (
    is_news_db_configured() if callable(is_news_db_configured) else False
)
_ENABLE_RAG_NEWS = _ENABLE_RAG_NEWS_CONFIG and _ENABLE_RAG_NEWS_AVAILABLE
_RAG_NEWS_TOP_K = int(os.getenv("CHAT_RAG_NEWS_TOP_K", "12"))
_RAG_NEWS_SUMMARY_LIMIT = int(os.getenv("CHAT_RAG_NEWS_SUMMARY_LIMIT", "4"))
_RAG_NEWS_SIMILARITY_THRESHOLD = float(os.getenv("CHAT_RAG_NEWS_SIMILARITY", "0.35"))

_STOCK_CODE_PATTERN = re.compile(r'^[A-Z0-9.\-]{1,20}$')

_RESPONSES_ONLY_PREFIXES = (
    "gpt-4.1",
    "gpt-5-mini",
    "o4",
    "o5",
    "o1",
)

_ASSISTANT_FALLBACK_MESSAGE = (
    "죄송합니다. 지금은 답변을 생성할 수 없어요. 잠시 후 다시 시도해주세요."
)


def _log_openai_debug(message: str) -> None:
    print(f"[chat_service][debug] {message}", flush=True)


def _log_responses_payload(prefix: str, payload: Any) -> None:
    try:
        if hasattr(payload, "model_dump"):
            payload = payload.model_dump()
    except Exception:
        pass

    try:
        serialized = json.dumps(payload, ensure_ascii=False, default=str)
        _log_openai_debug(f"{prefix} payload: {serialized[:1500]}{'...' if len(serialized) > 1500 else ''}")
    except Exception as exc:
        _log_openai_debug(f"{prefix} payload serialization failed: {exc}")


def _get_from_obj(obj: Any, key: str, default: Any | None = None) -> Any | None:
    """dict/객체 양쪽에서 안전하게 속성을 꺼내는 헬퍼."""
    if obj is None:
        return default
    if isinstance(obj, dict):
        return obj.get(key, default)
    return getattr(obj, key, default)


def _coerce_text_value(value: Any) -> Optional[str]:
    """Responses API에서 다양한 텍스트 표현을 문자열로 정규화합니다."""
    if value is None:
        return None
    if isinstance(value, str):
        return value
    if isinstance(value, (int, float)):
        return str(value)
    if isinstance(value, (list, tuple)):
        parts = [part for part in (_coerce_text_value(item) for item in value) if part]
        return "\n".join(parts) if parts else None

    # dataclass/객체 혹은 dict 형태에서 value/text/content 필드를 탐색
    nested_keys = ("value", "text", "content")
    for key in nested_keys:
        nested = _get_from_obj(value, key)
        if nested is None:
            continue
        resolved = _coerce_text_value(nested)
        if resolved:
            return resolved

    # 마지막 fallback으로 문자열 표현을 반환
    text_repr = str(value).strip()
    return text_repr or None


def _should_use_responses_api(model: str) -> bool:
    """Responses API 전용 모델인지 간단한 문자열 규칙으로 판별합니다."""
    normalized = (model or "").lower()
    return normalized.startswith(_RESPONSES_ONLY_PREFIXES)


def _format_messages_for_responses(messages: List[dict]) -> List[dict]:
    """Chat completions 포맷을 Responses API 입력 포맷으로 변환합니다."""
    formatted: List[dict] = []
    for msg in messages:
        role = msg.get("role", "user")
        content_text = msg.get("content", "")

        if role == "assistant":
            content_type = "output_text"
        else:
            content_type = "input_text"

        formatted.append(
            {
                "role": role,
                "content": [
                    {
                        "type": content_type,
                        "text": content_text,
                    }
                ],
            }
        )
    return formatted


def _extract_text_from_responses(resp: Any) -> str:
    """Responses API 응답 객체에서 텍스트를 추출합니다."""
    resp_data = resp
    if hasattr(resp, "model_dump"):
        try:
            resp_data = resp.model_dump()
        except Exception:
            resp_data = resp

    outputs = (
        _get_from_obj(resp_data, "output")
        or _get_from_obj(resp_data, "outputs")
        or []
    )
    if outputs and not isinstance(outputs, list):
        outputs = [outputs]

    for output in outputs:
        if _get_from_obj(output, "type") not in {"message", "output_text"}:
            continue
        contents = _get_from_obj(output, "content") or []
        if contents and not isinstance(contents, list):
            contents = [contents]
        for content in contents:
            content_type = _get_from_obj(content, "type")
            if content_type in {"text", "output_text"}:
                text_value = _coerce_text_value(_get_from_obj(content, "text"))
                if text_value:
                    return text_value
                text_value = _coerce_text_value(_get_from_obj(content, "content"))
                if text_value:
                    return text_value

    # SDK가 `output_text` 헬퍼를 제공하는 경우 사용
    fallback = _coerce_text_value(_get_from_obj(resp_data, "output_text") or _get_from_obj(resp, "output_text"))
    if fallback:
        return fallback

    _log_responses_payload("responses API missing text", resp_data)
    raise HTTPException(
        status_code=status.HTTP_502_BAD_GATEWAY,
        detail="OpenAI returned empty response",
    )


def _extract_text_from_chat_choice(choice: Any) -> Optional[str]:
    """Chat Completions API 응답의 단일 choice에서 텍스트를 안전하게 추출합니다."""
    if choice is None:
        return None

    message = _get_from_obj(choice, "message") or choice
    content = _get_from_obj(message, "content")
    text_value = _coerce_text_value(content)
    if text_value:
        return text_value

    # 일부 SDK는 delta 필드에 텍스트를 담기도 하므로 추가 확인
    delta = _get_from_obj(message, "delta") or _get_from_obj(choice, "delta")
    text_value = _coerce_text_value(delta)
    if text_value:
        return text_value

    return None


def _is_empty_openai_http_error(exc: HTTPException) -> bool:
    detail = exc.detail if isinstance(exc.detail, str) else str(exc.detail)
    return (
        exc.status_code == status.HTTP_502_BAD_GATEWAY
        and "OpenAI returned empty response" in detail
    )


def _fallback_assistant_response(reason: str) -> str:
    _log_openai_debug(f"OpenAI response empty, returning fallback ({reason})")
    return _ASSISTANT_FALLBACK_MESSAGE


def _get_incomplete_reason(resp: Any) -> Optional[str]:
    """Responses API 응답에서 incomplete 사유를 안전하게 추출합니다."""
    incomplete = _get_from_obj(resp, "incomplete_details")
    if not incomplete:
        return None
    reason = _get_from_obj(incomplete, "reason")
    return str(reason) if reason else None


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


def _extract_latest_user_text(history: List[Message]) -> Optional[str]:
    """대화 이력에서 가장 최근 사용자 메시지 내용을 찾습니다."""
    for message in reversed(history):
        role_value = message.role.value if hasattr(message.role, "value") else str(message.role)
        if role_value == RoleEnum.user.value:
            return message.content
    return None


def _build_rag_news_summary(
    stock_code: str | None,
    *,
    latest_user_text: str | None = None,
    max_items: int = _RAG_NEWS_SUMMARY_LIMIT,
) -> Optional[str]:
    """RAG 기반으로 종목 관련 최신 뉴스 요약을 생성합니다."""
    if not _ENABLE_RAG_NEWS or not stock_code or get_news_session is None:
        return None

    try:
        with closing(get_news_session()) as news_db:
            queries = []
            if latest_user_text:
                queries.append(latest_user_text)
            queries.append(stock_code)

            docs: List[dict] = []
            for query in queries:
                docs = rag_service.similarity_search(
                    query=query,
                    db=news_db,
                    top_k=_RAG_NEWS_TOP_K,
                    similarity_threshold=_RAG_NEWS_SIMILARITY_THRESHOLD,
                )
                if docs:
                    break
    except Exception as exc:  # pragma: no cover - 외부 의존성 실패 시 무시
        print(f"[chat_service] 뉴스 요약 RAG 실패: {exc}", flush=True)
        return None

    if not docs:
        return None

    summary_lines: List[str] = []
    for idx, doc in enumerate(docs[:max_items], start=1):
        title = doc.get("title") or "제목 없음"
        published_at = doc.get("published_at") or "발행일 미상"
        raw_content = doc.get("content") or ""
        snippet = re.sub(r"\s+", " ", raw_content).strip()
        if len(snippet) > 200:
            snippet = f"{snippet[:200]}..."
        summary_lines.append(f"{idx}. {title} ({published_at}): {snippet}")

    return (
        f"[뉴스 요약]\n"
        f"{stock_code} 관련 최신 기사에서 추출한 핵심 내용입니다. 필요한 경우 아래 정보를 참고해 답변하세요.\n"
        + "\n".join(summary_lines)
    )


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
        _log_openai_debug(
            f"call_openai_chat start model={model} "
            f"messages={len(messages)} responses_api={_should_use_responses_api(model)}"
        )
        if _should_use_responses_api(model):
            responses_input = _format_messages_for_responses(messages)
            responses_max_tokens = max(max_tokens, _OPENAI_RESPONSES_MIN_OUTPUT_TOKENS)
            responses_max_tokens = min(responses_max_tokens, _OPENAI_RESPONSES_MAX_OUTPUT_TOKENS)
            # Responses API 모델(o*, gpt-4.1+, gpt-5+ 등)은 temperature 파라미터를 받지 않으므로 제외
            resp = client.responses.create(
                model=model,
                input=responses_input,
                max_output_tokens=responses_max_tokens,
            )
            _log_openai_debug(
                f"responses.create done output_count="
                f"{len(_get_from_obj(resp, 'output') or _get_from_obj(resp, 'outputs') or [])} "
                f"status={_get_from_obj(resp, 'status')} tokens={responses_max_tokens}"
            )
            incomplete_reason = _get_incomplete_reason(resp)
            if (
                incomplete_reason == "max_output_tokens"
                and responses_max_tokens < _OPENAI_RESPONSES_MAX_OUTPUT_TOKENS
            ):
                retry_tokens = min(
                    _OPENAI_RESPONSES_MAX_OUTPUT_TOKENS,
                    max(int(responses_max_tokens * 1.5), responses_max_tokens + 256),
                )
                _log_openai_debug(
                    "responses API incomplete due to max_output_tokens – "
                    f"retrying with max_output_tokens={retry_tokens}"
                )
                resp = client.responses.create(
                    model=model,
                    input=responses_input,
                    max_output_tokens=retry_tokens,
                )
                responses_max_tokens = retry_tokens
                _log_openai_debug(
                    f"responses retry done status={_get_from_obj(resp, 'status')} "
                    f"output_count={len(_get_from_obj(resp, 'output') or _get_from_obj(resp, 'outputs') or [])}"
                )
            try:
                text = _extract_text_from_responses(resp)
            except HTTPException as exc:
                if _is_empty_openai_http_error(exc):
                    return _fallback_assistant_response("responses API")
                raise
            if text:
                _log_openai_debug(f"responses API returned text length={len(text)}")
                return text
            return _fallback_assistant_response("responses API empty string")

        resp = client.chat.completions.create(
            model=model,
            messages=messages,
            temperature=temperature,
            max_tokens=max_tokens,
        )
        _log_openai_debug(
            f"chat.completions.create done choices={len(resp.choices or [])} "
            f"finish_reason={_get_from_obj(resp.choices[0], 'finish_reason') if resp.choices else 'none'}"
        )
        choice = resp.choices[0] if resp.choices else None
        content = _extract_text_from_chat_choice(choice)
        if not content:
            return _fallback_assistant_response("chat completions")
        _log_openai_debug(f"chat completions returned text length={len(content)}")
        return content
    except HTTPException as exc:
        if _is_empty_openai_http_error(exc):
            return _fallback_assistant_response("chat completions HTTPException")
        raise
    except Exception as exc:  # pragma: no cover - network failures
        _log_openai_debug(f"OpenAI chat completion exception: {exc}")
        raise HTTPException(
            status_code=status.HTTP_502_BAD_GATEWAY,
            detail=f"OpenAI chat completion failed: {exc}",
        )


def save_user_message(
    db: Session, *, room_id: int, current_user: User, message: MessageCreate
) -> Message:
    """사용자의 메시지를 해당 채팅방에 저장하고 저장된 레코드를 반환합니다."""
    chat = _ensure_room_ownership(db, room_id, current_user.user_id)

    db_message = Message(
        chat_id=room_id,
        user_id=current_user.user_id,
        role=RoleEnum.user,
        content=message.content,
    )
    db.add(db_message)
    chat.lastchat_at = func.now()
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
    chat = _ensure_room_ownership(db, room_id, current_user.user_id)

    history = _load_chat_history(db, room_id=room_id)  # 대화 이력 로드
    latest_user_text = _extract_latest_user_text(history)
    rag_summary = _build_rag_news_summary(chat.stock_code, latest_user_text=latest_user_text)

    oai_messages = _convert_history_to_openai_messages(history, system_prompt=system_prompt)  # OpenAI 포맷 변환
    if rag_summary:
        insert_idx = 1 if system_prompt else 0
        oai_messages.insert(insert_idx, {"role": "system", "content": rag_summary})

    assistant_text = _call_openai_chat(oai_messages)  # OpenAI 호출

    assistant_message = Message(
        chat_id=room_id,
        user_id=current_user.user_id,
        role=RoleEnum.assistant,
        content=assistant_text,
    )
    db.add(assistant_message)
    chat.lastchat_at = func.now()
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


def fetch_chat_messages(
    db: Session,
    *,
    room_id: int,
    current_user: User,
    last_message_id: int | None = None,
) -> List[Message]:
    """채팅방 소유자 검증 후 메시지 목록을 반환합니다."""
    _ensure_room_ownership(db, room_id, current_user.user_id)

    query = db.query(Message).filter(Message.chat_id == room_id)
    if last_message_id is not None:
        query = query.filter(Message.messages_id > last_message_id)
    return query.order_by(Message.created_at.asc()).all()


def list_user_chat_rooms(db: Session, *, current_user: User) -> List[Chat]:
    """사용자가 소유한 모든 채팅방을 반환합니다."""
    return db.query(Chat).filter(Chat.user_id == current_user.user_id).all()


def create_chat_room_for_user(
    db: Session,
    *,
    current_user: User,
    chat_in: ChatCreate,
) -> Chat:
    """사용자의 종목 채팅방을 생성하거나 기존 방을 반환합니다."""
    existing_chat = None
    if chat_in.stock_code:
        existing_chat = (
            db.query(Chat)
            .filter(
                Chat.user_id == current_user.user_id,
                Chat.stock_code == chat_in.stock_code,
                Chat.trash_can == TrashEnum.in_.value,
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


def get_chat_room_by_stock_for_user(
    db: Session,
    *,
    current_user: User,
    stock_code: str,
) -> Chat:
    """특정 종목의 채팅방을 조회합니다."""
    chat = (
        db.query(Chat)
        .filter(
            Chat.user_id == current_user.user_id,
            Chat.stock_code == stock_code,
            Chat.trash_can == TrashEnum.in_.value,
        )
        .first()
    )
    if not chat:
        raise HTTPException(status_code=404, detail="Chat room for stock not found")
    return chat


def update_chat_room_for_user(
    db: Session,
    *,
    room_id: int,
    current_user: User,
    chat_in: ChatUpdate,
) -> Chat:
    """채팅방 정보를 수정합니다."""
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



def normalize_stock_code(raw_code: str) -> str:
    """종목 코드를 정규화(트림, 대문자, 길이 제한) 후 검증합니다."""
    if raw_code is None:
        raise ValueError("stock_code is required")

    normalized = re.sub(r"\s+", "", raw_code).upper()
    if not normalized:
        raise ValueError("stock_code is empty")
    if len(normalized) > 20:
        raise ValueError("stock_code must be 20 chars or fewer")
    if not _STOCK_CODE_PATTERN.match(normalized):
        raise ValueError("stock_code contains invalid characters")
    return normalized


def get_active_chat_by_stock(db: Session, user_id: int, stock_code: str) -> Optional[Chat]:
    """해당 로그인 사용자가 보유한 활성(휴지통 아님) 종목 채팅방을 반환합니다."""
    return (
        db.query(Chat)
        .filter(
            Chat.user_id == user_id,
            Chat.stock_code == stock_code,
            Chat.trash_can == TrashEnum.out.value,
        )
        .first()
    )


def upsert_chat_by_stock(
    db: Session,
    *,
    user: User,
    stock_code: str,
    title: Optional[str] = None,
) -> Tuple[Chat, bool]:
    """종목별 채팅방을 조회하고 없으면 복원하거나 새로 만듭니다."""
    existing = get_active_chat_by_stock(db, user.user_id, stock_code)
    if existing:
        return existing, True
    
    trashed = (
        db.query(Chat)
        .filter(
            Chat.user_id == user.user_id,
            Chat.stock_code == stock_code,
            Chat.trash_can == TrashEnum.in_.value,
        )
        .order_by(Chat.chat_id.desc())
        .first()
    )

    #휴지통에 있을 경우 실행
    if trashed:
        trashed.trash_can = TrashEnum.out.value
        if title:
            trashed.title = title.strip() or trashed.title
        db.commit()
        db.refresh(trashed)
        return trashed, False

    room_title = (title.strip() if title else None) or f"{stock_code} 채팅"
    new_chat = Chat(
        user_id=user.user_id,
        title=room_title,
        stock_code=stock_code,
        trash_can=TrashEnum.out.value,
    )
    
    db.add(new_chat)
    try:
        db.commit()
    except IntegrityError:
        db.rollback()
        existing = get_active_chat_by_stock(db, user.user_id, stock_code)
        if existing is None:
            raise
        return existing, True

    db.refresh(new_chat)
    return new_chat, False
