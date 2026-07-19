"""Acceptance checks for bounded drawing-experiment evidence."""

from __future__ import annotations

import json
from copy import deepcopy
from pathlib import Path

import pytest

from app.drawing_experiments import (
    ABORTED_DECISION_RATIONALE,
    ExperimentBudgetExceeded,
    ExperimentBudgetGuard,
    ExperimentEvidenceError,
    calibrate_vision_proxy,
    configuration_sha256,
    load_experiment_record,
    main,
    verify_experiment_record,
)

PROJECT_ROOT = Path(__file__).resolve().parents[2]


def configuration() -> dict[str, object]:
    return {
        "board_model": "gpt-5.6-luna",
        "board_reasoning_effort": "none",
        "board_prompt_sha256": "a" * 64,
        "repair_prompt_sha256": "b" * 64,
        "continuation_prompt_sha256": "c" * 64,
        "lesson_schema_version": "1.2",
        "lesson_schema_sha256": "d" * 64,
        "lesson_plan_schema_sha256": "e" * 64,
        "resolved_scene_schema_sha256": "f" * 64,
        "resolver_policy_revision": "resolver-density-constructions-tangent-v3",
        "realtime_model": None,
        "realtime_voice": None,
        "realtime_base_instructions_sha256": None,
        "realtime_tool_contract_sha256": None,
        "browser_engine": "chromium",
        "browser_version": "126.0.0.0",
        "annotation_prompt_sha256": None,
        "annotation_schema_sha256": None,
        "board_renderer": "rough-svg",
        "sync_mode": "fixed",
        "partial_ink": "off",
        "qa_direct_draw": "off",
        "attention_choreography": "off",
        "remote_audio_activity": "off",
        "annotation_whitespace": "off",
        "lesson_generation": "one-shot",
    }


def completed_record() -> dict[str, object]:
    config = configuration()
    topic_ids = ["derivative", "unit-circle", "projectile", "forces", "waves"]
    topic_results = []
    ratings = []
    for index, topic_id in enumerate(topic_ids, start=1):
        topic_results.append(
            {
                "topic_id": topic_id,
                "requests": 1,
                "request_to_first_visible_ink_ms": 1000 + index * 10,
                "request_to_terminal_ms": 2000 + index * 10,
                "model_calls": 1,
                "accepted_steps": 4,
                "repairs": 0,
                "dropped_steps": 0,
                "renderer_dropped_ops": 0,
                "sanitized_fields": 0,
                "buffer_stalls": 0,
                "renderer_crash": False,
                "findings": [],
            }
        )
        ratings.append({"topic_id": topic_id, "score": index})
    return {
        "schema_version": "1.1",
        "experiment_id": "phase0-offline-baseline",
        "status": "completed",
        "abort_evidence": None,
        "configuration": config,
        "configuration_sha256": configuration_sha256(config),
        "retained_topic_ids": topic_ids,
        "ceilings": {"requests": 5, "model_calls": 5},
        "success_policy": {
            "primary_metric": "human_rubric_mean",
            "minimum_improvement": 0.5,
            "max_latency_regression_percent": 10,
            "max_call_regression": 0,
            "no_regression_invariants": [
                "zero_renderer_crashes",
                "committed_prefix_stable",
                "call_ceiling_respected",
            ],
            "promote_when": "Human score improves without a hard regression.",
            "park_when": "Human score is flat after the bounded comparison.",
            "remove_when": "A trust or interruption invariant regresses.",
            "review_by_milestone": "drawing-phase-1-gate",
        },
        "observations": {
            "requests": 5,
            "model_calls": 5,
            "repairs": 0,
            "dropped_steps": 0,
            "renderer_dropped_ops": 0,
            "sanitized_fields": 0,
            "buffer_stalls": 0,
            "renderer_crashes": 0,
            "topic_results": topic_results,
        },
        "human_rubric": {
            "rubric_version": "drawing-v1",
            "score_min": 0,
            "score_max": 5,
            "ratings": ratings,
        },
        "decision": {
            "outcome": "promote",
            "rationale": "The predeclared gate passed without a reliability regression.",
        },
    }


def test_completed_experiment_record_is_strict_and_self_consistent() -> None:
    record = completed_record()

    assert verify_experiment_record(record) == record


