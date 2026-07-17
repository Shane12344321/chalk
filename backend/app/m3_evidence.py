"""Strict, read-only verifier for a completed M3 live evidence package."""

from __future__ import annotations

import argparse
import json
from pathlib import Path
from typing import Any

from app.lesson_validation import validate_envelope
from app.m3_evaluation import (
    M3_QUALIFICATION_BOARD_MODEL,
    M3_QUALIFICATION_REASONING_EFFORT,
    MIN_MACHINE_COMPLETE_TOPICS,
    TOPICS,
)

MAX_RAW_BYTES = 256 * 1024
MAX_SCREENSHOT_BYTES = 8 * 1024 * 1024
MAX_NOTE_LENGTH = 500
FIRST_VISIBLE_INK_TARGET_MS = 6_000


class EvidenceError(ValueError):
    """A bounded list of reasons an M3 package is not acceptance evidence."""

    def __init__(self, issues: list[str]) -> None:
        self.issues = issues[:40]
        super().__init__("; ".join(self.issues))


def verify_evidence(evidence_dir: Path) -> dict[str, Any]:
    """Prove the complete live rubric; absence or ambiguity is a failure."""

    root = evidence_dir.resolve(strict=True)
    summary = _read_json(root / "summary.json")
    issues: list[str] = []
    expected_keys = [key for key, _topic in TOPICS]

    _expect(summary.get("schema") == "chalk.m3-live-evaluation.v2", issues, "schema mismatch")
    _expect(summary.get("owner_approved_batch") is True, issues, "owner approval missing")
    _expect(summary.get("execution") == "sequential_no_retry", issues, "execution mode mismatch")
    _expect(summary.get("expected_topics") == 10, issues, "expected topic count is not ten")
    _expect(summary.get("attempted_topics") == 10, issues, "not all ten topics were attempted")
    _expect(summary.get("stopped_early") is False, issues, "batch stopped early")
    _expect(summary.get("stop_reason") is None, issues, "batch has a stop reason")
    _expect(
        summary.get("expected_board_model") == M3_QUALIFICATION_BOARD_MODEL,
        issues,
        "qualification model declaration missing",
    )
    _expect(
        summary.get("board_models") == [M3_QUALIFICATION_BOARD_MODEL],
        issues,
        "Luna model identity missing",
    )
    _expect(
        summary.get("expected_reasoning_effort") == M3_QUALIFICATION_REASONING_EFFORT,
        issues,
        "qualification reasoning declaration missing",
    )
    _expect(
        summary.get("board_reasoning_efforts") == [M3_QUALIFICATION_REASONING_EFFORT],
        issues,
        "qualification reasoning identity missing",
    )

    board_hash = _single_hash(summary.get("board_prompt_sha256"), "board prompt", issues)
    repair_hash = _single_hash(summary.get("repair_prompt_sha256"), "repair prompt", issues)
    topics = summary.get("topics")
    if not isinstance(topics, list) or len(topics) != 10:
        issues.append("summary must contain exactly ten topic records")
        topics = []
    observed_keys = [topic.get("topic_key") for topic in topics if isinstance(topic, dict)]
    _expect(
        observed_keys == expected_keys, issues, "topic keys or order do not match the fixed rubric"
    )
    machine_complete_topics = sum(
        isinstance(topic, dict) and topic.get("status") == "complete" for topic in topics
    )
    _expect(
        summary.get("machine_complete_topics") == machine_complete_topics,
        issues,
        "machine-complete topic total is stale",
    )
    _expect(
        machine_complete_topics >= MIN_MACHINE_COMPLETE_TOPICS,
        issues,
        "fewer than eight topics completed generation",
    )

    human_passes = 0
    renderer_crashes = 0
    for index, topic in enumerate(topics):
        if not isinstance(topic, dict):
            issues.append(f"topic {index + 1} is not an object")
            continue
        key = (
            topic.get("topic_key")
            if isinstance(topic.get("topic_key"), str)
            else f"topic-{index + 1}"
        )
        raw_path = _evidence_path(root, topic.get("raw_ndjson_file"), ".ndjson", key, issues)
        if raw_path is not None:
            _verify_raw_stream(raw_path, topic, key, issues)

        schema_pass = topic.get("schema_pass")
        render_pass = topic.get("render_pass")
        layout_pass = topic.get("layout_pass")
        renderer_crash = topic.get("renderer_crash")
        _expect(isinstance(schema_pass, bool), issues, f"{key}: schema verdict missing")
        _expect(isinstance(render_pass, bool), issues, f"{key}: render verdict missing")
        _expect(isinstance(layout_pass, bool), issues, f"{key}: layout verdict missing")
        _expect(isinstance(renderer_crash, bool), issues, f"{key}: crash verdict missing")
        if renderer_crash is True:
            renderer_crashes += 1

        note = topic.get("human_reviewer_note")
        _expect(
            isinstance(note, str) and 1 <= len(note.strip()) <= MAX_NOTE_LENGTH,
            issues,
            f"{key}: bounded human reviewer note missing",
        )
        if render_pass is True:
            screenshot = _evidence_path(
                root,
                topic.get("render_screenshot"),
                (".png", ".jpg", ".jpeg", ".webp"),
                key,
                issues,
            )
            if screenshot is not None:
                _verify_screenshot(screenshot, key, issues)

        if (
            schema_pass is True
            and render_pass is True
            and layout_pass is True
            and renderer_crash is False
        ):
            human_passes += 1

    _expect(renderer_crashes == 0, issues, "renderer crash count is not zero")
    _expect(human_passes >= 8, issues, "fewer than eight topics pass schema, render, and layout")
    _expect(summary.get("human_pass_topics") == human_passes, issues, "human pass total is stale")
    _expect(
        summary.get("exit_gate_pass") is True, issues, "summary does not mark the exit gate passed"
    )

    timing_path = _evidence_path(
        root,
        summary.get("representative_browser_timing_file"),
        ".json",
        "representative timing",
        issues,
    )
    first_visible_ms: float | None = None
    if timing_path is not None:
        timing = _read_json(timing_path)
        first_visible_ms = _verify_timing(timing, board_hash, repair_hash, issues)

    if issues:
        raise EvidenceError(issues)
    return {
        "schema": "chalk.m3-evidence-verification.v1",
        "pass": True,
        "topics": 10,
        "human_pass_topics": human_passes,
        "renderer_crashes": renderer_crashes,
        "request_to_first_visible_ink_ms": first_visible_ms,
        "target_ms": FIRST_VISIBLE_INK_TARGET_MS,
        "board_model": M3_QUALIFICATION_BOARD_MODEL,
        "board_reasoning_effort": M3_QUALIFICATION_REASONING_EFFORT,
        "board_prompt_sha256": board_hash,
        "repair_prompt_sha256": repair_hash,
    }


