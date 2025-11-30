from __future__ import annotations

"""
Utility script that reads NewsArticle records, generates OpenAI embeddings,
and persists them into the pgvector-backed news_vectors/news_chunks tables.

Usage:
    python -m app.scripts.embed_news_embeddings --limit 50 --chunk-size 700
"""

import argparse
import re
from typing import Iterable, List

from sqlalchemy.orm import Session

from app.db.database import SessionLocal
from app.models.models import NewsArticle
from app.models.news_vector import NewsVector, chunkVector
from app.services.news_vector_service import get_news_session
from app.services.rag_service import RAGService


def chunk_text(text: str, max_chars: int) -> List[str]:
    """Split a block of text into roughly max_chars sized chunks."""
    normalized = re.sub(r"\s+", " ", text.strip())
    if not normalized:
        return []

    chunks: List[str] = []
    start = 0
    while start < len(normalized):
        end = min(start + max_chars, len(normalized))
        chunks.append(normalized[start:end])
        start = end
    return chunks


def fetch_articles(db: Session, limit: int, offset: int) -> List[NewsArticle]:
    query = (
        db.query(NewsArticle)
        .order_by(NewsArticle.article_id.asc())
        .offset(offset)
    )
    if limit > 0:
        query = query.limit(limit)
    return query.all()


def vector_exists(news_db: Session, article: NewsArticle) -> bool:
    return (
        news_db.query(NewsVector)
        .filter(
            NewsVector.title == article.title,
            NewsVector.content == article.content,
        )
        .first()
        is not None
    )


def embed_article(
    rag: RAGService,
    article: NewsArticle,
    news_db: Session,
    chunk_size: int,
    embed_full_article: bool,
) -> None:
    if vector_exists(news_db, article):
        print(f"[SKIP] '{article.title}' already embedded")
        return

    base_vector = NewsVector(
        title=article.title,
        content=article.content,
        published_at=None,
    )
    if embed_full_article:
        embedding = rag.get_embedding(article.content)
        if embedding:
            base_vector.embedding = embedding

    news_db.add(base_vector)
    news_db.flush()

    chunks = chunk_text(article.content, max_chars=chunk_size)
    print(
        f"  -> generating {len(chunks)} chunk(s) for article_id={article.article_id}"
    )
    for idx, chunk in enumerate(chunks):
        chunk_embedding = rag.get_embedding(chunk)
        if not chunk_embedding:
            print(f"     [WARN] chunk #{idx} embedding failed; skipping")
            continue
        news_db.add(
            chunkVector(
                news_id=base_vector.id,
                chunk_index=idx,
                chunk_text=chunk,
                embedding=chunk_embedding,
                published_at=None,
                title=article.title,
            )
        )
    news_db.commit()


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(
        description="Generate embeddings for NewsArticle rows"
    )
    parser.add_argument(
        "--limit",
        type=int,
        default=50,
        help="Maximum number of articles to process (<=0 means all)",
    )
    parser.add_argument(
        "--offset",
        type=int,
        default=0,
        help="Offset to start fetching articles from",
    )
    parser.add_argument(
        "--chunk-size",
        type=int,
        default=700,
        help="Maximum characters per chunk when splitting article content",
    )
    parser.add_argument(
        "--skip-full-embedding",
        action="store_true",
        help="Skip storing the full-article embedding (chunks are always embedded)",
    )
    return parser.parse_args()


def main() -> None:
    args = parse_args()
    rag = RAGService()

    main_db: Session | None = None
    news_db: Session | None = None
    try:
        main_db = SessionLocal()
        news_db = get_news_session()

        articles = fetch_articles(main_db, args.limit, args.offset)
        if not articles:
            print("No articles found for embedding.")
            return

        for article in articles:
            embed_article(
                rag=rag,
                article=article,
                news_db=news_db,
                chunk_size=args.chunk_size,
                embed_full_article=not args.skip_full_embedding,
            )
    finally:
        if main_db:
            main_db.close()
        if news_db:
            news_db.close()


if __name__ == "__main__":
    main()

