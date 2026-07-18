"""Deterministic endpoint and parser tests for live lesson generation."""

import asyncio
import hashlib
import json
import logging
from collections.abc import AsyncIterator, Callable

import httpx
import pytest
from fastapi.testclient import TestClient
from pydantic import SecretStr

import app.lessons as lessons_module
from app.config import Settings
from app.dependencies import get_openai_http_client
from app.lesson_validation import LessonValidationState, StepValidationError, validate_step
from app.lessons import _JsonlBuffer, _SseParser
from app.main import create_app
from app.middleware import LESSON_BODY_MAX_BYTES

API_KEY = "standard-api-key-test-sentinel"
CLIENT_ID = "2f2db996-2dcc-4fc8-aa7f-206c7e7a9300"
REQUEST_ID = "783c6081-75a4-4ed2-8be7-4e0f32680a2b"
TOPIC = "Synthetic derivative topic"


def settings(**overrides: object) -> Settings:
    values: dict[str, object] = {
        "openai_api_key": SecretStr(API_KEY),
        "board_model": "gpt-5.6-luna",
        "board_reasoning_effort": "none",
        "frontend_origin": "http://localhost:5173",
        "safety_identifier_salt": "test-domain-separator",
    }
    values.update(overrides)
    return Settings(_env_file=None, **values)


def client_with_transport(
    handler: Callable[[httpx.Request], httpx.Response],
    *,
    app_settings: Settings | None = None,
) -> TestClient:
    application = create_app(app_settings or settings())
    upstream_client = httpx.AsyncClient(transport=httpx.MockTransport(handler))
    application.dependency_overrides[get_openai_http_client] = lambda: upstream_client
    return TestClient(application)


def lesson_payload(**overrides: object) -> dict[str, object]:
    value: dict[str, object] = {
        "request_id": REQUEST_ID,
        "client_id": CLIENT_ID,
        "topic": TOPIC,
        "student_context": "",
        "board_state": "",
    }
    value.update(overrides)
    return value


def valid_step(step_id: str = "s1", element_id: str = "label") -> dict[str, object]:
    return {
        "id": step_id,
        "script": "A short valid explanation.",
        "ops": [{"op": "text", "id": element_id, "region": "A1", "content": "Slope"}],
        "checkpoint": None,
    }


def sse_for_text(text: str, *, completed: bool = True) -> bytes:
    events = [
        {"type": "response.created", "response": {"id": "resp_test"}},
        {"type": "response.output_text.delta", "delta": text},
    ]
    if completed:
        events.append({"type": "response.completed", "response": {"id": "resp_test"}})
    return "".join(f"data: {json.dumps(event)}\n\n" for event in events).encode()


def completed_repair(step: dict[str, object]) -> httpx.Response:
    return httpx.Response(
        200,
        json={
            "status": "completed",
            "output": [
                {
                    "type": "message",
                    "content": [{"type": "output_text", "text": json.dumps(step)}],
                }
            ],
        },
    )


def response_lines(response: httpx.Response) -> list[dict[str, object]]:
    return [json.loads(line) for line in response.text.splitlines() if line.strip()]


def test_lesson_stream_emits_only_validated_chalk_envelopes(caplog) -> None:
    captured: httpx.Request | None = None
    step = valid_step()

    def handler(request: httpx.Request) -> httpx.Response:
        nonlocal captured
        captured = request
        return httpx.Response(200, content=sse_for_text(json.dumps(step)))

    caplog.set_level(logging.INFO)
    with client_with_transport(handler) as client:
        response = client.post("/lesson", json=lesson_payload())

    assert response.status_code == 200
    assert response.headers["content-type"].startswith("application/x-ndjson")
    assert response.headers["cache-control"] == "no-store"
    assert response.headers["x-chalk-board-model"] == "gpt-5.6-luna"
    assert response.headers["x-chalk-board-reasoning-effort"] == "none"
    prompt = lessons_module._prompt("board_engine.md")
    assert (
        response.headers["x-chalk-board-prompt-sha256"]
        == hashlib.sha256(prompt.encode()).hexdigest()
    )
    assert len(response.headers["x-chalk-repair-prompt-sha256"]) == 64
    assert response_lines(response) == [
        {"type": "lesson.started", "request_id": REQUEST_ID, "title": TOPIC},
        {"type": "lesson.step", "request_id": REQUEST_ID, "step": step},
        {
            "type": "lesson.done",
            "request_id": REQUEST_ID,
            "accepted_steps": 1,
            "repairs": 0,
            "dropped_steps": 0,
            "sanitized_steps": 0,
            "sanitized_fields": 0,
        },
    ]
    assert captured is not None
    assert captured.url == "https://api.openai.com/v1/responses"
    upstream = json.loads(captured.content)
    assert upstream["stream"] is True
    assert upstream["store"] is False
    assert upstream["model"] == "gpt-5.6-luna"
    assert upstream["reasoning"] == {"effort": "none"}
    assert captured.headers["authorization"] == f"Bearer {API_KEY}"
    assert TOPIC not in caplog.text
    assert json.dumps(step) not in caplog.text
    assert API_KEY not in caplog.text


