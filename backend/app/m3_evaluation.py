"""Owner-gated, sequential M3 live lesson evaluation harness.

This module is never imported by the web application and never runs in CI. It
retains synthetic-topic NDJSON plus redacted counters/timings for an explicit
one-topic smoke or the separate M3 acceptance batch. Neither mode retries a
topic or runs topics in parallel; each topic may make bounded repair calls.
"""

from __future__ import annotations

import argparse
import asyncio
import json
import time
import uuid
from collections.abc import Sequence
from dataclasses import dataclass
from datetime import UTC, datetime
from pathlib import Path
from typing import Any
from urllib.parse import urlsplit

import httpx

from app.config import Settings
from app.lesson_validation import (
    LessonValidationState,
    StepValidationError,
    validate_envelope,
    validate_step,
)
from app.lessons import LessonRequest, _GenerationFailure, _prompt_sha256, _repair_step

TOPICS: tuple[tuple[str, str], ...] = (
    ("derivative", "Derivative as slope at a point"),
    ("chain-rule", "Chain rule intuition"),
    ("integral-area", "Integral as area"),
    ("unit-circle", "Unit circle to sine wave"),
    ("projectile-range", "Projectile range versus angle"),
    ("pendulum-shm", "Pendulum simple harmonic motion"),
    ("newton-second-law", "Newton's second law with a free-body diagram"),
    ("vector-addition", "Vector addition"),
    ("exponential-growth-decay", "Exponential growth and decay"),
    ("standing-waves", "Standing waves"),
)

BATCH_STOP_ERROR_CODES = {"not_configured", "upstream_rejected", "upstream_unavailable"}
REQUEST_SCOPED_UPSTREAM_ERROR_CODES = {
    "upstream_failed",
    "upstream_incomplete",
    "upstream_error",
}
BATCH_CONTINUE_UPSTREAM_REASONS = {"max_output_tokens", "content_filter"}
MIN_MACHINE_COMPLETE_TOPICS = 8
M3_QUALIFICATION_BOARD_MODEL = "gpt-5.6-luna"
M3_QUALIFICATION_REASONING_EFFORT = "none"
SMOKE_TOPIC = ("projectile-smoke", "Projectile range versus angle")
REPAIR_SMOKE_INVALID_STEP = json.dumps(
    {
        "id": "probe_step",
        "script": "Show one short label for a unit circle.",
        "ops": [
            {
                "op": "text",
                "id": "probe_label",
                "region": "A1",
                "content": "",
            }
        ],
        "checkpoint": None,
    },
    separators=(",", ":"),
)


@dataclass(frozen=True)
class TopicResult:
    """One synthetic topic's redacted machine evidence."""

    key: str
    status: str
    first_valid_step_ms: float | None
    terminal_ms: float
    accepted_steps: int
    repairs: int
    dropped_steps: int
    terminal_error: str | None
    raw_ndjson_file: str
    board_model: str | None
    board_reasoning_effort: str | None
    board_prompt_sha256: str | None
    repair_prompt_sha256: str | None
    terminal_reason: str | None = None
    failure_origin: str | None = None
    harness_error: str | None = None

    def evidence(self) -> dict[str, Any]:
        return {
            "topic_key": self.key,
            "status": self.status,
            "request_to_first_valid_step_ms": self.first_valid_step_ms,
            "request_to_terminal_ms": self.terminal_ms,
            "accepted_steps": self.accepted_steps,
            "repairs": self.repairs,
            "dropped_steps": self.dropped_steps,
            "terminal_error": self.terminal_error,
            "terminal_reason": self.terminal_reason,
            "failure_origin": self.failure_origin,
            "harness_error": self.harness_error,
            "raw_ndjson_file": self.raw_ndjson_file,
            "board_reasoning_effort": self.board_reasoning_effort,
            "browser_timing_file": None,
            "render_screenshot": None,
            "schema_pass": self.status == "complete",
            "render_pass": None,
            "layout_pass": None,
            "renderer_crash": None,
            "human_reviewer_note": None,
        }


