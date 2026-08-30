from fastapi.testclient import TestClient

from app.main import app


client = TestClient(app)


def valid_payload() -> dict[str, object]:
    return {
        "session_id": "local-session",
        "session": {
            "name": "Friday Badminton",
            "date": "2026-08-21",
            "start_time": "19:00",
            "end_time": "21:00",
            "warmup_minutes": 0,
            "cleanup_minutes": 0,
            "round_duration_minutes": 15,
            "court_count": 2,
            "players_per_court": 4,
        },
        "players": [
            {"id": f"p{index}", "name": f"Player {index}", "skill_rating": 3}
            for index in range(10)
        ],
        "seed": 7,
    }


def test_generate_schedule_endpoint() -> None:
    response = client.post("/api/schedules/generate", json=valid_payload())

    assert response.status_code == 200
    body = response.json()
    assert body["session_id"] == "local-session"
    assert body["session_status"] == "READY"
    assert len(body["rounds"]) == 8
    assert body["fairness"]["spread_minutes"] == 15


def test_generate_schedule_requires_two_players() -> None:
    payload = valid_payload()
    payload["players"] = [{"id": "only", "name": "Only Player"}]

    response = client.post("/api/schedules/generate", json=payload)

    assert response.status_code == 422


def test_generate_schedule_requires_two_sides_per_court() -> None:
    payload = valid_payload()
    payload["session"]["players_per_court"] = 1

    response = client.post("/api/schedules/generate", json=payload)

    assert response.status_code == 422


def test_generate_schedule_rejects_duplicate_player_ids() -> None:
    payload = valid_payload()
    payload["players"] = [
        {"id": "duplicate", "name": "One"},
        {"id": "duplicate", "name": "Two"},
    ]

    response = client.post("/api/schedules/generate", json=payload)

    assert response.status_code == 422


def test_generate_schedule_rejects_invalid_availability() -> None:
    payload = valid_payload()
    payload["players"] = [
        {
            "id": "p1",
            "name": "Player One",
            "available_from": "20:00",
            "available_until": "19:00",
        },
        {"id": "p2", "name": "Player Two"},
    ]

    response = client.post("/api/schedules/generate", json=payload)

    assert response.status_code == 422


def test_generate_schedule_continues_after_completed_rounds() -> None:
    payload = valid_payload()
    payload["continuation"] = {
        "next_start_time": "20:00",
        "round_number_offset": 4,
        "player_history": [
            {"player_id": f"p{index}", "rounds_played": 3, "rest_count": 1}
            for index in range(10)
        ],
        "previous_resting_player_ids": ["p8", "p9"],
    }

    response = client.post("/api/schedules/generate", json=payload)

    assert response.status_code == 200
    body = response.json()
    assert [scheduled_round["number"] for scheduled_round in body["rounds"]] == [5, 6, 7, 8]
    assert body["rounds"][0]["start_time"] == "20:00:00"
    assert min(player["rounds_played"] for player in body["fairness"]["players"]) >= 6


def test_generate_schedule_rejects_unknown_continuation_player() -> None:
    payload = valid_payload()
    payload["continuation"] = {
        "next_start_time": "20:00",
        "round_number_offset": 4,
        "player_history": [{"player_id": "not-active", "rounds_played": 1}],
        "previous_resting_player_ids": [],
    }

    response = client.post("/api/schedules/generate", json=payload)

    assert response.status_code == 422


def test_generate_schedule_rejects_continuation_without_remaining_time() -> None:
    payload = valid_payload()
    payload["continuation"] = {
        "next_start_time": "20:50",
        "round_number_offset": 7,
        "player_history": [],
        "previous_resting_player_ids": [],
    }

    response = client.post("/api/schedules/generate", json=payload)

    assert response.status_code == 422
    assert response.json()["detail"] == "no complete rounds remain"
