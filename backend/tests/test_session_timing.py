from datetime import date, time

import pytest

from app.domain.session_timing import calculate_session_timing


SESSION_DATE = date(2026, 8, 17)


def test_calculates_complete_rounds_for_two_hour_session() -> None:
    timing = calculate_session_timing(
        session_date=SESSION_DATE,
        start_time=time(19, 0),
        end_time=time(21, 0),
        warmup_minutes=0,
        cleanup_minutes=0,
        round_duration_minutes=15,
    )

    assert timing.total_minutes == 120
    assert timing.usable_minutes == 120
    assert timing.number_of_rounds == 8
    assert timing.unused_minutes == 0


def test_accounts_for_buffers_and_non_divisible_remaining_time() -> None:
    timing = calculate_session_timing(
        session_date=SESSION_DATE,
        start_time=time(19, 0),
        end_time=time(20, 0),
        warmup_minutes=5,
        cleanup_minutes=5,
        round_duration_minutes=12,
    )

    assert timing.usable_minutes == 50
    assert timing.number_of_rounds == 4
    assert timing.unused_minutes == 2
    assert timing.first_round_start.time() == time(19, 5)
    assert timing.scheduled_rounds_end.time() == time(19, 53)


def test_short_session_is_explicitly_represented_as_zero_rounds() -> None:
    timing = calculate_session_timing(
        session_date=SESSION_DATE,
        start_time=time(19, 0),
        end_time=time(19, 10),
        warmup_minutes=0,
        cleanup_minutes=0,
        round_duration_minutes=15,
    )

    assert timing.usable_minutes == 10
    assert timing.number_of_rounds == 0
    assert timing.unused_minutes == 10


@pytest.mark.parametrize(
    ("start_time", "end_time", "warmup", "cleanup", "round_duration", "message"),
    [
        (time(20, 0), time(19, 0), 0, 0, 15, "end_time must be later"),
        (time(19, 0), time(20, 0), 40, 30, 15, "cannot exceed"),
        (time(19, 0, 30), time(20, 0), 0, 0, 15, "whole-minute precision"),
        (time(19, 0), time(20, 0), 0, 0, 0, "greater than zero"),
    ],
)
def test_rejects_invalid_timing(
    start_time: time,
    end_time: time,
    warmup: int,
    cleanup: int,
    round_duration: int,
    message: str,
) -> None:
    with pytest.raises(ValueError, match=message):
        calculate_session_timing(
            session_date=SESSION_DATE,
            start_time=start_time,
            end_time=end_time,
            warmup_minutes=warmup,
            cleanup_minutes=cleanup,
            round_duration_minutes=round_duration,
        )
