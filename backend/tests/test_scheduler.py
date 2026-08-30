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


def test_reduced_roster_uses_multiple_courts_without_single_player_matches() -> None:
    result = make_schedule(5)

    for scheduled_round in result.rounds:
        court_sizes = [
            len(court.team_a) + len(court.team_b)
            for court in scheduled_round.courts
        ]
        assert court_sizes == [3, 2]
        assert all(court.team_a and court.team_b for court in scheduled_round.courts)


def test_two_player_roster_creates_one_valid_match() -> None:
    result = make_schedule(2)

    assert all(len(scheduled_round.courts) == 1 for scheduled_round in result.rounds)
    assert all(
        len(scheduled_round.courts[0].team_a) == 1
        and len(scheduled_round.courts[0].team_b) == 1
        for scheduled_round in result.rounds
    )


def test_small_court_capacity_rests_extra_player_instead_of_overfilling() -> None:
    timing = calculate_session_timing(
        session_date=date(2026, 8, 21),
        start_time=time(19, 0),
        end_time=time(19, 15),
        warmup_minutes=0,
        cleanup_minutes=0,
        round_duration_minutes=15,
    )
    result = generate_fair_schedule(
        session_id="singles",
        session_date=date(2026, 8, 21),
        timing=timing,
        court_count=2,
        players_per_court=2,
        round_duration_minutes=15,
        players=make_players(3),
    )

    scheduled_round = result.rounds[0]
    assert len(scheduled_round.courts) == 1
    assert len(scheduled_round.courts[0].team_a + scheduled_round.courts[0].team_b) == 2
    assert len(scheduled_round.resting_player_ids) == 1


def test_continuation_counts_and_round_numbers_are_carried_forward() -> None:
    timing = calculate_session_timing(
        session_date=date(2026, 8, 21),
        start_time=time(20, 0),
        end_time=time(21, 0),
        warmup_minutes=0,
        cleanup_minutes=0,
        round_duration_minutes=15,
    )
    players = make_players(4)
    result = generate_fair_schedule(
        session_id="continued",
        session_date=date(2026, 8, 21),
        timing=timing,
        court_count=1,
        players_per_court=4,
        round_duration_minutes=15,
        players=players,
        initial_play_counts={player.id: 2 for player in players},
        initial_rest_counts={player.id: 1 for player in players},
        round_number_offset=4,
        seed=3,
    )

    assert [scheduled_round.number for scheduled_round in result.rounds] == [5, 6, 7, 8]
    assert result.rounds[0].start_time == time(20, 0)
    assert {entry.rounds_played for entry in result.fairness.players} == {6}
    assert {entry.rest_count for entry in result.fairness.players} == {1}
