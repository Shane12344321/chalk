"""Acceptance-grade checks for the M3 evidence verifier."""

import json
import uuid
from pathlib import Path

import pytest

from app.m3_evaluation import TOPICS
from app.m3_evidence import EvidenceError, verify_evidence


def build_complete_package(root: Path) -> Path:
    raw_dir = root / "raw"
    screenshot_dir = root / "screenshots"
    timing_dir = root / "timing"
    raw_dir.mkdir(parents=True)
    screenshot_dir.mkdir()
    timing_dir.mkdir()
    board_hash = "a" * 64
    repair_hash = "b" * 64
    topics = []
    for index, (key, title) in enumerate(TOPICS, start=1):
        request_id = str(uuid.UUID(int=index, version=4))
        step = {
            "id": "s1",
            "script": "A short valid explanation.",
            "ops": [{"op": "text", "id": "label", "region": "A1", "content": "Slope"}],
            "checkpoint": None,
        }
        envelopes = [
            {"type": "lesson.started", "request_id": request_id, "title": title},
            {"type": "lesson.step", "request_id": request_id, "step": step},
            {
                "type": "lesson.done",
                "request_id": request_id,
                "accepted_steps": 1,
                "repairs": 0,
                "dropped_steps": 0,
            },
        ]
        (raw_dir / f"{key}.ndjson").write_text(
            "\n".join(json.dumps(envelope) for envelope in envelopes) + "\n",
            encoding="utf-8",
        )
        (screenshot_dir / f"{key}.png").write_bytes(b"\x89PNG\r\n\x1a\nsynthetic")
        topics.append(
            {
                "topic_key": key,
                "status": "complete",
                "request_to_first_valid_step_ms": 900.0,
                "request_to_terminal_ms": 1_200.0,
                "accepted_steps": 1,
                "repairs": 0,
                "dropped_steps": 0,
                "terminal_error": None,
                "raw_ndjson_file": f"raw/{key}.ndjson",
                "browser_timing_file": None,
                "render_screenshot": f"screenshots/{key}.png",
                "schema_pass": True,
                "render_pass": True,
                "layout_pass": True,
                "renderer_crash": False,
                "human_reviewer_note": "Readable layout with no material overlap.",
            }
        )

    timing = {
        "schema": "chalk.m3-browser-timing.v1",
        "generated_at": "2026-07-16T00:00:00Z",
        "request_id_suffix": "12345678",
        "board_model": "gpt-5.6-luna",
        "board_reasoning_effort": "none",
        "board_prompt_sha256": board_hash,
        "repair_prompt_sha256": repair_hash,
        "request_to_first_valid_step_ms": 900.0,
        "first_valid_step_to_first_visible_ink_ms": 600.0,
        "request_to_first_visible_ink_ms": 1_500.0,
        "accepted_steps": 3,
        "repairs": 0,
        "dropped_steps": 0,
        "partial": False,
    }
    (timing_dir / "representative.json").write_text(json.dumps(timing), encoding="utf-8")
    summary = {
        "schema": "chalk.m3-live-evaluation.v2",
        "generated_at": "2026-07-16T00:00:00Z",
        "owner_approved_batch": True,
        "execution": "sequential_no_retry",
        "base_url": "http://127.0.0.1:8000",
        "expected_topics": 10,
        "attempted_topics": 10,
        "stopped_early": False,
        "stop_reason": None,
        "expected_board_model": "gpt-5.6-luna",
        "expected_reasoning_effort": "none",
        "board_models": ["gpt-5.6-luna"],
        "board_reasoning_efforts": ["none"],
        "board_prompt_sha256": [board_hash],
        "repair_prompt_sha256": [repair_hash],
        "machine_complete_topics": 10,
        "representative_browser_timing_file": "timing/representative.json",
        "first_visible_ink_target_ms": 6_000,
        "human_pass_topics": 10,
        "exit_gate_pass": True,
        "topics": topics,
    }
    (root / "summary.json").write_text(json.dumps(summary), encoding="utf-8")
    return root


def test_complete_package_proves_the_m3_exit_gate(tmp_path: Path) -> None:
    report = verify_evidence(build_complete_package(tmp_path / "evidence"))

    assert report == {
        "schema": "chalk.m3-evidence-verification.v1",
        "pass": True,
        "topics": 10,
        "human_pass_topics": 10,
        "renderer_crashes": 0,
        "request_to_first_visible_ink_ms": 1_500.0,
        "target_ms": 6_000,
        "board_model": "gpt-5.6-luna",
        "board_reasoning_effort": "none",
        "board_prompt_sha256": "a" * 64,
        "repair_prompt_sha256": "b" * 64,
    }


def test_missing_human_review_and_slow_ink_cannot_be_overclaimed(tmp_path: Path) -> None:
    root = build_complete_package(tmp_path / "evidence")
    summary_path = root / "summary.json"
    summary = json.loads(summary_path.read_text(encoding="utf-8"))
    summary["topics"][0]["layout_pass"] = None
    summary_path.write_text(json.dumps(summary), encoding="utf-8")
    timing_path = root / "timing/representative.json"
    timing = json.loads(timing_path.read_text(encoding="utf-8"))
    timing["first_valid_step_to_first_visible_ink_ms"] = 5_500.0
    timing["request_to_first_visible_ink_ms"] = 6_400.0
    timing_path.write_text(json.dumps(timing), encoding="utf-8")

    with pytest.raises(EvidenceError) as captured:
        verify_evidence(root)

    assert "layout verdict missing" in str(captured.value)
    assert "missed six-second target" in str(captured.value)


def test_evidence_paths_cannot_escape_the_package(tmp_path: Path) -> None:
    root = build_complete_package(tmp_path / "evidence")
    summary_path = root / "summary.json"
    summary = json.loads(summary_path.read_text(encoding="utf-8"))
    summary["topics"][0]["raw_ndjson_file"] = "../outside.ndjson"
    summary_path.write_text(json.dumps(summary), encoding="utf-8")

    with pytest.raises(EvidenceError, match="outside the package"):
        verify_evidence(root)


def test_terra_evidence_cannot_be_claimed_as_luna_qualification(tmp_path: Path) -> None:
    root = build_complete_package(tmp_path / "evidence")
    summary_path = root / "summary.json"
    summary = json.loads(summary_path.read_text(encoding="utf-8"))
    summary["board_models"] = ["gpt-5.6-terra"]
    summary_path.write_text(json.dumps(summary), encoding="utf-8")

    with pytest.raises(EvidenceError, match="Luna model identity missing"):
        verify_evidence(root)


def test_low_reasoning_evidence_cannot_be_claimed_as_none_baseline(tmp_path: Path) -> None:
    root = build_complete_package(tmp_path / "evidence")
    summary_path = root / "summary.json"
    summary = json.loads(summary_path.read_text(encoding="utf-8"))
    summary["board_reasoning_efforts"] = ["low"]
    summary_path.write_text(json.dumps(summary), encoding="utf-8")

    with pytest.raises(EvidenceError, match="qualification reasoning identity missing"):
        verify_evidence(root)
