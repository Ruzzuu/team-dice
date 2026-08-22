from __future__ import annotations

import os
from pathlib import Path

from fastapi import FastAPI, HTTPException
from fastapi.responses import FileResponse
from fastapi.staticfiles import StaticFiles

from app.api.schedules import router as schedules_router
from app.config import get_settings


def create_app(frontend_dir: Path | None = None) -> FastAPI:
    settings = get_settings()
    application = FastAPI(title=settings.app_name, version="0.1.0")
    application.include_router(schedules_router)

    @application.get("/health", tags=["system"])
    def health_check() -> dict[str, str]:
        return {"status": "ok"}

    static_root = frontend_dir
    if static_root is None:
        configured_dir = os.getenv("FRONTEND_DIST_DIR")
        static_root = Path(configured_dir) if configured_dir else None

    if static_root is not None and (static_root / "index.html").is_file():
        static_root = static_root.resolve()
        assets_dir = static_root / "assets"
        if assets_dir.is_dir():
            application.mount(
                "/assets",
                StaticFiles(directory=assets_dir),
                name="frontend-assets",
            )

        @application.get("/{full_path:path}", include_in_schema=False)
        def serve_frontend(full_path: str) -> FileResponse:
            if full_path == "api" or full_path.startswith("api/"):
                raise HTTPException(status_code=404, detail="Not Found")

            requested_path = (static_root / full_path).resolve()
            if requested_path.is_relative_to(static_root) and requested_path.is_file():
                return FileResponse(requested_path)
            return FileResponse(static_root / "index.html")

    return application


app = create_app()
