from datetime import date, time

import pytest
from pydantic import ValidationError

from app.schemas.session import SessionCreate


def valid_session_data() -> dict[str, object]:
    return {
        "name": "Friday Badminton",
        "date": date(2026, 8, 21),
        "start_time": time(19, 0),
        "end_time": time(21, 0),
        "round_duration_minutes": 15,
        "court_count": 2,
        "players_per_court": 4,
    }


def test_session_schema_exposes_capacity_and_timing() -> None:
    session = SessionCreate.model_validate(valid_session_data())

    assert session.warmup_minutes == 0
    assert session.cleanup_minutes == 0
    assert session.active_player_capacity == 8
    assert session.usable_minutes == 120
    assert session.number_of_rounds == 8
    assert session.unused_minutes == 0


def test_session_schema_strips_name_whitespace() -> None:
    data = valid_session_data()
    data["name"] = "  Friday Badminton  "

    session = SessionCreate.model_validate(data)

    assert session.name == "Friday Badminton"


@pytest.mark.parametrize(
    ("field", "value"),
    [
        ("name", "   "),
        ("court_count", 0),
        ("players_per_court", 0),
        ("round_duration_minutes", 0),
        ("warmup_minutes", -1),
        ("cleanup_minutes", -1),
    ],
)
def test_session_schema_rejects_invalid_fields(field: str, value: object) -> None:
    data = valid_session_data()
    data[field] = value

    with pytest.raises(ValidationError):
        SessionCreate.model_validate(data)


def test_session_schema_rejects_buffers_longer_than_session() -> None:
    data = valid_session_data()
    data["warmup_minutes"] = 70
    data["cleanup_minutes"] = 60

    with pytest.raises(ValidationError, match="cannot exceed"):
        SessionCreate.model_validate(data)


def test_session_schema_forbids_unknown_input() -> None:
    data = valid_session_data()
    data["unexpected"] = True

    with pytest.raises(ValidationError):
        SessionCreate.model_validate(data)
