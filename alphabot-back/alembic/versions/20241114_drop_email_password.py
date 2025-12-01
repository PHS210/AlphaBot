"""Drop legacy email/password columns after login_id migration

Revision ID: 20241114_drop_email_pw
Revises: 20241114_rename_user_columns
Create Date: 2025-02-14 00:30:00.000000
"""

from alembic import op
import sqlalchemy as sa

revision = "20241114_drop_email_pw"
down_revision = "20241114_rename_user_columns"
branch_labels = None
depends_on = None


def _get_columns(table_name: str, schema: str = "public") -> set[str]:
    bind = op.get_bind()
    inspector = sa.inspect(bind)
    return {col["name"] for col in inspector.get_columns(table_name, schema=schema)}


def upgrade() -> None:
    existing_columns = _get_columns("users")

    with op.batch_alter_table("users", schema="public") as batch_op:
        if "email" in existing_columns:
            batch_op.drop_column("email")
        if "password" in existing_columns:
            batch_op.drop_column("password")


def downgrade() -> None:
    existing_columns = _get_columns("users")

    with op.batch_alter_table("users", schema="public") as batch_op:
        if "email" not in existing_columns:
            batch_op.add_column(sa.Column("email", sa.String(length=100), nullable=True))
        if "password" not in existing_columns:
            batch_op.add_column(sa.Column("password", sa.String(length=255), nullable=True))

