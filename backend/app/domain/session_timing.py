from dataclasses import dataclass
from datetime import date, datetime, time, timedelta


@dataclass(frozen=True)
class SessionTiming:
    """Derived timing values for a fixed-duration session."""

    total_minutes: int
    usable_minutes: int
    number_of_rounds: int
    unused_minutes: int
    first_round_start: datetime
    scheduled_rounds_end: datetime


def calculate_session_timing(
    *,
    session_date: date,
    start_time: time,
    end_time: time,
    warmup_minutes: int,
    cleanup_minutes: int,
    round_duration_minutes: int,
) -> SessionTiming:
    """Validate session timing and calculate how many complete rounds fit."""

    if start_time.second or start_time.microsecond or end_time.second or end_time.microsecond:
        raise ValueError("start_time and end_time must use whole-minute precision")
    if round_duration_minutes <= 0:
        raise ValueError("round_duration_minutes must be greater than zero")
    if warmup_minutes < 0 or cleanup_minutes < 0:
        raise ValueError("warmup_minutes and cleanup_minutes cannot be negative")

    starts_at = datetime.combine(session_date, start_time)
    ends_at = datetime.combine(session_date, end_time)
    if ends_at <= starts_at:
        raise ValueError("end_time must be later than start_time on the session date")

    total_minutes = int((ends_at - starts_at).total_seconds() // 60)
    reserved_minutes = warmup_minutes + cleanup_minutes
    if reserved_minutes > total_minutes:
        raise ValueError("warmup and cleanup cannot exceed the total session duration")

    usable_minutes = total_minutes - reserved_minutes
    number_of_rounds, unused_minutes = divmod(
        usable_minutes, round_duration_minutes
    )
    first_round_start = starts_at + timedelta(minutes=warmup_minutes)
    scheduled_rounds_end = first_round_start + timedelta(
        minutes=number_of_rounds * round_duration_minutes
    )

    return SessionTiming(
        total_minutes=total_minutes,
        usable_minutes=usable_minutes,
        number_of_rounds=number_of_rounds,
        unused_minutes=unused_minutes,
        first_round_start=first_round_start,
        scheduled_rounds_end=scheduled_rounds_end,
    )
