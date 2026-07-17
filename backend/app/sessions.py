"""Realtime client-secret minting endpoint."""

import hashlib
import logging
from typing import Annotated, Any, Literal
from uuid import RFC_4122, UUID

import httpx
from fastapi import APIRouter, Depends, HTTPException, Response, status
from pydantic import (
    AfterValidator,
    BaseModel,
    ConfigDict,
    Field,
    StringConstraints,
    ValidationError,
)

from app.config import Settings, get_settings
from app.dependencies import get_openai_http_client

logger = logging.getLogger(__name__)
router = APIRouter(tags=["realtime"])

OPENAI_CLIENT_SECRETS_URL = "https://api.openai.com/v1/realtime/client_secrets"


def _canonical_uuid4(value: str) -> str:
    try:
        parsed = UUID(value)
    except (AttributeError, ValueError):
        raise ValueError("must be a canonical UUIDv4") from None
    if parsed.version != 4 or parsed.variant != RFC_4122 or value != str(parsed):
        raise ValueError("must be a canonical UUIDv4")
    return value


CanonicalUuid4 = Annotated[
    str,
    StringConstraints(
        strict=True,
        min_length=36,
        max_length=36,
    ),
    AfterValidator(_canonical_uuid4),
]


class SessionRequest(BaseModel):
    """Opaque identifiers supplied by the browser.

    The browser persists a random ``client_id``. Human names, emails, and
    utterances are deliberately not accepted by this endpoint.
    """

    model_config = ConfigDict(extra="forbid", str_strip_whitespace=True, strict=True)

    request_id: CanonicalUuid4
    client_id: CanonicalUuid4 = Field(repr=False)


class SessionResponse(BaseModel):
    """Strict browser-facing projection of an upstream client secret."""

    model_config = ConfigDict(extra="forbid", strict=True)

    request_id: CanonicalUuid4
    client_secret: str = Field(min_length=1, repr=False)
    expires_at: int | None = Field(default=None, ge=0)
    model: str
    voice: str


class HealthRealtimeStatus(BaseModel):
    configured: bool
    model: str
    voice: str


class HealthBoardStatus(BaseModel):
    configured: bool
    model: str
    reasoning_effort: str


class HealthResponse(BaseModel):
    status: Literal["ok"] = "ok"
    service: Literal["chalk-backend"] = "chalk-backend"
    realtime: HealthRealtimeStatus
    board: HealthBoardStatus


class _UpstreamClientSecret(BaseModel):
    """Minimum upstream shape we trust and expose through a safe projection."""

    model_config = ConfigDict(extra="ignore", strict=True)

    value: str = Field(min_length=1, repr=False)
    expires_at: int | None = Field(default=None, ge=0)


def _safety_identifier(settings: Settings, client_id: str) -> str:
    material = f"{settings.safety_identifier_salt}:{client_id}".encode()
    return hashlib.sha256(material).hexdigest()


def _public_error(
    code: str,
    message: str,
    status_code: int,
    request_id: CanonicalUuid4,
) -> HTTPException:
    return HTTPException(
        status_code=status_code,
        detail={"code": code, "message": message, "request_id": request_id},
    )


@router.get("/health", response_model=HealthResponse)
async def health(
    settings: Annotated[Settings, Depends(get_settings)],
) -> HealthResponse:
    """Report process health and non-secret feature configuration."""

    return HealthResponse(
        realtime=HealthRealtimeStatus(
            configured=settings.has_openai_api_key,
            model=settings.realtime_model,
            voice=settings.realtime_voice,
        ),
        board=HealthBoardStatus(
            configured=settings.has_openai_api_key,
            model=settings.board_model,
            reasoning_effort=settings.board_reasoning_effort,
        ),
    )


@router.post(
    "/session",
    response_model=SessionResponse,
    response_model_exclude_none=True,
    status_code=status.HTTP_201_CREATED,
)
async def create_session(
    payload: SessionRequest,
    response: Response,
    settings: Annotated[Settings, Depends(get_settings)],
    client: Annotated[httpx.AsyncClient, Depends(get_openai_http_client)],
) -> SessionResponse:
    """Mint a short-lived Realtime client secret using the server-only key."""

    logger.info("realtime_client_secret_started request_id=%s", payload.request_id)
    if not settings.has_openai_api_key:
        logger.warning(
            "realtime_client_secret_failed reason=not_configured request_id=%s",
            payload.request_id,
        )
        raise _public_error(
            "openai_not_configured",
            "Realtime sessions are not configured on this server.",
            status.HTTP_503_SERVICE_UNAVAILABLE,
            payload.request_id,
        )

    api_key = settings.openai_api_key
    assert api_key is not None  # narrowed by has_openai_api_key

    headers = {
        "Authorization": f"Bearer {api_key.get_secret_value()}",
        "Content-Type": "application/json",
        "OpenAI-Safety-Identifier": _safety_identifier(settings, payload.client_id),
    }
    upstream_payload: dict[str, Any] = {
        "session": {
            "type": "realtime",
            "model": settings.realtime_model,
            "audio": {"output": {"voice": settings.realtime_voice}},
        }
    }

    try:
        upstream_response = await client.post(
            OPENAI_CLIENT_SECRETS_URL,
            headers=headers,
            json=upstream_payload,
        )
    except (httpx.TimeoutException, httpx.RequestError):
        logger.warning(
            "realtime_client_secret_failed reason=network request_id=%s",
            payload.request_id,
        )
        raise _public_error(
            "openai_unavailable",
            "Unable to create a Realtime session.",
            status.HTTP_502_BAD_GATEWAY,
            payload.request_id,
        ) from None

    if upstream_response.is_error:
        logger.warning(
            "realtime_client_secret_failed reason=upstream_status status=%s request_id=%s",
            upstream_response.status_code,
            payload.request_id,
        )
        raise _public_error(
            "openai_rejected_session",
            "Unable to create a Realtime session.",
            status.HTTP_502_BAD_GATEWAY,
            payload.request_id,
        )

    try:
        upstream = _UpstreamClientSecret.model_validate(upstream_response.json())
    except (ValueError, ValidationError, TypeError):
        logger.warning(
            "realtime_client_secret_failed reason=malformed_response request_id=%s",
            payload.request_id,
        )
        raise _public_error(
            "openai_invalid_response",
            "Unable to create a Realtime session.",
            status.HTTP_502_BAD_GATEWAY,
            payload.request_id,
        ) from None

    response.headers["Cache-Control"] = "no-store"
    response.headers["Pragma"] = "no-cache"
    logger.info("realtime_client_secret_succeeded request_id=%s", payload.request_id)
    return SessionResponse(
        request_id=payload.request_id,
        client_secret=upstream.value,
        expires_at=upstream.expires_at,
        model=settings.realtime_model,
        voice=settings.realtime_voice,
    )
