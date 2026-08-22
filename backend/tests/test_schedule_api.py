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