def _verify_raw_stream(path: Path, topic: dict[str, Any], key: str, issues: list[str]) -> None:
    if path.stat().st_size > MAX_RAW_BYTES:
        issues.append(f"{key}: raw NDJSON exceeds byte budget")
        return
    request_id: str | None = None
    steps = 0
    terminal: dict[str, Any] | None = None
    try:
        for line in path.read_text(encoding="utf-8").splitlines():
            if not line.strip():
                continue
            envelope = json.loads(line)
            validate_envelope(envelope)
            observed_id = envelope["request_id"]
            request_id = request_id or observed_id
            if observed_id != request_id:
                raise ValueError("mixed request IDs")
            if envelope["type"] == "lesson.step":
                steps += 1
            elif envelope["type"] in {"lesson.done", "lesson.error"}:
                if terminal is not None:
                    raise ValueError("duplicate terminal")
                terminal = envelope
    except (UnicodeDecodeError, json.JSONDecodeError, ValueError) as error:
        issues.append(f"{key}: raw NDJSON invalid ({type(error).__name__})")
        return
    _expect(terminal is not None, issues, f"{key}: raw NDJSON has no terminal")
    _expect(topic.get("accepted_steps") == steps, issues, f"{key}: accepted-step count mismatch")
    if terminal and terminal["type"] == "lesson.done":
        _expect(terminal["accepted_steps"] == steps, issues, f"{key}: terminal count mismatch")


