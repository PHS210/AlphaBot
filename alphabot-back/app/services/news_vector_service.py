from typing import Generator, List

from sqlalchemy.orm import Session

from app.db.news_db import (
    NewsBase,
    get_news_db as _get_news_db,
    get_news_session as _get_news_session,
    is_news_db_configured as _is_news_db_configured,
)

get_news_session = _get_news_session
get_news_db = _get_news_db
is_news_db_configured = _is_news_db_configured


def save_news_vectors(session: Session, news_list: List) -> None:
    if not news_list:
        return
    session.add_all(news_list)
    session.commit()