def test_safe_sanitization_is_streamed_as_closed_bounded_evidence() -> None:
    raw = valid_step(step_id=" s1 ", element_id=" label ")
    raw["script"] = " A short valid explanation. "
    raw["ops"][0]["content"] = " Slope "  # type: ignore[index]

    def handler(_request: httpx.Request) -> httpx.Response:
        return httpx.Response(200, content=sse_for_text(json.dumps(raw)))

    with client_with_transport(handler) as client:
        response = client.post("/lesson", json=lesson_payload())

    lines = response_lines(response)
    assert [line["type"] for line in lines] == [
        "lesson.started",
        "lesson.warning",
        "lesson.step",
        "lesson.done",
    ]
    assert lines[1] == {
        "type": "lesson.warning",
        "request_id": REQUEST_ID,
        "code": "step_sanitized",
        "step_hint": "s1",
        "corrections": ["trimmed_outer_whitespace"],
        "correction_count": 4,
    }
    assert lines[2]["step"] == valid_step()
    assert lines[3]["sanitized_steps"] == 1
    assert lines[3]["sanitized_fields"] == 4


def test_repaired_candidate_reports_only_its_accepted_sanitization() -> None:
    invalid = valid_step()
    invalid["ops"] = [{"op": "curve", "id": "curve1", "axes_id": "missing", "expr": "x"}]
    repaired = valid_step()
    repaired["ops"][0]["content"] = " Slope "  # type: ignore[index]
    calls = 0

    def handler(request: httpx.Request) -> httpx.Response:
        nonlocal calls
        calls += 1
        if json.loads(request.content).get("stream") is True:
            return httpx.Response(200, content=sse_for_text(json.dumps(invalid)))
        return completed_repair(repaired)

    with client_with_transport(handler) as client:
        response = client.post("/lesson", json=lesson_payload())

    lines = response_lines(response)
    assert calls == 2
    assert [line.get("code") for line in lines if line["type"] == "lesson.warning"] == [
        "step_repaired",
        "step_sanitized",
    ]
    assert lines[-1]["sanitized_steps"] == 1
    assert lines[-1]["sanitized_fields"] == 1


def test_board_prompt_encodes_accumulated_whiteboard_layout() -> None:
    prompt = (lessons_module.PROMPT_DIR / "board_engine.md").read_text(encoding="utf-8")

    assert "one accumulated argument" in prompt
    assert "Prefer anchors over independent region placement" in prompt
    assert "do not add filler" in prompt
    assert "Use `text` for short identities" in prompt
    assert '"op":"text","id":"result"' in prompt
    assert '"content":"f\'(1) = 2"' in prompt


def test_board_prompt_encodes_the_spatial_contract() -> None:
    prompt = (lessons_module.PROMPT_DIR / "board_engine.md").read_text(encoding="utf-8")

    # Grid geometry the layout engine actually implements.
    assert "Columns `A B C D` run left to right" in prompt
    assert "rows `1 2 3` run top to bottom" in prompt
    assert "`left` spans columns A and B" in prompt
    # Renderer orientation: sketch y points down.
    assert "y pointing DOWN" in prompt
    assert "DECREASE y toward its peak" in prompt
    # Axes sizing guidance and curve domain rules.
    assert "belong in `left`, `right`, or `full`" in prompt
    assert "keep `log` and `sqrt` arguments positive" in prompt
    assert "Never use `**`" in prompt
    # visible_board is context, never an anchor target.
    assert "Never anchor to or reference a `visible_board` element ID" in prompt
    # The hardest op has a worked example.
    assert '"op":"sketch","id":"launch"' in prompt
    assert "Use at most one checkpoint in the whole lesson" in prompt


