"""Create news_vectors and news_chunks tables for embeddings.

Revision ID: rev20250229_add_vectors
Revises: rev20250228_drop_pub_at
Create Date: 2025-11-30 10:00:00.000000
"""

from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql
from pgvector.sqlalchemy import Vector  # type: ignore[import-not-found]


revision: str = "rev20250229_add_vectors"
down_revision: Union[str, None] = "rev20250228_drop_pub_at"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.execute("CREATE EXTENSION IF NOT EXISTS vector")

    op.create_table(
        "news_vectors",
        sa.Column(
            "id",
            postgresql.UUID(as_uuid=True),
            primary_key=True,
            nullable=False,
        ),
        sa.Column("title", sa.Text(), nullable=False),
        sa.Column("content", sa.Text(), nullable=False),
        sa.Column("embedding", Vector(dim=1536)),
        sa.Column("published_at", sa.DateTime(), nullable=True),
        schema="public",
    )

    op.create_table(
        "news_chunks",
        sa.Column(
            "id",
            postgresql.UUID(as_uuid=True),
            primary_key=True,
            nullable=False,
        ),
        sa.Column(
            "news_id",
            postgresql.UUID(as_uuid=True),
            sa.ForeignKey("public.news_vectors.id", ondelete="CASCADE"),
            nullable=False,
        ),
        sa.Column("chunk_index", sa.Integer(), nullable=False),
        sa.Column("chunk_text", sa.Text(), nullable=False),
        sa.Column("embedding", Vector(dim=1536)),
        sa.Column("published_at", sa.DateTime(), nullable=True),
        sa.Column("title", sa.Text(), nullable=True),
        schema="public",
    )

    op.create_index(
        "ix_news_chunks_news_id_chunk_index",
        "news_chunks",
        ["news_id", "chunk_index"],
        unique=True,
        schema="public",
    )


def downgrade() -> None:
    op.drop_index(
        "ix_news_chunks_news_id_chunk_index",
        table_name="news_chunks",
        schema="public",
    )
    op.drop_table("news_chunks", schema="public")
    op.drop_table("news_vectors", schema="public")

