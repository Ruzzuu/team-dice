from datetime import time
from typing import List, Optional

from pydantic import BaseModel, ConfigDict, Field, model_validator

from app.models.session import SessionStatus
from app.schemas.session import SessionCreate


class SchedulePlayerInput(BaseModel):
    id: str = Field(min_length=1, max_length=120)
    name: str = Field(min_length=1, max_length=120)
    skill_rating: Optional[int] = Field(default=None, ge=1, le=5)
    available_from: Optional[time] = None
    available_until: Optional[time] = None

    model_config = ConfigDict(extra="forbid", str_strip_whitespace=True)

    @model_validator(mode="after")
    def validate_availability(self) -> "SchedulePlayerInput":
        if (
            self.available_from is not None
            and self.available_until is not None
            and self.available_until <= self.available_from
        ):
            raise ValueError("available_until must be later than available_from")
        return self


class ScheduleGenerateRequest(BaseModel):
    session_id: str = Field(min_length=1, max_length=120)
    session: SessionCreate
    players: List[SchedulePlayerInput] = Field(min_length=2)
    seed: int = 0

    model_config = ConfigDict(extra="forbid")

    @model_validator(mode="after")
    def validate_unique_players(self) -> "ScheduleGenerateRequest":
        player_ids = [player.id for player in self.players]
        if len(player_ids) != len(set(player_ids)):
            raise ValueError("player ids must be unique")
        if self.session.number_of_rounds < 1:
            raise ValueError("the session must contain at least one complete round")
        return self


class CourtScheduleRead(BaseModel):
    court_number: int
    team_a: List[str]
    team_b: List[str]


class ScheduledRoundRead(BaseModel):
    id: str
    number: int
    start_time: time
    end_time: time
    courts: List[CourtScheduleRead]
    resting_player_ids: List[str]
    status: str = "UPCOMING"


class PlayerFairnessRead(BaseModel):
    player_id: str
    playing_minutes: int
    rounds_played: int
    rest_count: int


class FairnessSummaryRead(BaseModel):
    score: int
    spread_minutes: int
    average_minutes: float
    players: List[PlayerFairnessRead]


class ScheduleRead(BaseModel):
    session_id: str
    rounds: List[ScheduledRoundRead]
    fairness: FairnessSummaryRead
    session_status: SessionStatus = SessionStatus.READY
