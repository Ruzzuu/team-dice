import uuid
from datetime import date as DateType
from datetime import datetime, time

from pydantic import BaseModel, ConfigDict, Field, computed_field, model_validator

from app.domain.session_timing import SessionTiming, calculate_session_timing
from app.models.session import SessionStatus


class SessionBase(BaseModel):
    name: str = Field(min_length=1, max_length=120)
    date: DateType
    start_time: time
    end_time: time
    warmup_minutes: int = Field(default=0, ge=0)
    cleanup_minutes: int = Field(default=0, ge=0)
    round_duration_minutes: int = Field(gt=0)
    court_count: int = Field(gt=0)
    players_per_court: int = Field(gt=0)

    model_config = ConfigDict(extra="forbid", str_strip_whitespace=True)

    def get_timing(self) -> SessionTiming:
        return calculate_session_timing(
            session_date=self.date,
            start_time=self.start_time,
            end_time=self.end_time,
            warmup_minutes=self.warmup_minutes,
            cleanup_minutes=self.cleanup_minutes,
            round_duration_minutes=self.round_duration_minutes,
        )

    @model_validator(mode="after")
    def validate_timing(self) -> "SessionBase":
        self.get_timing()
        return self

    @computed_field
    @property
    def active_player_capacity(self) -> int:
        return self.court_count * self.players_per_court

    @computed_field
    @property
    def usable_minutes(self) -> int:
        return self.get_timing().usable_minutes

    @computed_field
    @property
    def number_of_rounds(self) -> int:
        return self.get_timing().number_of_rounds

    @computed_field
    @property
    def unused_minutes(self) -> int:
        return self.get_timing().unused_minutes


class SessionCreate(SessionBase):
    pass


class SessionRead(SessionBase):
    id: uuid.UUID
    status: SessionStatus
    created_at: datetime
    updated_at: datetime

    model_config = ConfigDict(from_attributes=True, extra="forbid")
