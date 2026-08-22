from pathlib import Path

from fastapi.testclient import TestClient

from app.main import create_app


def build_client(frontend_dir: Path) -> TestClient:
    (frontend_dir / "assets").mkdir()
    (frontend_dir / "index.html").write_text(
        "<html><body>FairPlay</body></html>",
        encoding="utf-8",
    )
    (frontend_dir / "assets" / "app.js").write_text(
        "console.log('FairPlay')",
        encoding="utf-8",
    )
    return TestClient(create_app(frontend_dir))


def test_serves_frontend_index_and_assets(tmp_path: Path) -> None:
    client = build_client(tmp_path)

    index_response = client.get("/")
    asset_response = client.get("/assets/app.js")

    assert index_response.status_code == 200
    assert "FairPlay" in index_response.text
    assert asset_response.status_code == 200
    assert "console.log" in asset_response.text


def test_frontend_route_uses_spa_fallback(tmp_path: Path) -> None:
    client = build_client(tmp_path)

    response = client.get("/sessions/example-session")

    assert response.status_code == 200
    assert "FairPlay" in response.text


def test_unknown_api_route_remains_json_404(tmp_path: Path) -> None:
    client = build_client(tmp_path)

    response = client.get("/api/unknown")

    assert response.status_code == 404
    assert response.json() == {"detail": "Not Found"}