def evaluate_topic(
    client: httpx.Client,
    *,
    base_url: str,
    client_id: str,
    key: str,
    topic: str,
    raw_dir: Path,
) -> TopicResult:
    """Run one request with no retry and retain the server-owned NDJSON."""

    request_id = str(uuid.uuid4())
    started_at = time.perf_counter()
    first_valid_step_ms: float | None = None
    accepted_steps = 0
    repairs = 0
    repaired_steps = 0
    dropped_steps = 0
    terminal_error: str | None = None
    terminal_reason: str | None = None
    failure_origin: str | None = None
    terminal_seen = False
    raw_path = raw_dir / f"{key}.ndjson"

    with client.stream(
        "POST",
        f"{base_url}/lesson",
        json={
            "request_id": request_id,
            "client_id": client_id,
            "topic": topic,
            "student_context": "",
            "board_state": "",
        },
        headers={"Content-Type": "application/json"},
    ) as response:
        response.raise_for_status()
        content_type = response.headers.get("content-type", "").lower()
        if not content_type.startswith("application/x-ndjson"):
            raise ValueError("unexpected lesson response media type")
        board_model = _bounded_header(response.headers.get("x-chalk-board-model"), 40)
        board_reasoning_effort = _bounded_header(
            response.headers.get("x-chalk-board-reasoning-effort"), 8
        )
        board_prompt_sha256 = _sha256_header(response.headers.get("x-chalk-board-prompt-sha256"))
        repair_prompt_sha256 = _sha256_header(response.headers.get("x-chalk-repair-prompt-sha256"))

        with raw_path.open("x", encoding="utf-8") as raw_file:
            for line in response.iter_lines():
                if not line.strip():
                    continue
                raw_file.write(line + "\n")
                envelope = json.loads(line)
                validate_envelope(envelope)
                if envelope["request_id"] != request_id:
                    raise ValueError("lesson response request ID mismatch")
                event_type = envelope["type"]
                if terminal_seen:
                    raise ValueError("lesson response continued after its terminal envelope")
                if event_type == "lesson.step":
                    accepted_steps += 1
                    if first_valid_step_ms is None:
                        first_valid_step_ms = _elapsed_ms(started_at)
                elif event_type == "lesson.warning":
                    if envelope["code"] == "step_repaired":
                        repaired_steps += 1
                    elif envelope["code"] == "step_dropped":
                        dropped_steps += 1
                elif event_type == "lesson.done":
                    terminal_seen = True
                    if envelope["accepted_steps"] != accepted_steps:
                        raise ValueError("lesson completion count mismatch")
                    if envelope["repairs"] < repaired_steps:
                        raise ValueError("lesson repair count is below repaired-step warnings")
                    if envelope["dropped_steps"] != dropped_steps:
                        raise ValueError("lesson dropped-step count mismatch")
                    repairs = envelope["repairs"]
                elif event_type == "lesson.error":
                    terminal_seen = True
                    terminal_error = envelope["code"]
                    terminal_reason = envelope.get("upstream_reason")
                    failure_origin = envelope.get("failure_origin")
                    repair_attempts = envelope.get("repair_attempts", repaired_steps)
                    if repair_attempts < repaired_steps:
                        raise ValueError("lesson repair count is below repaired-step warnings")
                    repairs = repair_attempts

    if not terminal_seen:
        raise ValueError("lesson response ended without a terminal envelope")
    return TopicResult(
        key=key,
        status="complete" if terminal_error is None else "error",
        first_valid_step_ms=first_valid_step_ms,
        terminal_ms=_elapsed_ms(started_at),
        accepted_steps=accepted_steps,
        repairs=repairs,
        dropped_steps=dropped_steps,
        terminal_error=terminal_error,
        raw_ndjson_file=str(Path("raw") / raw_path.name),
        board_model=board_model,
        board_reasoning_effort=board_reasoning_effort,
        board_prompt_sha256=board_prompt_sha256,
        repair_prompt_sha256=repair_prompt_sha256,
        terminal_reason=terminal_reason,
        failure_origin=failure_origin,
    )


