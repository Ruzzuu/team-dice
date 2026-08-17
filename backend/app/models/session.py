import enum
import uuid
from datetime import date as DateType
from datetime import datetime, time

from sqlalchemy import CheckConstraint, Date, DateTime, Enum, Integer, String, Time, Uuid
from sqlalchemy.orm import Mapped, mapped_column
from sqlalchemy.sql import func

from app.domain.session_timing import SessionTiming, calculate_session_timing
from app.models.base import Base


class SessionStatus(str, enum.Enum):
    DRAFT = "DRAFT"
    READY = "READY"
    ACTIVE = "ACTIVE"
    PAUSED = "PAUSED"
    COMPLETED = "COMPLETED"
    CANCELLED = "CANCELLED"


class Session(Base):
    __tablename__ = "sessions"
    __table_args__ = (
        CheckConstraint("court_count > 0", name="ck_sessions_court_count_positive"),
        CheckConstraint(
            "players_per_court > 0",
            name="ck_sessions_players_per_court_positive",
        ),
        CheckConstraint(
            "round_duration_minutes > 0",
            name="ck_sessions_round_duration_positive",
        ),
        CheckConstraint(
            "warmup_minutes >= 0",
            name="ck_sessions_warmup_nonnegative",
        ),
        CheckConstraint(
            "cleanup_minutes >= 0",
            name="ck_sessions_cleanup_nonnegative",
        ),
        CheckConstraint(
            "end_time > start_time",
            name="ck_sessions_end_after_start",
        ),
    )

    id: Mapped[uuid.UUID] = mapped_column(Uuid, primary_key=True, default=uuid.uuid4)
    name: Mapped[str] = mapped_column(String(120), nullable=False)
    date: Mapped[DateType] = mapped_column(Date, nullable=False)
    start_time: Mapped[time] = mapped_column(Time, nullable=False)
    end_time: Mapped[time] = mapped_column(Time, nullable=False)
    warmup_minutes: Mapped[int] = mapped_column(Integer, nullable=False, default=0)
    cleanup_minutes: Mapped[int] = mapped_column(Integer, nullable=False, default=0)
    round_duration_minutes: Mapped[int] = mapped_column(Integer, nullable=False)
    court_count: Mapped[int] = mapped_column(Integer, nullable=False)
    players_per_court: Mapped[int] = mapped_column(Integer, nullable=False)
    status: Mapped[SessionStatus] = mapped_column(
        Enum(
            SessionStatus,
            name="session_status",
            native_enum=False,
            create_constraint=True,
            values_callable=lambda statuses: [status.value for status in statuses],
        ),
        nullable=False,
        default=SessionStatus.DRAFT,
    )
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), nullable=False, server_default=func.now()
    )
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        nullable=False,
        server_default=func.now(),
        onupdate=func.now(),
    )

    @property
    def active_player_capacity(self) -> int:
        return self.court_count * self.players_per_court

    @property
    def timing(self) -> SessionTiming:
        return calculate_session_timing(
            session_date=self.date,
            start_time=self.start_time,
            end_time=self.end_time,
            warmup_minutes=self.warmup_minutes,
            cleanup_minutes=self.cleanup_minutes,
            round_duration_minutes=self.round_duration_minutes,
        )
