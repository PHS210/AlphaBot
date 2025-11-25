from sqlalchemy import Column,Text,DateTime,Integer,ForeignKey
from sqlalchemy.orm import relationship
from sqlalchemy.dialects.postgresql import UUID
from pgvector.sqlalchemy import Vector
import uuid
from app.db import Base
#from app.services.news_vector_service import NewsBase #[수정] 경로 변경

class NewsVector(Base): #[수정] NewsBase -> Base
    __tablename__="news_vectors"
    
    id = Column(UUID(as_uuid=True),primary_key=True,default=uuid.uuid4)
    title = Column(Text,nullable=False)
    content = Column(Text,nullable=False)
    embedding = Column(Vector(1536))
    published_at = Column(DateTime)
    
    chunks = relationship("chunkVector", back_populates="news")

class chunkVector(Base): #[수정] NewsBase -> Base
    __tablename__="news_chunks"
    
    id = Column(UUID(as_uuid=True),primary_key=True,default=uuid.uuid4)
    news_id = Column(UUID(as_uuid=True),ForeignKey("news_vectors.id"),nullable=False)
    chunk_index = Column(Integer,nullable=False)
    chunk_text = Column(Text,nullable=False)
    embedding = Column(Vector(1536))
    published_at = Column(DateTime)
    title = Column(Text)
    
    news = relationship("NewsVector",back_populates="chunks")