@pytest.mark.parametrize(
    ("field", "changed"),
    [
        ("lesson_generation", "resolved-stepwise"),
        ("continuation_prompt_sha256", "0" * 64),
        ("lesson_schema_sha256", "1" * 64),
        ("lesson_plan_schema_sha256", "2" * 64),
        ("resolved_scene_schema_sha256", "3" * 64),
        ("resolver_policy_revision", "resolver-density-constructions-v3"),
        ("realtime_model", "gpt-realtime-2.1-mini"),
        ("realtime_voice", "marin"),
        ("realtime_base_instructions_sha256", "4" * 64),
        ("realtime_tool_contract_sha256", "5" * 64),
        ("browser_engine", "firefox"),
        ("browser_version", "127.0.0.0"),
        ("annotation_prompt_sha256", "6" * 64),
        ("annotation_schema_sha256", "7" * 64),
    ],
)
def test_configuration_hash_covers_prompt_schema_resolver_and_runtime_identity(
    field: str,
    changed: str,
) -> None:
    record = completed_record()
    record["configuration"][field] = changed

    with pytest.raises(ExperimentEvidenceError, match="configuration hash"):
        verify_experiment_record(record)

    mixed = completed_record()
    mixed["configuration"]["board_prompt_sha256"] = ["a" * 64, "c" * 64]
    with pytest.raises(ExperimentEvidenceError, match="not valid"):
        verify_experiment_record(mixed)


def test_observed_counts_and_topic_sets_cannot_overclaim_the_run() -> None:
    record = completed_record()
    record["ceilings"]["model_calls"] = 4
    record["observations"]["repairs"] = 1
    record["human_rubric"]["ratings"].reverse()

    with pytest.raises(ExperimentEvidenceError) as captured:
        verify_experiment_record(record)

    assert "exceed the predeclared ceiling" in str(captured.value)
    assert "repairs total does not match" in str(captured.value)
    assert "human ratings do not match retained topic order" in str(captured.value)


def test_renderer_dropped_ops_cannot_be_reported_as_browser_dropped_steps() -> None:
    record = completed_record()
    first_result = record["observations"]["topic_results"][0]
    first_result["renderer_dropped_ops"] = 1

    with pytest.raises(
        ExperimentEvidenceError,
        match="renderer_dropped_ops total does not match topic results",
    ):
        verify_experiment_record(record)

    record["observations"]["renderer_dropped_ops"] = 1
    assert record["observations"]["dropped_steps"] == 0
    assert verify_experiment_record(record) == record


def test_planned_record_cannot_smuggle_post_run_evidence() -> None:
    record = completed_record()
    record["status"] = "planned"

    with pytest.raises(ExperimentEvidenceError, match="planned record already contains"):
        verify_experiment_record(record)


def test_planned_record_may_pin_preexisting_human_ratings_but_no_observations() -> None:
    record = completed_record()
    record["status"] = "planned"
    for field in (
        "requests",
        "model_calls",
        "repairs",
        "dropped_steps",
        "renderer_dropped_ops",
        "sanitized_fields",
        "buffer_stalls",
        "renderer_crashes",
    ):
        record["observations"][field] = 0
    record["observations"]["topic_results"] = []
    record["decision"] = {
        "outcome": "pending",
        "rationale": "Await the predeclared bounded experiment.",
    }

    assert (
        verify_experiment_record(record)["human_rubric"]["ratings"]
        == record["human_rubric"]["ratings"]
    )


