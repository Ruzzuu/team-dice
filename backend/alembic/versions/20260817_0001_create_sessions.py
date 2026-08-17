"""Create sessions table.

Revision ID: 20260817_0001
Revises:
Create Date: 2026-08-17
"""
from typing import Optional, Sequence, Union

from alembic import op
import sqlalchemy as sa


revision: str = "20260817_0001"
down_revision: Optional[str] = None
branch_labels: Optional[Union[str, Sequence[str]]] = None
depends_on: Optional[Union[str, Sequence[str]]] = None


def upgrade() -> None:
    op.create_table(
        "sessions",
        sa.Column("id", sa.Uuid(), nullable=False),
        sa.Column("name", sa.String(length=120), nullable=False),
        sa.Column("date", sa.Date(), nullable=False),
        sa.Column("start_time", sa.Time(), nullable=False),
        sa.Column("end_time", sa.Time(), nullable=False),
        sa.Column(
            "warmup_minutes", sa.Integer(), nullable=False, server_default="0"
        ),
        sa.Column(
            "cleanup_minutes", sa.Integer(), nullable=False, server_default="0"
        ),
        sa.Column("round_duration_minutes", sa.Integer(), nullable=False),
        sa.Column("court_count", sa.Integer(), nullable=False),
        sa.Column("players_per_court", sa.Integer(), nullable=False),
        sa.Column(
            "status",
            sa.Enum(
                "DRAFT",
                "READY",
                "ACTIVE",
                "PAUSED",
                "COMPLETED",
                "CANCELLED",
                name="session_status",
                native_enum=False,
                create_constraint=True,
            ),
            nullable=False,
            server_default="DRAFT",
        ),
        sa.Column(
            "created_at",
            sa.DateTime(timezone=True),
            nullable=False,
            server_default=sa.func.now(),
        ),
        sa.Column(
            "updated_at",
            sa.DateTime(timezone=True),
            nullable=False,
            server_default=sa.func.now(),
        ),
        sa.CheckConstraint(
            "cleanup_minutes >= 0", name="ck_sessions_cleanup_nonnegative"
        ),
        sa.CheckConstraint(
            "court_count > 0", name="ck_sessions_court_count_positive"
        ),
        sa.CheckConstraint(
            "end_time > start_time", name="ck_sessions_end_after_start"
        ),
        sa.CheckConstraint(
            "players_per_court > 0",
            name="ck_sessions_players_per_court_positive",
        ),
        sa.CheckConstraint(
            "round_duration_minutes > 0",
            name="ck_sessions_round_duration_positive",
        ),
        sa.CheckConstraint(
            "warmup_minutes >= 0", name="ck_sessions_warmup_nonnegative"
        ),
        sa.PrimaryKeyConstraint("id"),
    )


def downgrade() -> None:
    op.drop_table("sessions")