def test_board_prompt_teaches_shared_canvas_physics_primitives() -> None:
    prompt = (lessons_module.PROMPT_DIR / "board_engine.md").read_text(encoding="utf-8")
    assert '"op":"arrow","id":"incident"' in prompt
    assert '"op":"angle_arc","id":"theta"' in prompt
    assert '"stroke":"dashed"' in prompt
    assert "share one normalized y-down diagram canvas" in prompt


def test_physics_primitives_validate_on_one_shared_canvas() -> None:
    state = LessonValidationState()
    step = {
        "id": "s1",
        "script": "Draw the interface, normal, incident ray, and angle.",
        "ops": [
            {
                "op": "line",
                "id": "boundary",
                "region": "right",
                "from": [0.1, 0.55],
                "to": [0.9, 0.55],
                "stroke": "solid",
            },
            {
                "op": "line",
                "id": "normal",
                "canvas_id": "boundary",
                "from": [0.5, 0.1],
                "to": [0.5, 0.9],
                "stroke": "dashed",
            },
            {
                "op": "arrow",
                "id": "incident",
                "canvas_id": "boundary",
                "from": [0.15, 0.85],
                "to": [0.5, 0.55],
                "stroke": "solid",
                "label": "incident",
            },
            {
                "op": "angle_arc",
                "id": "theta",
                "canvas_id": "boundary",
                "center": [0.5, 0.55],
                "radius": 0.16,
                "start_deg": 45,
                "end_deg": 90,
                "stroke": "solid",
                "label": "theta",
            },
        ],
        "checkpoint": None,
    }
    assert [op["id"] for op in validate_step(step, state)["ops"]] == [
        "boundary",
        "normal",
        "incident",
        "theta",
    ]


def test_physics_primitive_rejects_non_diagram_canvas() -> None:
    state = LessonValidationState(accepted_ids={"title": "text"})
    step = {
        "id": "s1",
        "script": "This ray cannot use text as its coordinate canvas.",
        "ops": [
            {
                "op": "arrow",
                "id": "ray",
                "canvas_id": "title",
                "from": [0.1, 0.8],
                "to": [0.5, 0.5],
                "stroke": "solid",
            }
        ],
        "checkpoint": None,
    }
    with pytest.raises(StepValidationError, match="canvas reference"):
        validate_step(step, state)


def test_prior_prompt_versions_remain_selectable() -> None:
    accumulated = settings(board_prompt_version="v2")
    assert accumulated.board_prompt_name == "board_engine_v2.md"
    snapshot = (lessons_module.PROMPT_DIR / "board_engine_v2.md").read_text(encoding="utf-8")
    assert "Spatial narrative:" in snapshot
    assert "y pointing DOWN" not in snapshot


def test_qualified_board_prompt_remains_an_explicit_runtime_fallback() -> None:
    fallback = settings(board_prompt_version="v1")

    assert fallback.board_prompt_name == "board_engine_v1.md"
    assert "Spatial narrative:" not in (
        lessons_module.PROMPT_DIR / fallback.board_prompt_name
    ).read_text(encoding="utf-8")


def test_lesson_request_hashes_and_sends_selected_board_prompt() -> None:
    captured: httpx.Request | None = None

    def handler(request: httpx.Request) -> httpx.Response:
        nonlocal captured
        captured = request
        return httpx.Response(200, content=sse_for_text(json.dumps(valid_step())))

    fallback = settings(board_prompt_version="v1")
    with client_with_transport(handler, app_settings=fallback) as client:
        response = client.post("/lesson", json=lesson_payload())

    selected_prompt = (lessons_module.PROMPT_DIR / fallback.board_prompt_name).read_text(
        encoding="utf-8"
    )
    assert (
        response.headers["x-chalk-board-prompt-sha256"]
        == hashlib.sha256(selected_prompt.encode()).hexdigest()
    )
    assert captured is not None
    assert json.loads(captured.content)["instructions"] == selected_prompt