def test_aborted_record_retains_only_completed_prefix_and_explicit_terminal_attempt() -> None:
    record = completed_record()
    completed_prefix = record["observations"]["topic_results"][:2]
    rating_prefix = record["human_rubric"]["ratings"][:1]
    record["status"] = "aborted"
    record["abort_evidence"] = {
        "category": "transport_unavailable",
        "attempted_topic_id": "projectile",
        "requests": 1,
        "model_calls": 1,
        "repairs": 0,
    }
    record["observations"]["topic_results"] = completed_prefix
    for field in (
        "requests",
        "model_calls",
        "repairs",
        "dropped_steps",
        "renderer_dropped_ops",
        "sanitized_fields",
        "buffer_stalls",
        "renderer_crashes",
    ):
        topic_total = sum(
            result["renderer_crash" if field == "renderer_crashes" else field]
            for result in completed_prefix
        )
        terminal_total = record["abort_evidence"].get(field, 0)
        record["observations"][field] = topic_total + terminal_total
    record["human_rubric"]["ratings"] = rating_prefix
    record["decision"] = {
        "outcome": "pending",
        "rationale": ABORTED_DECISION_RATIONALE,
    }

    assert verify_experiment_record(record) == record

    wrong_topic = deepcopy(record)
    wrong_topic["abort_evidence"]["attempted_topic_id"] = "waves"
    with pytest.raises(ExperimentEvidenceError, match="next retained topic"):
        verify_experiment_record(wrong_topic)

    unrepresented_call = deepcopy(record)
    unrepresented_call["observations"]["model_calls"] += 1
    with pytest.raises(ExperimentEvidenceError, match="model_calls total"):
        verify_experiment_record(unrepresented_call)


def test_aborted_record_may_count_failed_first_dispatch_without_topic_result() -> None:
    record = completed_record()
    record["status"] = "aborted"
    record["abort_evidence"] = {
        "category": "http_rejection",
        "attempted_topic_id": "derivative",
        "requests": 1,
        "model_calls": 1,
        "repairs": 0,
    }
    record["observations"].update(
        {
            "requests": 1,
            "model_calls": 1,
            "repairs": 0,
            "dropped_steps": 0,
            "renderer_dropped_ops": 0,
            "sanitized_fields": 0,
            "buffer_stalls": 0,
            "renderer_crashes": 0,
            "topic_results": [],
        }
    )
    record["human_rubric"]["ratings"] = []
    record["decision"] = {
        "outcome": "pending",
        "rationale": ABORTED_DECISION_RATIONALE,
    }

    assert verify_experiment_record(record) == record

    missing_topic = deepcopy(record)
    missing_topic["abort_evidence"]["attempted_topic_id"] = None
    with pytest.raises(ExperimentEvidenceError, match="require an attempted topic"):
        verify_experiment_record(missing_topic)


def test_live_experiments_require_complete_realtime_browser_and_annotation_identity() -> None:
    record = completed_record()
    record["configuration"].update(
        {
            "qa_direct_draw": "on",
            "realtime_model": "gpt-realtime-2.1-mini",
            "realtime_voice": "marin",
            "realtime_base_instructions_sha256": "8" * 64,
            "realtime_tool_contract_sha256": "9" * 64,
            "browser_engine": "chromium",
            "browser_version": "126.0.0.0",
            "annotation_schema_sha256": "a" * 64,
        }
    )
    record["configuration_sha256"] = configuration_sha256(record["configuration"])
    assert verify_experiment_record(record) == record

    incomplete_realtime = deepcopy(record)
    incomplete_realtime["configuration"]["realtime_tool_contract_sha256"] = None
    incomplete_realtime["configuration_sha256"] = configuration_sha256(
        incomplete_realtime["configuration"]
    )
    with pytest.raises(ExperimentEvidenceError, match="Realtime identity"):
        verify_experiment_record(incomplete_realtime)

    missing_browser = deepcopy(record)
    missing_browser["configuration"]["browser_version"] = None
    missing_browser["configuration_sha256"] = configuration_sha256(missing_browser["configuration"])
    with pytest.raises(ExperimentEvidenceError, match="browser engine and version"):
        verify_experiment_record(missing_browser)

    annotation = completed_record()
    annotation["configuration"]["annotation_whitespace"] = "bounded"
    annotation["configuration_sha256"] = configuration_sha256(annotation["configuration"])
    with pytest.raises(ExperimentEvidenceError, match="prompt and schema identity"):
        verify_experiment_record(annotation)