def _verify_screenshot(path: Path, key: str, issues: list[str]) -> None:
    size = path.stat().st_size
    _expect(8 <= size <= MAX_SCREENSHOT_BYTES, issues, f"{key}: screenshot size is invalid")
    header = path.read_bytes()[:12]
    valid = (
        header.startswith(b"\x89PNG\r\n\x1a\n")
        or header.startswith(b"\xff\xd8\xff")
        or (header.startswith(b"RIFF") and header[8:12] == b"WEBP")
    )
    _expect(valid, issues, f"{key}: screenshot file signature is invalid")


def _verify_timing(
    timing: dict[str, Any],
    board_hash: str | None,
    repair_hash: str | None,
    issues: list[str],
) -> float | None:
    _expect(timing.get("schema") == "chalk.m3-browser-timing.v1", issues, "timing schema mismatch")
    _expect(
        timing.get("board_model") == M3_QUALIFICATION_BOARD_MODEL,
        issues,
        "timing model mismatch",
    )
    _expect(
        timing.get("board_reasoning_effort") == M3_QUALIFICATION_REASONING_EFFORT,
        issues,
        "timing reasoning mismatch",
    )
    _expect(timing.get("board_prompt_sha256") == board_hash, issues, "timing board prompt mismatch")
    _expect(
        timing.get("repair_prompt_sha256") == repair_hash, issues, "timing repair prompt mismatch"
    )
    first_step = _finite_nonnegative(timing.get("request_to_first_valid_step_ms"))
    step_to_ink = _finite_nonnegative(timing.get("first_valid_step_to_first_visible_ink_ms"))
    first_visible = _finite_nonnegative(timing.get("request_to_first_visible_ink_ms"))
    _expect(first_step is not None, issues, "first-step timing missing")
    _expect(step_to_ink is not None, issues, "step-to-ink timing missing")
    _expect(first_visible is not None, issues, "first-visible-ink timing missing")
    if first_step is not None and step_to_ink is not None and first_visible is not None:
        _expect(
            abs((first_step + step_to_ink) - first_visible) <= 10,
            issues,
            "timing components disagree",
        )
        _expect(
            first_visible < FIRST_VISIBLE_INK_TARGET_MS,
            issues,
            "first visible ink missed six-second target",
        )
    _expect(
        timing.get("partial") is False, issues, "representative timing came from a partial lesson"
    )
    return first_visible


def _single_hash(value: Any, label: str, issues: list[str]) -> str | None:
    if (
        isinstance(value, list)
        and len(value) == 1
        and isinstance(value[0], str)
        and len(value[0]) == 64
        and all(character in "0123456789abcdef" for character in value[0])
    ):
        return value[0]
    issues.append(f"{label} hash is missing or inconsistent")
    return None


def _evidence_path(
    root: Path,
    value: Any,
    suffixes: str | tuple[str, ...],
    label: str,
    issues: list[str],
) -> Path | None:
    allowed = (suffixes,) if isinstance(suffixes, str) else suffixes
    if not isinstance(value, str) or not value:
        issues.append(f"{label}: evidence file path missing")
        return None
    candidate = (root / value).resolve()
    if (
        root not in candidate.parents
        or candidate.suffix.lower() not in allowed
        or not candidate.is_file()
    ):
        issues.append(f"{label}: evidence file is missing, outside the package, or wrong type")
        return None
    return candidate


def _read_json(path: Path) -> dict[str, Any]:
    value = json.loads(path.read_text(encoding="utf-8"))
    if not isinstance(value, dict):
        raise EvidenceError([f"{path.name} is not a JSON object"])
    return value


def _finite_nonnegative(value: Any) -> float | None:
    if isinstance(value, bool) or not isinstance(value, (int, float)):
        return None
    number = float(value)
    return number if number >= 0 and number < float("inf") else None


def _expect(condition: bool, issues: list[str], message: str) -> None:
    if not condition:
        issues.append(message)


def main() -> int:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--evidence-dir", type=Path, required=True)
    args = parser.parse_args()
    try:
        report = verify_evidence(args.evidence_dir)
    except (EvidenceError, FileNotFoundError, json.JSONDecodeError) as error:
        issues = error.issues if isinstance(error, EvidenceError) else [type(error).__name__]
        print(json.dumps({"pass": False, "issues": issues}, indent=2))
        return 1
    print(json.dumps(report, indent=2, sort_keys=True))
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
