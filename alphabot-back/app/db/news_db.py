from __future__ import annotations

import os
from typing import Generator, Optional

from dotenv import load_dotenv
from sqlalchemy import create_engine
from sqlalchemy.engine import Engine
from sqlalchemy.orm import Session, declarative_base, sessionmaker

load_dotenv()


def _build_news_db_url() -> Optional[str]:
    direct_url = os.getenv("NEWS_DB_URL")
    if direct_url:
        return direct_url

    user = os.getenv("NEWS_DB_USER")
    password = os.getenv("NEWS_DB_PASSWORD")
    host = os.getenv("NEWS_DB_HOST")
    port = os.getenv("NEWS_DB_PORT")
    name = os.getenv("NEWS_DB_NAME")

    if all([user, password, host, port, name]):
        # psycopg v3 드라이버 사용 (requirements.txt 에 맞춤)
        return f"postgresql+psycopg://{user}:{password}@{host}:{port}/{name}"
    return None


NEWS_DB_URL = _build_news_db_url()

NewsBase = declarative_base()

if NEWS_DB_URL:
    NewsEngine: Engine = create_engine(NEWS_DB_URL, echo=False, pool_pre_ping=True)
    NewsSessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=NewsEngine)
else:
    NewsEngine = None  # type: ignore
    NewsSessionLocal = None  # type: ignore
    print(
        "[news_db] NEWS_DB_* 환경 변수가 없어 뉴스/임베딩 DB 연동을 비활성화합니다.",
        flush=True,
    )


def is_news_db_configured() -> bool:
    return NewsSessionLocal is not None


def get_news_session() -> Session:
    if NewsSessionLocal is None:
        raise RuntimeError(
            "NEWS DB 세션을 생성할 수 없습니다. NEWS_DB_* 환경 변수를 설정해주세요."
        )
    return NewsSessionLocal()


def get_news_db() -> Generator[Session, None, None]:
    db = get_news_session()
    try:
        yield db
    finally:
        db.close()

