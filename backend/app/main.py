"""FastAPI application factory for CHALK."""

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.config import Settings, get_settings
from app.middleware import SESSION_BODY_MAX_BYTES, SessionBodyLimitMiddleware
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
    application.dependency_overrides[get_settings] = lambda: application.state.settings
    application.add_middleware(
        SessionBodyLimitMiddleware,
        max_body_bytes=SESSION_BODY_MAX_BYTES,
    )
    application.add_middleware(
        CORSMiddleware,
        allow_origins=[resolved_settings.frontend_origin],
        allow_credentials=False,
        allow_methods=["GET", "POST", "OPTIONS"],
        allow_headers=["Content-Type"],
    )
    application.include_router(router)
    return application


app = create_app()
