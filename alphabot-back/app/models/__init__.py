from __future__ import annotations

import enum
from datetime import datetime
from typing import List, Optional

from sqlalchemy import DateTime, Enum, ForeignKey, Integer, Sequence, String, Text, func
from sqlalchemy.orm import DeclarativeBase, Mapped, mapped_column, relationship


class Base(DeclarativeBase):
    """Declarative base for ORM models."""


class RoleEnum(str, enum.Enum):
    USER = "user"
    ASSISTANT = "assistant"


class TrashEnum(str, enum.Enum):
    IN = "in"
    OUT = "out"


role_enum = Enum(RoleEnum, name="role_enum", metadata=Base.metadata)
trash_enum = Enum(TrashEnum, name="trash_enum", metadata=Base.metadata)

#수정. 계획한 user 테이블에 맞게끔.
class User(Base):
    __tablename__ = "users"

    user_id: Mapped[int] = mapped_column(
        Integer,
        Sequence("users_user_id_seq", start=1, increment=1),
        primary_key=True,
    )
    login_id: Mapped[str] = mapped_column(String(50), nullable=False, unique=True)#추가
    username: Mapped[str] = mapped_column(String(50), nullable=False)
    #삭제 email: Mapped[str] = mapped_column(String(100), nullable=False, unique=True)
    hashed_pw: Mapped[str] = mapped_column(String(255), nullable=False)#이름만 컬럼명과 동일하게 변경
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=False), server_default=func.now(), nullable=False
    )

    chats: Mapped[List["Chat"]] = relationship(
        back_populates="owner", cascade="all, delete-orphan"
    )
    messages: Mapped[List["Message"]] = relationship(
        back_populates="author", cascade="all, delete-orphan"
    )
    bookmarks: Mapped[List["Bookmark"]] = relationship(
        back_populates="user", cascade="all, delete-orphan"
    )


class Category(Base):
    __tablename__ = "category"

    category_id: Mapped[int] = mapped_column(
        Integer,
        Sequence("category_category_id_seq", start=1, increment=1),
        primary_key=True,
    )
    title: Mapped[str] = mapped_column(String(50), nullable=False)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=False), server_default=func.now(), nullable=False
    )

    bookmarks: Mapped[List["Bookmark"]] = relationship(back_populates="category")


class Chat(Base):
    __tablename__ = "chat"

    chat_id: Mapped[int] = mapped_column(
        Integer,
        Sequence("chat_chat_id_seq", start=1, increment=1),
        primary_key=True,
    )
    user_id: Mapped[int] = mapped_column(
        ForeignKey("users.user_id", ondelete="CASCADE"), nullable=False
    )
    title: Mapped[str] = mapped_column(String(100), nullable=False)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=False), server_default=func.now(), nullable=False
    )
    lastchat_at: Mapped[Optional[datetime]] = mapped_column(DateTime(timezone=False))
    trash_can: Mapped[TrashEnum] = mapped_column(
        trash_enum, server_default=TrashEnum.IN.value, nullable=False
    )

    owner: Mapped[User] = relationship(back_populates="chats")
    messages: Mapped[List["Message"]] = relationship(
        back_populates="chat", cascade="all, delete-orphan"
    )


class Message(Base):
    __tablename__ = "messages"

    messages_id: Mapped[int] = mapped_column(
        Integer,
        Sequence("messages_messages_id_seq", start=1, increment=1),
        primary_key=True,
    )
    user_id: Mapped[int] = mapped_column(
        ForeignKey("users.user_id", ondelete="CASCADE"), nullable=False
    )
    chat_id: Mapped[int] = mapped_column(
        ForeignKey("chat.chat_id", ondelete="CASCADE"), nullable=False
    )
    role: Mapped[RoleEnum] = mapped_column(
        role_enum, server_default=RoleEnum.USER.value, nullable=False
    )
    content: Mapped[str] = mapped_column(Text, nullable=False)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=False), server_default=func.now(), nullable=False
    )

    author: Mapped[User] = relationship(back_populates="messages")
    chat: Mapped[Chat] = relationship(back_populates="messages")
    bookmarks: Mapped[List["Bookmark"]] = relationship(
        back_populates="message", cascade="all, delete-orphan"
    )


class Bookmark(Base):
    __tablename__ = "bookmark"

    bookmark_id: Mapped[int] = mapped_column(
        Integer,
        Sequence("bookmark_bookmark_id_seq", start=1, increment=1),
        primary_key=True,
    )
    user_id: Mapped[int] = mapped_column(
        ForeignKey("users.user_id", ondelete="CASCADE"), nullable=False
    )
    messages_id: Mapped[int] = mapped_column(
        ForeignKey("messages.messages_id", ondelete="CASCADE"), nullable=False
    )
    category_id: Mapped[Optional[int]] = mapped_column(
        ForeignKey("category.category_id"), nullable=True
    )
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=False), server_default=func.now(), nullable=False
    )

    user: Mapped[User] = relationship(back_populates="bookmarks")
    message: Mapped[Message] = relationship(back_populates="bookmarks")
    category: Mapped[Optional[Category]] = relationship(back_populates="bookmarks")
