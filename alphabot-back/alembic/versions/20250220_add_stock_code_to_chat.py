"""Add stock_code column and indexes to chat table

Revision ID: 20250220_add_stock_code_to_chat
Revises: 20250215_add_user_id_to_category
Create Date: 2025-11-20 12:00:00.000000
"""

from alembic import op
import sqlalchemy as sa


revision = "20250220_add_stock_code_to_chat"
down_revision = "20250215_add_user_id_to_category"
branch_labels = None
depends_on = None


def _get_columns(table_name: str, schema: str = "public") -> set[str]:
    bind = op.get_bind()
    inspector = sa.inspect(bind)
    return {col["name"] for col in inspector.get_columns(table_name, schema=schema)}


def _get_indexes(table_name: str, schema: str = "public") -> set[str]:
    bind = op.get_bind()
    inspector = sa.inspect(bind)
    return {idx["name"] for idx in inspector.get_indexes(table_name, schema=schema)}


def upgrade() -> None:
    existing_columns = _get_columns("chat")
    existing_indexes = _get_indexes("chat")

    if "stock_code" not in existing_columns:
        op.add_column(
            "chat",
            sa.Column("stock_code", sa.String(length=20), nullable=True),
            schema="public",
        )

    if "ix_chat_stock_code" not in existing_indexes:
        op.create_index(
            "ix_chat_stock_code",
            "chat",
            ["stock_code"],
            unique=False,
            schema="public",
        )

    if "ux_chat_user_stock_active" not in existing_indexes:
        op.create_index(
            "ux_chat_user_stock_active",
            "chat",
            ["user_id", "stock_code"],
            unique=True,
            schema="public",
            postgresql_where=sa.text("stock_code IS NOT NULL AND trash_can = 'out'"),
        )


def downgrade() -> None:
    existing_indexes = _get_indexes("chat")
    existing_columns = _get_columns("chat")

    if "ux_chat_user_stock_active" in existing_indexes:
        op.drop_index(
            "ux_chat_user_stock_active",
            table_name="chat",
            schema="public",
        )

    if "ix_chat_stock_code" in existing_indexes:
        op.drop_index(
            "ix_chat_stock_code",
            table_name="chat",
            schema="public",
        )

    if "stock_code" in existing_columns:
        op.drop_column("chat", "stock_code", schema="public")

