"""Small ASGI guards that run before request parsing."""

import json

from starlette.types import ASGIApp, Message, Receive, Scope, Send

SESSION_BODY_MAX_BYTES = 4 * 1024
LESSON_BODY_MAX_BYTES = 8 * 1024
# A signed continuation can replay five bounded accepted steps (opening stream
# lines are at most 16 KiB; continued responses at most 32 KiB). Browser-side
# filtering requires a second exact server-issued receipt prefix, which can be
# the same maximum size, plus the 12 KiB scene, 1 KiB plan, and fixed metadata.
# Keep the cap above that conservative 277-KiB honest maximum while remaining
# far below an unbounded upload.
LESSON_CONTINUATION_BODY_MAX_BYTES = 320 * 1024
ANNOTATION_BODY_MAX_BYTES = 6 * 1024


class _RequestBodyTooLarge(Exception):
    """Internal control flow for streamed bodies that cross the byte cap."""


class SessionBodyLimitMiddleware:
    """Reject oversized ``POST /session`` bodies before JSON parsing.

    ``Content-Length`` is checked up front. The wrapped ``receive`` callable
    also counts actual ASGI body chunks so missing, misleading, or chunked
    lengths cannot bypass the limit.
    """

    def __init__(
        self,
        app: ASGIApp,
        max_body_bytes: int = SESSION_BODY_MAX_BYTES,
        path_limits: dict[str, int] | None = None,
    ) -> None:
        self.app = app
        self.max_body_bytes = max_body_bytes
        self.path_limits = path_limits or {"/session": max_body_bytes}

    async def __call__(self, scope: Scope, receive: Receive, send: Send) -> None:
        max_body_bytes = self._body_limit(scope)
        if max_body_bytes is None:
            await self.app(scope, receive, send)
            return

        content_lengths = [
            value for name, value in scope.get("headers", []) if name.lower() == b"content-length"
        ]
        if content_lengths:
            if len(content_lengths) != 1 or not content_lengths[0].isdigit():
                await self._send_error(
                    send,
                    status_code=400,
                    code="invalid_content_length",
                    message="Invalid Content-Length header.",
                )
                return
            if int(content_lengths[0]) > max_body_bytes:
                await self._send_too_large(send, max_body_bytes)
                return

        observed_bytes = 0

        async def limited_receive() -> Message:
            nonlocal observed_bytes
            message = await receive()
            if message["type"] == "http.request":
                observed_bytes += len(message.get("body", b""))
                if observed_bytes > max_body_bytes:
                    raise _RequestBodyTooLarge
            return message

        try:
            await self.app(scope, limited_receive, send)
        except _RequestBodyTooLarge:
            await self._send_too_large(send, max_body_bytes)

    def _body_limit(self, scope: Scope) -> int | None:
        if scope["type"] != "http" or scope.get("method") != "POST":
            return None
        return self.path_limits.get(scope.get("path", ""))

    async def _send_too_large(self, send: Send, max_body_bytes: int) -> None:
        await self._send_error(
            send,
            status_code=413,
            code="request_too_large",
            message=f"Request body exceeds {max_body_bytes} bytes.",
        )

    @staticmethod
    async def _send_error(
        send: Send,
        *,
        status_code: int,
        code: str,
        message: str,
    ) -> None:
        body = json.dumps(
            {"detail": {"code": code, "message": message}},
            separators=(",", ":"),
        ).encode()
        await send(
            {
                "type": "http.response.start",
                "status": status_code,
                "headers": [
                    (b"content-type", b"application/json"),
                    (b"content-length", str(len(body)).encode()),
                    (b"cache-control", b"no-store"),
                ],
            }
        )
        await send({"type": "http.response.body", "body": body})
