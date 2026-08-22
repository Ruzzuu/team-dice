from fastapi import APIRouter

from app.domain.scheduler import SchedulerPlayer, generate_fair_schedule
from app.schemas.schedule import (
    CourtScheduleRead,
    FairnessSummaryRead,
    PlayerFairnessRead,
    ScheduleGenerateRequest,
    ScheduledRoundRead,
    ScheduleRead,
)


router = APIRouter(prefix="/api/schedules", tags=["schedules"])


@router.post("/generate", response_model=ScheduleRead)
def generate_schedule(request: ScheduleGenerateRequest) -> ScheduleRead:
    timing = request.session.get_timing()
    result = generate_fair_schedule(
        session_id=request.session_id,
        session_date=request.session.date,
        timing=timing,
        court_count=request.session.court_count,
        players_per_court=request.session.players_per_court,
        round_duration_minutes=request.session.round_duration_minutes,
        players=[
            SchedulerPlayer(
                id=player.id,
                name=player.name,
                skill_rating=player.skill_rating,
                available_from=player.available_from,
                available_until=player.available_until,
            )
            for player in request.players
        ],
        seed=request.seed,
    )
    return ScheduleRead(
        session_id=result.session_id,
        rounds=[
            ScheduledRoundRead(
                id=round_result.id,
                number=round_result.number,
                start_time=round_result.start_time,
                end_time=round_result.end_time,
                courts=[
                    CourtScheduleRead(
                        court_number=court.court_number,
                        team_a=list(court.team_a),
                        team_b=list(court.team_b),
                    )
                    for court in round_result.courts
                ],
                resting_player_ids=list(round_result.resting_player_ids),
            )
            for round_result in result.rounds
        ],
        fairness=FairnessSummaryRead(
            score=result.fairness.score,
            spread_minutes=result.fairness.spread_minutes,
            average_minutes=result.fairness.average_minutes,
            players=[
                PlayerFairnessRead(
                    player_id=player.player_id,
                    playing_minutes=player.playing_minutes,
                    rounds_played=player.rounds_played,
                    rest_count=player.rest_count,
                )
                for player in result.fairness.players
            ],
        ),
    )
