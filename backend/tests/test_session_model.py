from datetime import date, time

from sqlalchemy import create_engine
from sqlalchemy.orm import Session as DatabaseSession

from app.models import Base, Session, SessionStatus


def test_session_model_persists_with_defaults_and_derived_values() -> None:
    engine = create_engine("sqlite:///:memory:")
    Base.metadata.create_all(engine)

    session = Session(
        name="Friday Badminton",
        date=date(2026, 8, 21),
        start_time=time(19, 0),
        end_time=time(21, 0),
        round_duration_minutes=15,
        court_count=2,
        players_per_court=4,
    )

    with DatabaseSession(engine) as database:
        database.add(session)
        database.commit()
        database.refresh(session)

        assert session.id is not None
        assert session.status is SessionStatus.DRAFT
        assert session.active_player_capacity == 8
        assert session.timing.number_of_rounds == 8
        assert session.created_at is not None
        assert session.updated_at is not None