def test_invalid_step_is_repaired_at_most_once_when_first_repair_passes() -> None:
    calls = 0
    repair_body: dict[str, object] | None = None
    invalid = valid_step()
    invalid["ops"] = [{"op": "curve", "id": "curve1", "axes_id": "missing", "expr": "x"}]
    repaired = valid_step()

    def handler(request: httpx.Request) -> httpx.Response:
        nonlocal calls, repair_body
        calls += 1
        body = json.loads(request.content)
        if body.get("stream") is True:
            return httpx.Response(200, content=sse_for_text(json.dumps(invalid)))
        repair_body = body
        return httpx.Response(
            200,
            json={
                "status": "completed",
                "output": [
                    {
                        "type": "message",
                        "content": [{"type": "output_text", "text": json.dumps(repaired)}],
                    }
                ],
            },
        )

    with client_with_transport(handler) as client:
        response = client.post("/lesson", json=lesson_payload())

    lines = response_lines(response)
    assert calls == 2
    assert [line["type"] for line in lines] == [
        "lesson.started",
        "lesson.warning",
        "lesson.step",
        "lesson.done",
    ]
    assert lines[1]["code"] == "step_repaired"
    assert lines[-1]["repairs"] == 1
    assert repair_body is not None
    assert "text" not in repair_body
    assert repair_body["reasoning"] == {"effort": "none"}


def test_stream_processes_at_most_eight_candidate_steps() -> None:
    candidates = [
        valid_step(step_id=f"s{index}", element_id=f"label{index}") for index in range(1, 10)
    ]

    def handler(request: httpx.Request) -> httpx.Response:
        text = "\n".join(json.dumps(candidate) for candidate in candidates)
        return httpx.Response(200, content=sse_for_text(text))

    with client_with_transport(handler) as client:
        response = client.post("/lesson", json=lesson_payload())

    lines = response_lines(response)
    accepted = [line for line in lines if line["type"] == "lesson.step"]
    assert [line["step"]["id"] for line in accepted] == [f"s{index}" for index in range(1, 9)]
    assert lines[-1]["type"] == "lesson.done"
    assert lines[-1]["accepted_steps"] == 8


def test_two_failed_repairs_drop_step_and_activate_fallback() -> None:
    calls = 0
    invalid = valid_step()
    invalid["ops"] = [{"op": "curve", "id": "curve1", "axes_id": "missing", "expr": "x"}]

    def handler(request: httpx.Request) -> httpx.Response:
        nonlocal calls
        calls += 1
        body = json.loads(request.content)
        if body.get("stream") is True:
            return httpx.Response(200, content=sse_for_text(json.dumps(invalid)))
        return httpx.Response(
            200,
            json={
                "status": "completed",
                "output": [
                    {
                        "type": "message",
                        "content": [{"type": "output_text", "text": json.dumps(invalid)}],
                    }
                ],
            },
        )

    with client_with_transport(handler) as client:
        response = client.post("/lesson", json=lesson_payload())

    lines = response_lines(response)
    assert calls == 3
    assert lines[-2]["type"] == "lesson.warning"
    assert lines[-2]["code"] == "step_dropped"
    assert lines[-1] == {
        "type": "lesson.error",
        "request_id": REQUEST_ID,
        "code": "no_valid_steps",
        "fallback_available": True,
        "failure_origin": "generation",
        "repair_attempts": 2,
    }


@pytest.mark.parametrize(
    ("mode", "expected_code", "expected_reason"),
    [
        ("http", "upstream_rejected", "rate_limit"),
        ("transport", "upstream_unavailable", None),
    ],
)
def test_repair_failure_after_valid_output_is_attributed_and_counted(
    mode: str,
    expected_code: str,
    expected_reason: str | None,
) -> None:
    calls = 0
    accepted = valid_step()
    invalid = valid_step(step_id="s2", element_id="curve1")
    invalid["ops"] = [{"op": "curve", "id": "curve1", "axes_id": "missing", "expr": "x"}]

    def handler(request: httpx.Request) -> httpx.Response:
        nonlocal calls
        calls += 1
        body = json.loads(request.content)
        if body.get("stream") is True:
            text = json.dumps(accepted) + "\n" + json.dumps(invalid) + "\n"
            return httpx.Response(200, content=sse_for_text(text))
        if mode == "transport":
            raise httpx.ConnectError("private-repair-transport", request=request)
        return httpx.Response(429, text="private-repair-body")

    with client_with_transport(handler) as client:
        response = client.post("/lesson", json=lesson_payload())

    lines = response_lines(response)
    assert calls == 2
    assert [line["type"] for line in lines] == [
        "lesson.started",
        "lesson.step",
        "lesson.error",
    ]
    expected = {
        "type": "lesson.error",
        "request_id": REQUEST_ID,
        "code": expected_code,
        "fallback_available": True,
        "failure_origin": "repair",
        "repair_attempts": 1,
    }
    if expected_reason is not None:
        expected["upstream_reason"] = expected_reason
    assert lines[-1] == expected
    assert "private-repair" not in response.text