@pytest.mark.parametrize(
    ("configuration_update", "primary_metric", "expected_issue"),
    [
        ({"sync_mode": "paced"}, "human_rubric_mean", "Realtime identity"),
        (
            {"attention_choreography": "on"},
            "human_rubric_mean",
            "Realtime identity",
        ),
        (
            {"remote_audio_activity": "on"},
            "human_rubric_mean",
            "Realtime identity",
        ),
        ({"board_renderer": "tldraw"}, "human_rubric_mean", "browser-dependent"),
        ({}, "first_visible_ink_ms", "browser-dependent"),
    ],
)
def test_live_flag_or_metric_cannot_claim_not_applicable_identity(
    configuration_update: dict[str, str],
    primary_metric: str,
    expected_issue: str,
) -> None:
    record = completed_record()
    record["configuration"].update(configuration_update)
    if expected_issue == "browser-dependent":
        record["configuration"]["browser_engine"] = None
        record["configuration"]["browser_version"] = None
    record["success_policy"]["primary_metric"] = primary_metric
    record["configuration_sha256"] = configuration_sha256(record["configuration"])

    with pytest.raises(ExperimentEvidenceError, match=expected_issue):
        verify_experiment_record(record)


def test_aborted_rationale_cannot_smuggle_upstream_or_exception_text() -> None:
    record = completed_record()
    record["status"] = "aborted"
    record["abort_evidence"] = {
        "category": "harness_failure",
        "attempted_topic_id": None,
        "requests": 0,
        "model_calls": 0,
        "repairs": 0,
    }
    record["decision"] = {
        "outcome": "pending",
        "rationale": "raw upstream exception text",
    }

    with pytest.raises(ExperimentEvidenceError, match="closed redacted value"):
        verify_experiment_record(record)


def test_record_has_no_escape_hatch_for_raw_payloads_or_nonfinite_values() -> None:
    record = completed_record()
    record["raw_model_output"] = "not an evidence field"
    with pytest.raises(ExperimentEvidenceError, match="Additional properties"):
        verify_experiment_record(record)

    nonfinite = completed_record()
    nonfinite["observations"]["topic_results"][0]["request_to_terminal_ms"] = float("nan")
    with pytest.raises(ExperimentEvidenceError, match="finite JSON"):
        verify_experiment_record(nonfinite)


def test_vision_proxy_calibration_uses_fixed_spearman_threshold_with_ties() -> None:
    samples = [
        {"topic_id": "a1", "human_score": 1, "proxy_score": 2},
        {"topic_id": "b1", "human_score": 2, "proxy_score": 4},
        {"topic_id": "c1", "human_score": 2, "proxy_score": 4},
        {"topic_id": "d1", "human_score": 4, "proxy_score": 8},
        {"topic_id": "e1", "human_score": 5, "proxy_score": 9},
    ]

    calibration = calibrate_vision_proxy(samples)

    assert calibration["metric"] == "spearman_rho"
    assert calibration["minimum_correlation"] == 0.7
    assert calibration["observed_correlation"] == 1.0
    assert calibration["qualifies_as_proxy"] is True


def test_vision_proxy_calibration_rejects_undefined_or_post_hoc_inputs() -> None:
    constant_human = [
        {"topic_id": f"topic-{index}", "human_score": 1, "proxy_score": index}
        for index in range(1, 6)
    ]
    with pytest.raises(ExperimentEvidenceError, match="at least three distinct"):
        calibrate_vision_proxy(constant_human)

    constant_proxy = [
        {"topic_id": f"topic-{index}", "human_score": index, "proxy_score": 1}
        for index in range(1, 6)
    ]
    with pytest.raises(ExperimentEvidenceError, match="undefined"):
        calibrate_vision_proxy(constant_proxy)

    too_small = constant_human[:4]
    with pytest.raises(ExperimentEvidenceError, match="5 to 20"):
        calibrate_vision_proxy(too_small)

    binary_human = [
        {
            "topic_id": f"topic-{index}",
            "human_score": index % 2,
            "proxy_score": index,
        }
        for index in range(1, 6)
    ]
    with pytest.raises(ExperimentEvidenceError, match="at least three distinct"):
        calibrate_vision_proxy(binary_human)


def test_budget_guard_counts_before_dispatch_and_refuses_overspend() -> None:
    budget = ExperimentBudgetGuard(request_ceiling=1, model_call_ceiling=2)

    budget.claim_request()
    budget.claim_model_call()
    budget.claim_model_call()

    assert (budget.requests, budget.model_calls) == (1, 2)
    with pytest.raises(ExperimentBudgetExceeded, match="request ceiling"):
        budget.claim_request()
    with pytest.raises(ExperimentBudgetExceeded, match="model-call ceiling"):
        budget.claim_model_call()
    assert (budget.requests, budget.model_calls) == (1, 2)
    with pytest.raises(ValueError, match="budget state"):
        ExperimentBudgetGuard(request_ceiling=1, model_call_ceiling=1, requests=2)


