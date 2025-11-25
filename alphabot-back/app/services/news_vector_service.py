from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker, declarative_base, Session
from dotenv import load_dotenv
from typing import List
import os

load_dotenv()

pg_user = os.getenv("NEWS_DB_USER")
pg_passwd = os.getenv("NEWS_DB_PASSWORD")
pg_host = os.getenv("NEWS_DB_HOST")
#[수정] 값이 없으면 기본적으로 5432 포트를 사용하도록 설정
pg_port = os.getenv("NEWS_DB_PORT", "5432")
pg_db = os.getenv("NEWS_DB_NAME")

NEWS_DB_URL = f'postgresql+psycopg2://{pg_user}:{pg_passwd}@{pg_host}:{pg_port}/{pg_db}'

NewsEngine = create_engine(NEWS_DB_URL,echo=True)
NewsSessionLocal = sessionmaker(autocommit=False,autoflush=False,bind=NewsEngine)
NewsBase = declarative_base()

def get_news_db():
    db: Session = NewsSessionLocal()
    try:
        yield db
    finally:
        db.close()
        
    
def save_news_vectors(session: Session, news_list: List):
    if not news_list:
        return
    session.add_all(news_list)
    session.commit()