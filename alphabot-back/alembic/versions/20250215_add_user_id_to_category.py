"""Add user_id column to category table

Revision ID: 20250215_add_user_id_to_category
Revises: 20241114_drop_email_pw
Create Date: 2025-02-15 01:25:00.000000
"""

from alembic import op
import sqlalchemy as sa


revision = "20250215_add_user_id_to_category"
down_revision = "20241114_drop_email_pw"
branch_labels = None
depends_on = None


def _get_columns(table_name: str, schema: str = "public") -> set[str]:
    bind = op.get_bind()
    inspector = sa.inspect(bind)
    return {col["name"] for col in inspector.get_columns(table_name, schema=schema)}


def upgrade() -> None:
    existing_columns = _get_columns("category")

    if "user_id" not in existing_columns:
        op.add_column(
            "category",
            sa.Column("user_id", sa.Integer(), nullable=True),
            schema="public",
        )
        op.create_foreign_key(
            "fk_category_user_id",
            "category",
            "users",
            ["user_id"],
            ["user_id"],
            source_schema="public",
            referent_schema="public",
            ondelete="CASCADE",
        )


def downgrade() -> None:
    existing_columns = _get_columns("category")

    if "user_id" in existing_columns:
        with op.batch_alter_table("category", schema="public") as batch_op:
            fk_names = {
                fk["name"]
                for fk in sa.inspect(op.get_bind()).get_foreign_keys("category", schema="public")
            }
            if "fk_category_user_id" in fk_names:
                batch_op.drop_constraint("fk_category_user_id", type_="foreignkey")
            batch_op.drop_column("user_id")

