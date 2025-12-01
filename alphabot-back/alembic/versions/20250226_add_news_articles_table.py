"""add news articles table

Revision ID: 20250226_add_news_articles_table
Revises: d48801d755b6
Create Date: 2025-11-28 00:00:00.000000
"""

from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = "20250226_add_news_articles_table"
down_revision: Union[str, None] = "d48801d755b6"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.create_table(
        "news_articles",
        sa.Column("article_id", sa.Integer(), nullable=False),
        sa.Column("category", sa.String(length=100), nullable=False),
        sa.Column("title", sa.Text(), nullable=False),
        sa.Column("content", sa.Text(), nullable=False),
        sa.Column("url", sa.Text(), nullable=False),
        sa.Column("source", sa.String(length=50), nullable=False, server_default=sa.text("'NAVER_FINANCE'")),
        sa.Column("published_at", sa.TIMESTAMP(timezone=False), nullable=True),
        sa.Column("published_at_text", sa.String(length=64), nullable=True),
        sa.Column("created_at", sa.TIMESTAMP(timezone=False), server_default=sa.text("now()"), nullable=False),
        sa.PrimaryKeyConstraint("article_id"),
        schema="public",
    )
    op.create_unique_constraint(
        "uq_news_articles_url",
        "news_articles",
        ["url"],
        schema="public",
    )


def downgrade() -> None:
    op.drop_constraint("uq_news_articles_url", "news_articles", schema="public")
    op.drop_table("news_articles", schema="public")