def test_lesson_wide_repair_budget_caps_additional_paid_calls() -> None:
    calls = 0
    invalid_steps = [
        {
            **valid_step(step_id=f"s{index}", element_id=f"curve{index}"),
            "ops": [
                {
                    "op": "curve",
                    "id": f"curve{index}",
                    "axes_id": "missing",
                    "expr": "x",
                }
            ],
        }
        for index in range(1, 4)
    ]

    def handler(request: httpx.Request) -> httpx.Response:
        nonlocal calls
        calls += 1
        body = json.loads(request.content)
        if body.get("stream") is True:
            text = "\n".join(json.dumps(step) for step in invalid_steps) + "\n"
            return httpx.Response(200, content=sse_for_text(text))
        return httpx.Response(
            200,
            json={
                "status": "completed",
                "output": [
                    {
                        "type": "message",
                        "content": [{"type": "output_text", "text": json.dumps(invalid_steps[0])}],
                    }
                ],
            },
        )

    with client_with_transport(handler) as client:
        response = client.post("/lesson", json=lesson_payload())

    lines = response_lines(response)
    assert calls == 1 + lessons_module.MAX_REPAIR_CALLS_PER_LESSON
    assert sum(line["type"] == "lesson.warning" for line in lines) == 3
    assert lines[-1] == {
        "type": "lesson.error",
        "request_id": REQUEST_ID,
        "code": "no_valid_steps",
        "fallback_available": True,
        "failure_origin": "generation",
        "repair_attempts": lessons_module.MAX_REPAIR_CALLS_PER_LESSON,
    }


def test_unterminated_upstream_stream_fails_without_forwarding_model_text() -> None:
    step = valid_step()

    def handler(request: httpx.Request) -> httpx.Response:
        return httpx.Response(200, content=sse_for_text(json.dumps(step), completed=False))

    with client_with_transport(handler) as client:
        response = client.post("/lesson", json=lesson_payload())

    lines = response_lines(response)
    assert lines[0]["type"] == "lesson.started"
    assert lines[1]["type"] == "lesson.step"
    assert lines[-1]["type"] == "lesson.error"
    assert lines[-1]["code"] == "invalid_stream"
    assert json.dumps(step) not in response.text


@pytest.mark.parametrize(
    ("terminal", "expected_code", "expected_reason"),
    [
        (
            {
                "type": "response.incomplete",
                "response": {"incomplete_details": {"reason": "max_output_tokens"}},
            },
            "upstream_incomplete",
            "max_output_tokens",
        ),
        (
            {
                "type": "response.failed",
                "response": {"error": {"code": "server_error", "message": "private"}},
            },
            "upstream_failed",
            "server_error",
        ),
        (
            {"type": "error", "code": "rate_limit_exceeded", "message": "private"},
            "upstream_error",
            "rate_limit",
        ),
    ],
)
def test_upstream_terminal_events_after_valid_output_are_distinguished(
    terminal: dict[str, object],
    expected_code: str,
    expected_reason: str,
) -> None:
    step = valid_step()
    events = [
        {"type": "response.output_text.delta", "delta": json.dumps(step) + "\n"},
        terminal,
    ]

    def handler(request: httpx.Request) -> httpx.Response:
        content = "".join(f"data: {json.dumps(event)}\n\n" for event in events).encode()
        return httpx.Response(200, content=content)

    with client_with_transport(handler) as client:
        response = client.post("/lesson", json=lesson_payload())

    lines = response_lines(response)
    assert [line["type"] for line in lines] == [
        "lesson.started",
        "lesson.step",
        "lesson.error",
    ]
    assert lines[-1] == {
        "type": "lesson.error",
        "request_id": REQUEST_ID,
        "code": expected_code,
        "fallback_available": True,
        "upstream_reason": expected_reason,
        "failure_origin": "generation",
        "repair_attempts": 0,
    }
    assert "private" not in response.text