def run_batch(base_url: str, output_dir: Path) -> tuple[dict[str, Any], bool]:
    """Run the fixed topics once, stopping when the acceptance gate is unreachable."""

    with httpx.Client(
        timeout=httpx.Timeout(45.0), follow_redirects=False, trust_env=False
    ) as client:
        _validate_preflight(client, base_url)
        output_dir.mkdir(parents=True, exist_ok=False)
        raw_dir = output_dir / "raw"
        raw_dir.mkdir()
        client_id = str(uuid.uuid4())
        results: list[TopicResult] = []
        stop_reason: str | None = None
        for key, topic in TOPICS:
            topic_started_at = time.perf_counter()
            try:
                result = evaluate_topic(
                    client,
                    base_url=base_url,
                    client_id=client_id,
                    key=key,
                    topic=topic,
                    raw_dir=raw_dir,
                )
            except Exception as error:
                category = _harness_error_category(error)
                result = _harness_failure_result(
                    key,
                    raw_dir,
                    topic_started_at,
                    category,
                )
                stop_reason = f"harness_error:{category}"
            results.append(result)
            if stop_reason is not None:
                break
            stop_reason = _batch_stop_reason(result)
            if stop_reason is not None:
                break
            machine_failures = sum(item.status != "complete" for item in results)
            if machine_failures > len(TOPICS) - MIN_MACHINE_COMPLETE_TOPICS:
                stop_reason = f"gate_unreachable:{machine_failures}_machine_failures"
                break

    stopped_early = stop_reason is not None
    models = sorted({result.board_model for result in results if result.board_model})
    reasoning_efforts = sorted(
        {result.board_reasoning_effort for result in results if result.board_reasoning_effort}
    )
    board_hashes = sorted(
        {result.board_prompt_sha256 for result in results if result.board_prompt_sha256}
    )
    repair_hashes = sorted(
        {result.repair_prompt_sha256 for result in results if result.repair_prompt_sha256}
    )
    summary: dict[str, Any] = {
        "schema": "chalk.m3-live-evaluation.v2",
        "generated_at": datetime.now(UTC).isoformat(),
        "owner_approved_batch": True,
        "execution": "sequential_no_retry",
        "base_url": base_url,
        "expected_topics": len(TOPICS),
        "attempted_topics": len(results),
        "stopped_early": stopped_early,
        "stop_reason": stop_reason,
        "expected_board_model": M3_QUALIFICATION_BOARD_MODEL,
        "expected_reasoning_effort": M3_QUALIFICATION_REASONING_EFFORT,
        "board_models": models,
        "board_reasoning_efforts": reasoning_efforts,
        "board_prompt_sha256": board_hashes,
        "repair_prompt_sha256": repair_hashes,
        "machine_complete_topics": sum(result.status == "complete" for result in results),
        "representative_browser_timing_file": None,
        "first_visible_ink_target_ms": 6_000,
        "human_pass_topics": None,
        "exit_gate_pass": None,
        "topics": [result.evidence() for result in results],
    }
    (output_dir / "summary.json").write_text(
        json.dumps(summary, indent=2, sort_keys=True) + "\n",
        encoding="utf-8",
    )
    return summary, stopped_early


def _batch_stop_reason(result: TopicResult) -> str | None:
    if result.board_model != M3_QUALIFICATION_BOARD_MODEL:
        return "board_model_mismatch"
    if result.board_reasoning_effort != M3_QUALIFICATION_REASONING_EFFORT:
        return "reasoning_effort_mismatch"
    if result.terminal_error in BATCH_STOP_ERROR_CODES:
        return f"terminal:{result.terminal_error}"
    if result.terminal_error in REQUEST_SCOPED_UPSTREAM_ERROR_CODES:
        if result.terminal_reason in BATCH_CONTINUE_UPSTREAM_REASONS:
            return None
        return f"upstream_reason:{result.terminal_reason or 'missing'}"
    return None


