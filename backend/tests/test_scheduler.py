from datetime import date, time

from app.domain.scheduler import SchedulerPlayer, generate_fair_schedule
from app.domain.session_timing import calculate_session_timing


def make_players(count: int) -> list[SchedulerPlayer]:
    return [SchedulerPlayer(id=f"p{index}", name=f"Player {index}") for index in range(count)]


def make_schedule(player_count: int, court_count: int = 2):
    timing = calculate_session_timing(
        session_date=date(2026, 8, 21),
        start_time=time(19, 0),
        end_time=time(21, 0),
        warmup_minutes=0,
        cleanup_minutes=0,
        round_duration_minutes=15,
    )
    return generate_fair_schedule(
        session_id="session-1",
        session_date=date(2026, 8, 21),
        timing=timing,
        court_count=court_count,
        players_per_court=4,
        round_duration_minutes=15,
        players=make_players(player_count),
        seed=42,
    )


def test_schedule_is_as_fair_as_mathematically_possible() -> None:
    result = make_schedule(10)

    assert len(result.rounds) == 8
    assignments = [
        player_id
        for scheduled_round in result.rounds
        for court in scheduled_round.courts
        for player_id in court.team_a + court.team_b
    ]
    assert len(assignments) == 64
    assert result.fairness.spread_minutes == 15
    assert {entry.rounds_played for entry in result.fairness.players} == {6, 7}


def test_everyone_plays_when_roster_matches_capacity() -> None:
    result = make_schedule(8)

    assert {entry.rounds_played for entry in result.fairness.players} == {8}
    assert all(not scheduled_round.resting_player_ids for scheduled_round in result.rounds)


def test_under_capacity_never_duplicates_a_player() -> None:
    result = make_schedule(6)

    for scheduled_round in result.rounds:
        player_ids = [
            player_id
            for court in scheduled_round.courts
            for player_id in court.team_a + court.team_b
        ]
        assert len(player_ids) == len(set(player_ids)) == 6


def test_availability_is_a_hard_constraint() -> None:
    players = make_players(8) + [
        SchedulerPlayer(id="late", name="Late Player", available_from=time(20, 0)),
        SchedulerPlayer(id="early", name="Early Player", available_until=time(20, 0)),
    ]
    timing = calculate_session_timing(
        session_date=date(2026, 8, 21),
        start_time=time(19, 0),
        end_time=time(21, 0),
        warmup_minutes=0,
        cleanup_minutes=0,
        round_duration_minutes=15,
    )
    result = generate_fair_schedule(
        session_id="availability",
        session_date=date(2026, 8, 21),
        timing=timing,
        court_count=2,
        players_per_court=4,
        round_duration_minutes=15,
        players=players,
        seed=1,
    )

    for scheduled_round in result.rounds:
        active = {
            player_id
            for court in scheduled_round.courts
            for player_id in court.team_a + court.team_b
        }
        if scheduled_round.start_time < time(20, 0):
            assert "late" not in active
        if scheduled_round.end_time > time(20, 0):
            assert "early" not in active


def test_seeded_schedule_is_deterministic() -> None:
    assert make_schedule(10) == make_schedule(10)


def test_consecutive_rests_are_avoided_when_possible() -> None:
    result = make_schedule(10)

    for previous, current in zip(result.rounds, result.rounds[1:]):
        assert not set(previous.resting_player_ids).intersection(current.resting_player_ids)
