"""FastAPI application factory for CHALK."""

import asyncio

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from starlette.middleware.trustedhost import TrustedHostMiddleware

from app.config import Settings, get_settings
from app.lessons import router as lesson_router
from app.middleware import (
    LESSON_BODY_MAX_BYTES,
    SESSION_BODY_MAX_BYTES,
    SessionBodyLimitMiddleware,
)
from app.sessions import router


def create_app(settings: Settings | None = None) -> FastAPI:
    """Create an app with one explicit settings snapshot."""

    resolved_settings = settings or get_settings()
    application = FastAPI(
        title="CHALK backend",
        version="0.1.0",
        docs_url="/docs",
        redoc_url=None,
    )
    application.state.settings = resolved_settings
    application.state.lesson_generation_semaphore = asyncio.Semaphore(
        resolved_settings.lesson_max_concurrent
    )
    application.dependency_overrides[get_settings] = lambda: application.state.settings
    application.add_middleware(
        TrustedHostMiddleware,
        allowed_hosts=["localhost", "127.0.0.1", "testserver"],
    )
    application.add_middleware(
        SessionBodyLimitMiddleware,
        path_limits={
            "/session": SESSION_BODY_MAX_BYTES,
            "/lesson": LESSON_BODY_MAX_BYTES,
        },
    )
    application.add_middleware(
        CORSMiddleware,
        allow_origins=[resolved_settings.frontend_origin],
        allow_credentials=False,
        allow_methods=["GET", "POST", "OPTIONS"],
        allow_headers=["Content-Type"],
        expose_headers=[
            "X-Chalk-Board-Model",
            "X-Chalk-Board-Reasoning-Effort",
            "X-Chalk-Board-Prompt-SHA256",
            "X-Chalk-Repair-Prompt-SHA256",
        ],
    )
    application.include_router(router)
    application.include_router(lesson_router)
    return application


app = create_app()