def test_unknown_upstream_error_reason_is_redacted_and_final_flush_is_classified(caplog) -> None:
    step = valid_step()
    secret_code = "private-error-code-sentinel"
    delta = {"type": "response.output_text.delta", "delta": json.dumps(step)}
    terminal = {"type": "error", "code": secret_code, "message": "private-message"}
    content = (f"data: {json.dumps(delta)}\n\ndata: {json.dumps(terminal)}").encode()

    def handler(request: httpx.Request) -> httpx.Response:
        return httpx.Response(200, content=content)

    caplog.set_level(logging.WARNING)
    with client_with_transport(handler) as client:
        response = client.post("/lesson", json=lesson_payload())

    assert response_lines(response)[-1] == {
        "type": "lesson.error",
        "request_id": REQUEST_ID,
        "code": "upstream_error",
        "fallback_available": True,
        "upstream_reason": "unknown",
        "failure_origin": "generation",
        "repair_attempts": 0,
    }
    assert secret_code not in response.text
    assert secret_code not in caplog.text
    assert "private-message" not in caplog.text


@pytest.mark.parametrize(
    ("status_code", "expected_reason"),
    [
        (400, "invalid_request"),
        (401, "authentication"),
        (403, "permission"),
        (429, "rate_limit"),
        (500, "server_error"),
    ],
)
def test_http_rejections_use_only_allowlisted_status_categories(
    status_code: int,
    expected_reason: str,
) -> None:
    def handler(request: httpx.Request) -> httpx.Response:
        return httpx.Response(status_code, text="private-upstream-body")

    with client_with_transport(handler) as client:
        response = client.post("/lesson", json=lesson_payload())

    assert response_lines(response)[-1] == {
        "type": "lesson.error",
        "request_id": REQUEST_ID,
        "code": "upstream_rejected",
        "fallback_available": True,
        "upstream_reason": expected_reason,
        "failure_origin": "generation",
        "repair_attempts": 0,
    }
    assert "private-upstream-body" not in response.text


def test_invalid_upstream_utf8_terminates_as_invalid_stream() -> None:
    def handler(request: httpx.Request) -> httpx.Response:
        return httpx.Response(200, content=b"data: \xff\n\n")

    with client_with_transport(handler) as client:
        response = client.post("/lesson", json=lesson_payload())

    assert response_lines(response)[-1]["code"] == "invalid_stream"


def test_upstream_transport_failure_uses_bounded_error() -> None:
    def handler(request: httpx.Request) -> httpx.Response:
        raise httpx.ConnectError("synthetic transport failure", request=request)

    with client_with_transport(handler) as client:
        response = client.post("/lesson", json=lesson_payload())

    assert response_lines(response)[-1]["code"] == "upstream_unavailable"


def test_generation_deadline_terminates_the_stream(monkeypatch) -> None:
    async def stalled_lines(*_args: object) -> AsyncIterator[str]:
        await asyncio.sleep(0.05)
        if False:
            yield ""

    monkeypatch.setattr(lessons_module, "_stream_model_lines", stalled_lines)
    with client_with_transport(
        lambda request: httpx.Response(500),
        app_settings=settings(lesson_generation_timeout_seconds=0.001),
    ) as client:
        response = client.post("/lesson", json=lesson_payload())

    assert response_lines(response)[-1]["code"] == "generation_timeout"


def test_generation_deadline_during_repair_retains_origin_and_attempt_count(monkeypatch) -> None:
    invalid = valid_step()
    invalid["ops"] = [{"op": "curve", "id": "curve1", "axes_id": "missing", "expr": "x"}]

    async def stalled_repair(*_args: object) -> str:
        await asyncio.sleep(0.05)
        return json.dumps(invalid)

    async def invalid_lines(*_args: object) -> AsyncIterator[str]:
        yield json.dumps(invalid)

    monkeypatch.setattr(lessons_module, "_repair_step", stalled_repair)
    monkeypatch.setattr(lessons_module, "_stream_model_lines", invalid_lines)
    with client_with_transport(
        lambda request: httpx.Response(500),
        app_settings=settings(lesson_generation_timeout_seconds=0.001),
    ) as client:
        response = client.post("/lesson", json=lesson_payload())

    assert response_lines(response)[-1] == {
        "type": "lesson.error",
        "request_id": REQUEST_ID,
        "code": "generation_timeout",
        "fallback_available": True,
        "failure_origin": "repair",
        "repair_attempts": 1,
    }


