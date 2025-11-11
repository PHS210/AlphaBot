from sqlalchemy import Column, Integer, String, DateTime, func

from app.models import Base


class Category(Base):
    """카테고리 테이블 모델"""
    __tablename__ = "category"

    category_id = Column(Integer, primary_key=True, index=True)
    title = Column(String(50), nullable=False, unique=True, index=True)
    description = Column(String(200), nullable=False)
    created_at = Column(DateTime(timezone=False), server_default=func.now())

    def __repr__(self):
        return f"<Category(id={self.category_id}, title='{self.title}')>"
 