"""rename email/password columns to login_id/hashed_pw

Revision ID: 20241114_rename_user_columns
Revises:
Create Date: 2025-02-14 00:00:00.000000
"""

from alembic import op
import sqlalchemy as sa

revision = "20241114_rename_user_columns"
down_revision = None
branch_labels = None
depends_on = None


def _get_columns(table_name: str, schema: str = "public") -> set[str]:
    bind = op.get_bind()
    inspector = sa.inspect(bind)
    return {col["name"] for col in inspector.get_columns(table_name, schema=schema)}


def upgrade() -> None:
    existing_columns = _get_columns("users")

    with op.batch_alter_table("users", schema="public") as batch_op:
        if "email" in existing_columns and "login_id" not in existing_columns:
            batch_op.alter_column(
                "email",
                new_column_name="login_id",
                existing_type=sa.String(length=100),
                existing_nullable=False,
            )
        if "password" in existing_columns and "hashed_pw" not in existing_columns:
            batch_op.alter_column(
                "password",
                new_column_name="hashed_pw",
                existing_type=sa.String(length=255),
                existing_nullable=False,
            )


def downgrade() -> None:
    existing_columns = _get_columns("users")

    with op.batch_alter_table("users", schema="public") as batch_op:
        if "login_id" in existing_columns and "email" not in existing_columns:
            batch_op.alter_column(
                "login_id",
                new_column_name="email",
                existing_type=sa.String(length=100),
                existing_nullable=False,
            )
        if "hashed_pw" in existing_columns and "password" not in existing_columns:
            batch_op.alter_column(
                "hashed_pw",
                new_column_name="password",
                existing_type=sa.String(length=255),
                existing_nullable=False,
            )