def test_embedded_calibration_is_recomputed_against_retained_human_scores() -> None:
    record = completed_record()
    samples = [
        {
            "topic_id": rating["topic_id"],
            "human_score": rating["score"],
            "proxy_score": rating["score"],
        }
        for rating in record["human_rubric"]["ratings"]
    ]
    record["vision_proxy_calibration"] = calibrate_vision_proxy(samples)
    assert (
        verify_experiment_record(record)["vision_proxy_calibration"]["qualifies_as_proxy"] is True
    )

    stale = deepcopy(record)
    stale["vision_proxy_calibration"]["observed_correlation"] = 0.5
    with pytest.raises(ExperimentEvidenceError, match="correlation is stale"):
        verify_experiment_record(stale)

    changed_human = deepcopy(record)
    changed_human["vision_proxy_calibration"]["samples"][0]["human_score"] = 0
    with pytest.raises(ExperimentEvidenceError, match="changed the retained human score"):
        verify_experiment_record(changed_human)


def test_file_loader_rejects_duplicate_keys_and_cli_reports_only_closed_metadata(
    tmp_path: Path, capsys: pytest.CaptureFixture[str]
) -> None:
    record_path = tmp_path / "record.json"
    record_path.write_text(json.dumps(completed_record()), encoding="utf-8")

    assert load_experiment_record(record_path)["experiment_id"] == "phase0-offline-baseline"
    assert main(["--record", str(record_path)]) == 0
    output = json.loads(capsys.readouterr().out)
    assert output == {
        "schema": "chalk.drawing-experiment-verification.v1",
        "pass": True,
        "experiment_id": "phase0-offline-baseline",
        "status": "completed",
        "decision": "promote",
    }

    duplicate_path = tmp_path / "duplicate.json"
    duplicate_path.write_text('{"schema_version":"1.0","schema_version":"1.0"}')
    with pytest.raises(ExperimentEvidenceError, match="strict JSON"):
        load_experiment_record(duplicate_path)


def test_feature_flag_registry_matches_defaults_and_lifecycle_document() -> None:
    registry = json.loads(
        (PROJECT_ROOT / "shared/fixtures/feature-flag-registry.json").read_text(encoding="utf-8")
    )
    env_defaults = {
        line.split("=", 1)[0]: line.split("=", 1)[1]
        for line in (PROJECT_ROOT / ".env.example").read_text(encoding="utf-8").splitlines()
        if line and not line.startswith("#") and "=" in line
    }
    flags = registry["flags"]
    names = [flag["name"] for flag in flags]
    assert registry["schema"] == "chalk.feature-flag-registry.v1"
    assert len(names) == len(set(names))
    assert {flag["name"]: env_defaults[flag["name"]] for flag in flags} == {
        flag["name"]: flag["default"] for flag in flags
    }
    assert {
        flag["name"] for flag in flags if flag["classification"].startswith("experimental")
    } == {
        "VITE_BOARD_RENDERER",
        "SYNC_MODE",
        "VITE_PARTIAL_INK",
        "VITE_QA_DIRECT_DRAW",
        "VITE_LESSON_GENERATION",
        "VITE_ATTENTION_CHOREOGRAPHY",
        "VITE_REMOTE_AUDIO_ACTIVITY",
        "ANNOTATION_WHITESPACE",
    }
    chalk_mode = next(flag for flag in flags if flag["name"] == "VITE_CHALK_MODE")
    assert chalk_mode == {
        "name": "VITE_CHALK_MODE",
        "classification": "operational",
        "default": "demo",
        "experimental_value": None,
        "review_by": None,
    }
    assert registry["protocol_surfaces"] == [
        {
            "name": "lesson.ink_delta",
            "activation_flag": "VITE_PARTIAL_INK",
            "default": "no-producer",
        }
    ]
    lifecycle = (PROJECT_ROOT / "docs/experiment-flag-lifecycle.md").read_text(encoding="utf-8")
    for flag in flags:
        assert flag["name"] in lifecycle
        if flag["review_by"] is not None:
            assert flag["review_by"] in lifecycle
    assert "lesson.ink_delta" in lifecycle
