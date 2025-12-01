"""Drop published_at from news_articles in favor of published_at_text.

Revision ID: rev20250228_drop_pub_at
Revises: 20250226_add_news_articles_table
Create Date: 2025-11-29 12:00:00.000000
"""

from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


revision: str = "rev20250228_drop_pub_at"
down_revision: Union[str, None] = "20250226_add_news_articles_table"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def _get_columns(table_name: str, schema: str = "public") -> set[str]:
    bind = op.get_bind()
    inspector = sa.inspect(bind)
    return {col["name"] for col in inspector.get_columns(table_name, schema=schema)}


def upgrade() -> None:
    columns = _get_columns("news_articles")
    if "published_at" in columns:
        # Backfill published_at_text using the timestamp so we do not lose information.
        op.execute(
            sa.text(
                """
                UPDATE public.news_articles
                SET published_at_text = COALESCE(
                    published_at_text,
                    to_char(published_at, 'YYYY-MM-DD"T"HH24:MI:SS')
                )
                WHERE published_at IS NOT NULL
                """
            )
        )
        op.drop_column("news_articles", "published_at", schema="public")


def downgrade() -> None:
    columns = _get_columns("news_articles")
    if "published_at" not in columns:
        op.add_column(
            "news_articles",
            sa.Column("published_at", sa.TIMESTAMP(timezone=False), nullable=True),
            schema="public",
        )
        # Best-effort attempt to recreate timestamps from text values.
        op.execute(
            sa.text(
                """
                UPDATE public.news_articles
                SET published_at = NULL
                """
            )
        )