def _harness_error_category(error: Exception) -> str:
    if isinstance(error, httpx.HTTPStatusError):
        return "http_status"
    if isinstance(error, httpx.RequestError):
        return "transport"
    if isinstance(error, json.JSONDecodeError):
        return "invalid_json"
    if isinstance(error, ValueError):
        return "invalid_protocol"
    return "unexpected"


def _harness_failure_result(
    key: str,
    raw_dir: Path,
    started_at: float,
    category: str,
) -> TopicResult:
    raw_path = raw_dir / f"{key}.ndjson"
    accepted_steps, repairs, dropped_steps = _recover_partial_counts(raw_path)
    return TopicResult(
        key=key,
        status="harness_error",
        first_valid_step_ms=None,
        terminal_ms=_elapsed_ms(started_at),
        accepted_steps=accepted_steps,
        repairs=repairs,
        dropped_steps=dropped_steps,
        terminal_error=None,
        raw_ndjson_file=str(Path("raw") / f"{key}.ndjson"),
        board_model=None,
        board_reasoning_effort=None,
        board_prompt_sha256=None,
        repair_prompt_sha256=None,
        harness_error=category,
    )


def _recover_partial_counts(path: Path) -> tuple[int, int, int]:
    if not path.is_file():
        return 0, 0, 0
    accepted_steps = 0
    repairs = 0
    repaired_steps = 0
    dropped_steps = 0
    try:
        lines = path.read_text(encoding="utf-8").splitlines()
    except (OSError, UnicodeDecodeError):
        return 0, 0, 0
    for line in lines:
        if not line.strip():
            continue
        try:
            envelope = json.loads(line)
            validate_envelope(envelope)
        except (json.JSONDecodeError, ValueError):
            break
        event_type = envelope["type"]
        if event_type == "lesson.step":
            accepted_steps += 1
        elif event_type == "lesson.warning":
            if envelope["code"] == "step_repaired":
                repaired_steps += 1
            elif envelope["code"] == "step_dropped":
                dropped_steps += 1
        elif event_type == "lesson.done":
            repairs = envelope["repairs"]
            dropped_steps = envelope["dropped_steps"]
        elif event_type == "lesson.error":
            repairs = envelope.get("repair_attempts", repaired_steps)
    return accepted_steps, max(repairs, repaired_steps), dropped_steps


def run_smoke(base_url: str, output_dir: Path) -> tuple[dict[str, Any], bool]:
    """Run exactly one representative topic with no retry or narration call."""

    with httpx.Client(
        timeout=httpx.Timeout(45.0), follow_redirects=False, trust_env=False
    ) as client:
        _validate_preflight(client, base_url)
        output_dir.mkdir(parents=True, exist_ok=False)
        raw_dir = output_dir / "raw"
        raw_dir.mkdir()
        key, topic = SMOKE_TOPIC
        topic_started_at = time.perf_counter()
        try:
            result = evaluate_topic(
                client,
                base_url=base_url,
                client_id=str(uuid.uuid4()),
                key=key,
                topic=topic,
                raw_dir=raw_dir,
            )
        except Exception as error:
            result = _harness_failure_result(
                key,
                raw_dir,
                topic_started_at,
                _harness_error_category(error),
            )

    smoke_pass = (
        result.status == "complete"
        and result.accepted_steps > 0
        and result.first_valid_step_ms is not None
        and result.board_model == M3_QUALIFICATION_BOARD_MODEL
        and result.board_reasoning_effort == M3_QUALIFICATION_REASONING_EFFORT
        and result.board_prompt_sha256 is not None
        and result.repair_prompt_sha256 is not None
    )
    summary: dict[str, Any] = {
        "schema": "chalk.m3-live-smoke.v2",
        "generated_at": datetime.now(UTC).isoformat(),
        "owner_approved_smoke": True,
        "execution": "one_topic_no_retry",
        "base_url": base_url,
        "expected_topics": 1,
        "attempted_topics": 1,
        "expected_board_model": M3_QUALIFICATION_BOARD_MODEL,
        "expected_reasoning_effort": M3_QUALIFICATION_REASONING_EFFORT,
        "smoke_pass": smoke_pass,
        "topic": result.evidence(),
        "board_model": result.board_model,
        "board_reasoning_effort": result.board_reasoning_effort,
        "board_prompt_sha256": result.board_prompt_sha256,
        "repair_prompt_sha256": result.repair_prompt_sha256,
    }
    (output_dir / "summary.json").write_text(
        json.dumps(summary, indent=2, sort_keys=True) + "\n",
        encoding="utf-8",
    )
    return summary, smoke_pass