def test_missing_key_uses_cached_fallback_without_calling_upstream() -> None:
    called = False

    def handler(request: httpx.Request) -> httpx.Response:
        nonlocal called
        called = True
        return httpx.Response(500)

    with client_with_transport(handler, app_settings=settings(openai_api_key=None)) as client:
        response = client.post("/lesson", json=lesson_payload())

    assert called is False
    assert response_lines(response)[-1]["code"] == "not_configured"


def test_lesson_body_limit_runs_before_json_parsing_or_upstream() -> None:
    called = False

    def handler(request: httpx.Request) -> httpx.Response:
        nonlocal called
        called = True
        return httpx.Response(500)

    with client_with_transport(handler) as client:
        response = client.post(
            "/lesson",
            content=b"private-topic-sentinel" + b"x" * LESSON_BODY_MAX_BYTES,
            headers={"Content-Type": "application/json"},
        )

    assert response.status_code == 413
    assert response.json()["detail"]["message"] == (
        f"Request body exceeds {LESSON_BODY_MAX_BYTES} bytes."
    )
    assert "private-topic-sentinel" not in response.text
    assert called is False


def test_sse_and_jsonl_parsers_tolerate_arbitrary_chunks_and_final_line() -> None:
    event = json.dumps({"type": "response.output_text.delta", "delta": '{"id":"s1"}'})
    encoded = f"data: {event}\r\n\r\n".encode()
    parser = _SseParser()
    observed: list[str] = []
    for byte in encoded:
        observed.extend(parser.feed(bytes([byte])))
    observed.extend(parser.finish())
    assert observed == [event]

    jsonl = _JsonlBuffer()
    assert jsonl.feed('{"id":') == []
    assert jsonl.feed('"s1"}\n\n{"id":"s2"}') == ['{"id":"s1"}']
    assert jsonl.finish() == '{"id":"s2"}'


def test_large_completed_event_overhead_does_not_consume_model_text_budget() -> None:
    step = valid_step()
    events = [
        {"type": "response.output_text.delta", "delta": json.dumps(step)},
        {
            "type": "response.completed",
            "response": {
                "id": "resp_test",
                "status": "completed",
                "ignored_transport_overhead": "x" * (lessons_module.MAX_MODEL_OUTPUT_BYTES + 1),
            },
        },
    ]

    def handler(request: httpx.Request) -> httpx.Response:
        content = "".join(f"data: {json.dumps(event)}\n\n" for event in events).encode()
        return httpx.Response(200, content=content)

    with client_with_transport(handler) as client:
        response = client.post("/lesson", json=lesson_payload())

    assert response_lines(response)[-1] == {
        "type": "lesson.done",
        "request_id": REQUEST_ID,
        "accepted_steps": 1,
        "repairs": 0,
        "dropped_steps": 0,
        "sanitized_steps": 0,
        "sanitized_fields": 0,
    }


def test_output_after_completed_is_rejected_as_an_invalid_stream() -> None:
    first = valid_step()
    late = valid_step(step_id="s2", element_id="late")
    events = [
        {"type": "response.output_text.delta", "delta": json.dumps(first) + "\n"},
        {"type": "response.completed", "response": {"id": "resp_test"}},
        {"type": "response.output_text.delta", "delta": json.dumps(late) + "\n"},
    ]

    def handler(request: httpx.Request) -> httpx.Response:
        content = "".join(f"data: {json.dumps(event)}\n\n" for event in events).encode()
        return httpx.Response(200, content=content)

    with client_with_transport(handler) as client:
        response = client.post("/lesson", json=lesson_payload())

    lines = response_lines(response)
    assert [line["type"] for line in lines] == [
        "lesson.started",
        "lesson.step",
        "lesson.error",
    ]
    assert lines[-1]["code"] == "invalid_stream"
    assert lines[-1]["failure_origin"] == "generation"


def test_model_text_budget_remains_independent_from_transport_budget(monkeypatch) -> None:
    monkeypatch.setattr(lessons_module, "MAX_MODEL_OUTPUT_BYTES", 10)
    jsonl = _JsonlBuffer()

    assert jsonl.feed("12345\n") == ["12345"]
    with pytest.raises(ValueError, match="model output exceeds byte budget"):
        jsonl.feed("678901")


def test_upstream_transport_budget_remains_bounded(monkeypatch) -> None:
    monkeypatch.setattr(lessons_module, "MAX_UPSTREAM_STREAM_BYTES", 10)
    parser = _SseParser()

    with pytest.raises(ValueError, match="upstream stream exceeds byte budget"):
        parser.feed(b"x" * 11)
