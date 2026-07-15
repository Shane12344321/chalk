"""FastAPI dependencies shared by backend services."""

from collections.abc import AsyncIterator
from typing import Annotated

import httpx
from fastapi import Depends

from app.config import Settings, get_settings


async def get_openai_http_client(
    settings: Annotated[Settings, Depends(get_settings)],
) -> AsyncIterator[httpx.AsyncClient]:
    """Yield a bounded client for server-to-server OpenAI requests."""

    timeout = httpx.Timeout(settings.openai_timeout_seconds)
    async with httpx.AsyncClient(
        base_url=settings.openai_api_base_url,
        timeout=timeout,
        follow_redirects=False,
        trust_env=False,
    ) as client:
        yield client