def run_repair_smoke(output_dir: Path) -> tuple[dict[str, Any], bool]:
    """Issue exactly one synthetic repair call and retain no generated content."""

    settings = Settings()
    if not settings.has_openai_api_key:
        raise ValueError("M3 repair smoke has no configured API key")
    if settings.board_model != M3_QUALIFICATION_BOARD_MODEL:
        raise ValueError("M3 repair smoke board model mismatch")
    if settings.board_reasoning_effort != M3_QUALIFICATION_REASONING_EFFORT:
        raise ValueError("M3 repair smoke reasoning effort mismatch")

    output_dir.mkdir(parents=True, exist_ok=False)
    started_at = time.perf_counter()
    passed = False
    terminal_error: str | None = None
    terminal_reason: str | None = None
    harness_error: str | None = None

    try:
        repaired_text = asyncio.run(_run_repair_probe(settings))
        repaired = json.loads(repaired_text)
        validate_step(repaired, LessonValidationState())
        passed = True
    except _GenerationFailure as error:
        terminal_error = error.code
        terminal_reason = error.upstream_reason
    except (json.JSONDecodeError, StepValidationError, ValueError):
        harness_error = "invalid_repair"
    except Exception:
        harness_error = "unexpected"

    summary: dict[str, Any] = {
        "schema": "chalk.m3-repair-smoke.v1",
        "generated_at": datetime.now(UTC).isoformat(),
        "owner_approved_repair_smoke": True,
        "execution": "one_repair_call_no_retry",
        "board_model": settings.board_model,
        "board_reasoning_effort": settings.board_reasoning_effort,
        "repair_prompt_sha256": _prompt_sha256("repair.md"),
        "attempted_repair_calls": 1,
        "repair_pass": passed,
        "terminal_error": terminal_error,
        "terminal_reason": terminal_reason,
        "harness_error": harness_error,
        "elapsed_ms": _elapsed_ms(started_at),
    }
    (output_dir / "summary.json").write_text(
        json.dumps(summary, indent=2, sort_keys=True) + "\n",
        encoding="utf-8",
    )
    return summary, passed


async def _run_repair_probe(settings: Settings) -> str:
    payload = LessonRequest(
        request_id=str(uuid.uuid4()),
        client_id=str(uuid.uuid4()),
        topic="Unit circle repair-path probe",
        student_context="",
        board_state="",
    )
    async with httpx.AsyncClient(follow_redirects=False, trust_env=False) as client:
        return await _repair_step(
            REPAIR_SMOKE_INVALID_STEP,
            ["content must be a nonempty string"],
            LessonValidationState(),
            payload,
            settings,
            client,
        )


