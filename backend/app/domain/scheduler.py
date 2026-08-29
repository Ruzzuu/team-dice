import hashlib
import math
from dataclasses import dataclass
from datetime import date, datetime, time, timedelta
from typing import Dict, List, Optional, Sequence, Set, Tuple

from app.domain.session_timing import SessionTiming


@dataclass(frozen=True)
class SchedulerPlayer:
    id: str
    name: str
    skill_rating: Optional[int] = None
    available_from: Optional[time] = None
    available_until: Optional[time] = None


@dataclass(frozen=True)
class CourtSchedule:
    court_number: int
    team_a: Tuple[str, ...]
    team_b: Tuple[str, ...]


@dataclass(frozen=True)
class ScheduledRound:
    id: str
    number: int
    start_time: time
    end_time: time
    courts: Tuple[CourtSchedule, ...]
    resting_player_ids: Tuple[str, ...]


@dataclass(frozen=True)
class PlayerFairnessResult:
    player_id: str
    playing_minutes: int
    rounds_played: int
    rest_count: int


@dataclass(frozen=True)
class FairnessResult:
    score: int
    spread_minutes: int
    average_minutes: float
    players: Tuple[PlayerFairnessResult, ...]


@dataclass(frozen=True)
class SchedulerResult:
    session_id: str
    rounds: Tuple[ScheduledRound, ...]
    fairness: FairnessResult


def _tie_break(seed: int, round_number: int, player_id: str) -> str:
    value = f"{seed}:{round_number}:{player_id}".encode("utf-8")
    return hashlib.sha256(value).hexdigest()


def _is_available(
    player: SchedulerPlayer,
    session_date: date,
    round_start: datetime,
    round_end: datetime,
) -> bool:
    available_from = datetime.combine(
        session_date, player.available_from or time.min
    )
    available_until = datetime.combine(
        session_date, player.available_until or time.max
    )
    return round_start >= available_from and round_end <= available_until


def _make_teams(
    player_ids: Sequence[str],
    players_by_id: Dict[str, SchedulerPlayer],
    seed: int,
    round_number: int,
    court_number: int,
) -> Tuple[Tuple[str, ...], Tuple[str, ...]]:
    ordered = sorted(
        player_ids,
        key=lambda player_id: (
            -(players_by_id[player_id].skill_rating or 3),
            _tie_break(seed + court_number, round_number, player_id),
        ),
    )
    team_a: List[str] = []
    team_b: List[str] = []
    skill_a = 0
    skill_b = 0
    target_a = math.ceil(len(ordered) / 2)
    target_b = len(ordered) // 2

    for player_id in ordered:
        skill = players_by_id[player_id].skill_rating or 3
        if len(team_a) >= target_a:
            team_b.append(player_id)
            skill_b += skill
        elif len(team_b) >= target_b:
            team_a.append(player_id)
            skill_a += skill
        elif skill_a <= skill_b:
            team_a.append(player_id)
            skill_a += skill
        else:
            team_b.append(player_id)
            skill_b += skill

    return tuple(team_a), tuple(team_b)


def _make_courts(
    selected_ids: Sequence[str],
    players_by_id: Dict[str, SchedulerPlayer],
    players_per_court: int,
    seed: int,
    round_number: int,
) -> Tuple[CourtSchedule, ...]:
    if len(selected_ids) < 2:
        return tuple()
    desired_courts = min(
        math.ceil(len(selected_ids) / players_per_court),
        len(selected_ids) // 2,
    )
    base_size, extra_players = divmod(len(selected_ids), desired_courts)
    courts: List[CourtSchedule] = []
    start = 0
    for court_index in range(desired_courts):
        court_size = base_size + (1 if court_index < extra_players else 0)
        court_player_ids = selected_ids[start : start + court_size]
        start += court_size
        team_a, team_b = _make_teams(
            court_player_ids,
            players_by_id,
            seed,
            round_number,
            len(courts) + 1,
        )
        courts.append(
            CourtSchedule(
                court_number=len(courts) + 1,
                team_a=team_a,
                team_b=team_b,
            )
        )
    return tuple(courts)


def generate_fair_schedule(
    *,
    session_id: str,
    session_date: date,
    timing: SessionTiming,
    court_count: int,
    players_per_court: int,
    round_duration_minutes: int,
    players: Sequence[SchedulerPlayer],
    seed: int = 0,
    initial_play_counts: Optional[Dict[str, int]] = None,
    initial_rest_counts: Optional[Dict[str, int]] = None,
    previous_resting_player_ids: Optional[Set[str]] = None,
    round_number_offset: int = 0,
) -> SchedulerResult:
    """Generate deterministic rounds while prioritizing playing-time fairness."""

    capacity = court_count * players_per_court
    play_counts: Dict[str, int] = {
        player.id: (initial_play_counts or {}).get(player.id, 0)
        for player in players
    }
    rest_counts: Dict[str, int] = {
        player.id: (initial_rest_counts or {}).get(player.id, 0)
        for player in players
    }
    previous_resting: Set[str] = set(previous_resting_player_ids or set())
    players_by_id = {player.id: player for player in players}
    rounds: List[ScheduledRound] = []

    for round_index in range(timing.number_of_rounds):
        round_number = round_number_offset + round_index + 1
        round_start = timing.first_round_start + timedelta(
            minutes=round_index * round_duration_minutes
        )
        round_end = round_start + timedelta(minutes=round_duration_minutes)
        eligible = [
            player
            for player in players
            if _is_available(player, session_date, round_start, round_end)
        ]
        ordered = sorted(
            eligible,
            key=lambda player: (
                play_counts[player.id],
                0 if player.id in previous_resting else 1,
                _tie_break(seed, round_number, player.id),
            ),
        )
        selected = ordered[:capacity]
        if len(selected) < 2:
            selected = []
        selected_ids = [player.id for player in selected]
        selected_set = set(selected_ids)
        resting_ids = [
            player.id for player in eligible if player.id not in selected_set
        ]

        for player_id in selected_ids:
            play_counts[player_id] += 1
        for player_id in resting_ids:
            rest_counts[player_id] += 1

        rounds.append(
            ScheduledRound(
                id=f"{session_id}-round-{round_number}",
                number=round_number,
                start_time=round_start.time(),
                end_time=round_end.time(),
                courts=_make_courts(
                    selected_ids,
                    players_by_id,
                    players_per_court,
                    seed,
                    round_number,
                ),
                resting_player_ids=tuple(resting_ids),
            )
        )
        previous_resting = set(resting_ids)

    fairness_players = tuple(
        PlayerFairnessResult(
            player_id=player.id,
            playing_minutes=play_counts[player.id] * round_duration_minutes,
            rounds_played=play_counts[player.id],
            rest_count=rest_counts[player.id],
        )
        for player in players
    )
    playing_minutes = [entry.playing_minutes for entry in fairness_players]
    minimum = min(playing_minutes)
    maximum = max(playing_minutes)
    spread = maximum - minimum
    score = 100 if maximum == 0 else round((minimum / maximum) * 100)

    return SchedulerResult(
        session_id=session_id,
        rounds=tuple(rounds),
        fairness=FairnessResult(
            score=score,
            spread_minutes=spread,
            average_minutes=round(sum(playing_minutes) / len(playing_minutes), 1),
            players=fairness_players,
        ),
    )
