from sqlalchemy import Column, DateTime, ForeignKey, Integer, Text
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import relationship
from pgvector.sqlalchemy import Vector  # type: ignore[import-not-found]
import uuid

from app.services.news_vector_service import NewsBase


class NewsVector(NewsBase):
    __tablename__ = "news_vectors"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    title = Column(Text, nullable=False)
    content = Column(Text, nullable=False)
    embedding = Column(Vector(1536))
    published_at = Column(DateTime)

    chunks = relationship("chunkVector", back_populates="news")


class chunkVector(NewsBase):
    __tablename__ = "news_chunks"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    news_id = Column(UUID(as_uuid=True), ForeignKey("news_vectors.id"), nullable=False)
    chunk_index = Column(Integer, nullable=False)
    chunk_text = Column(Text, nullable=False)
    embedding = Column(Vector(1536))
    published_at = Column(DateTime)
    title = Column(Text)

    news = relationship("NewsVector", back_populates="chunks")


__all__ = ["NewsVector", "chunkVector"]