def _validate_preflight(client: httpx.Client, base_url: str) -> None:
    """Reject stale or unconfigured servers before any paid lesson request."""

    response = client.get(f"{base_url}/health")
    response.raise_for_status()
    payload = response.json()
    board = payload.get("board") if isinstance(payload, dict) else None
    if not isinstance(board, dict) or board.get("configured") is not True:
        raise ValueError("M3 evaluation backend has no configured board model")
    if board.get("model") != M3_QUALIFICATION_BOARD_MODEL:
        raise ValueError(
            "M3 evaluation backend model mismatch: restart with "
            f"BOARD_MODEL={M3_QUALIFICATION_BOARD_MODEL}"
        )
    if board.get("reasoning_effort") != M3_QUALIFICATION_REASONING_EFFORT:
        raise ValueError(
            "M3 evaluation backend reasoning mismatch: restart with "
            f"BOARD_REASONING_EFFORT={M3_QUALIFICATION_REASONING_EFFORT}"
        )


def main(argv: Sequence[str] | None = None) -> int:
    parser = argparse.ArgumentParser(description=__doc__)
    subparsers = parser.add_subparsers(dest="mode", required=True)
    for mode, help_text in (
        ("repair-smoke", "Run exactly one bounded repair-path call."),
        ("smoke", "Run exactly one bounded projectile topic."),
        ("batch", "Run the fixed ten-topic M3 acceptance batch."),
    ):
        command = subparsers.add_parser(mode, help=help_text)
        if mode != "repair-smoke":
            command.add_argument("--base-url", default="http://127.0.0.1:8000")
        command.add_argument("--output-dir", type=Path, required=True)
        command.add_argument(
            "--approved-by-owner",
            action="store_true",
            help=f"Required acknowledgement that the owner approved this live {mode}.",
        )
    args = parser.parse_args(argv)
    if not args.approved_by_owner:
        parser.error(f"refusing live {args.mode} without --approved-by-owner")
    if args.mode == "repair-smoke":
        summary, passed = run_repair_smoke(args.output_dir)
        result = {
            "mode": "repair-smoke",
            "summary": str(args.output_dir / "summary.json"),
            "attempted_repair_calls": summary["attempted_repair_calls"],
            "pass": passed,
        }
    elif args.mode == "smoke":
        base_url = _validated_base_url(args.base_url)
        summary, passed = run_smoke(base_url, args.output_dir)
        result = {
            "mode": "smoke",
            "summary": str(args.output_dir / "summary.json"),
            "attempted_topics": summary["attempted_topics"],
            "pass": passed,
        }
    else:
        base_url = _validated_base_url(args.base_url)
        summary, stopped_early = run_batch(base_url, args.output_dir)
        passed = not stopped_early
        result = {
            "mode": "batch",
            "summary": str(args.output_dir / "summary.json"),
            "attempted_topics": summary["attempted_topics"],
            "stopped_early": stopped_early,
            "stop_reason": summary["stop_reason"],
            "machine_complete_topics": summary["machine_complete_topics"],
        }
    print(json.dumps(result))
    return 0 if passed else 2


def _validated_base_url(value: str) -> str:
    candidate = value.rstrip("/")
    parsed = urlsplit(candidate)
    if (
        parsed.scheme != "http"
        or parsed.hostname not in {"localhost", "127.0.0.1"}
        or parsed.username is not None
        or parsed.password is not None
        or parsed.path
        or parsed.query
        or parsed.fragment
    ):
        raise ValueError("M3 evaluation endpoint must be one explicit localhost HTTP origin")
    return candidate


def _elapsed_ms(started_at: float) -> float:
    return round((time.perf_counter() - started_at) * 1_000, 1)


def _bounded_header(value: str | None, max_length: int) -> str | None:
    if not value or len(value) > max_length:
        return None
    return value if all(character.isalnum() or character in "-_." for character in value) else None


def _sha256_header(value: str | None) -> str | None:
    if value and len(value) == 64 and all(character in "0123456789abcdef" for character in value):
        return value
    return None


if __name__ == "__main__":
    raise SystemExit(main())
