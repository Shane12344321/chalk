"""Strict offline contracts for drawing-intelligence experiment evidence.

This module validates already-produced, redacted evidence. It has no HTTP client,
credential access, screenshot loader, or model-call path.
"""

from __future__ import annotations

import argparse
import hashlib
import json
import math
import re
from collections.abc import Mapping, Sequence
from dataclasses import dataclass
from functools import lru_cache
from pathlib import Path
from typing import Any

from jsonschema import Draft7Validator

PROJECT_ROOT = Path(__file__).resolve().parents[2]
EXPERIMENT_SCHEMA_PATH = PROJECT_ROOT / "shared/schema/drawing-experiment-record.schema.json"
MAX_EXPERIMENT_RECORD_BYTES = 64 * 1024
VISION_PROXY_METRIC = "spearman_rho"
VISION_PROXY_MINIMUM_CORRELATION = 0.7
VISION_PROXY_MIN_SAMPLES = 5
VISION_PROXY_MAX_SAMPLES = 20
TOPIC_ID_PATTERN = re.compile(r"^[a-z][a-z0-9-]{1,47}$")
ABORTED_DECISION_RATIONALE = "Run aborted; see closed abort evidence."


class ExperimentEvidenceError(ValueError):
    """A bounded list of reasons an experiment record is not trustworthy evidence."""

    def __init__(self, issues: Sequence[str]) -> None:
        self.issues = list(issues[:40])
        super().__init__("; ".join(self.issues))


class ExperimentBudgetExceeded(RuntimeError):
    """Raised before a request or model call would exceed its declared ceiling."""


@dataclass(slots=True)
class ExperimentBudgetGuard:
    """Count experiment spend before dispatch, including failed dispatches."""

    request_ceiling: int
    model_call_ceiling: int
    requests: int = 0
    model_calls: int = 0

    def __post_init__(self) -> None:
        if (
            isinstance(self.request_ceiling, bool)
            or not isinstance(self.request_ceiling, int)
            or not 0 <= self.request_ceiling <= 40
            or isinstance(self.model_call_ceiling, bool)
            or not isinstance(self.model_call_ceiling, int)
            or not 0 <= self.model_call_ceiling <= 100
            or isinstance(self.requests, bool)
            or not isinstance(self.requests, int)
            or not 0 <= self.requests <= self.request_ceiling
            or isinstance(self.model_calls, bool)
            or not isinstance(self.model_calls, int)
            or not 0 <= self.model_calls <= self.model_call_ceiling
        ):
            raise ValueError("experiment budget state is outside the shared contract")

    def claim_request(self) -> None:
        """Reserve one outward request immediately before its dispatch."""

        if self.requests >= self.request_ceiling:
            raise ExperimentBudgetExceeded("experiment request ceiling exhausted")
        self.requests += 1

    def claim_model_call(self) -> None:
        """Reserve one model call immediately before its dispatch."""

        if self.model_calls >= self.model_call_ceiling:
            raise ExperimentBudgetExceeded("experiment model-call ceiling exhausted")
        self.model_calls += 1


@lru_cache(maxsize=1)
def experiment_validator() -> Draft7Validator:
    """Load and check the shared experiment schema once."""

    schema = json.loads(EXPERIMENT_SCHEMA_PATH.read_text(encoding="utf-8"))
    validator = Draft7Validator(schema)
    validator.check_schema(schema)
    return validator


def configuration_sha256(configuration: Mapping[str, Any]) -> str:
    """Return the stable identity for the complete experiment configuration."""

    try:
        encoded = json.dumps(
            configuration,
            ensure_ascii=False,
            allow_nan=False,
            separators=(",", ":"),
            sort_keys=True,
        ).encode("utf-8")
    except (TypeError, ValueError) as error:
        raise ExperimentEvidenceError(["configuration is not canonical JSON"]) from error
    return hashlib.sha256(encoded).hexdigest()


def calibrate_vision_proxy(samples: Sequence[Mapping[str, Any]]) -> dict[str, Any]:
    """Compute the one predeclared offline vision-proxy rank check.

    The metric, threshold, and sample bounds are code-level constants so a caller
    cannot choose them after inspecting the scores. This function never acquires
    images or calls a model; it only compares already-retained numeric ratings.
    """

    normalized = _normalize_calibration_samples(samples)
    human_scores = [sample["human_score"] for sample in normalized]
    if len(set(human_scores)) < 3:
        raise ExperimentEvidenceError(
            [
                "vision calibration needs ordinal human ratings with at least three "
                "distinct score levels"
            ]
        )
    human_ranks = _midranks(human_scores)
    proxy_ranks = _midranks([sample["proxy_score"] for sample in normalized])
    correlation = _pearson(human_ranks, proxy_ranks)
    observed = round(correlation, 12)
    return {
        "metric": VISION_PROXY_METRIC,
        "minimum_correlation": VISION_PROXY_MINIMUM_CORRELATION,
        "samples": normalized,
        "observed_correlation": observed,
        "qualifies_as_proxy": observed >= VISION_PROXY_MINIMUM_CORRELATION,
    }


def verify_experiment_record(value: Any) -> dict[str, Any]:
    """Validate one homogeneous, content-bounded experiment record."""

    try:
        encoded = json.dumps(
            value,
            ensure_ascii=False,
            allow_nan=False,
            separators=(",", ":"),
            sort_keys=True,
        ).encode("utf-8")
    except (TypeError, ValueError) as error:
        raise ExperimentEvidenceError(["record is not finite JSON"]) from error
    if len(encoded) > MAX_EXPERIMENT_RECORD_BYTES:
        raise ExperimentEvidenceError(["record exceeds the 64 KiB byte budget"])

    issues = sorted(
        experiment_validator().iter_errors(value),
        key=lambda issue: tuple(str(part) for part in issue.absolute_path),
    )
    if issues:
        messages = [f"{_json_path(issue.absolute_path)}: {issue.message}" for issue in issues[:40]]
        raise ExperimentEvidenceError(messages)

    record = json.loads(encoded)
    semantic_issues: list[str] = []
    configuration = record["configuration"]
    expected_configuration_hash = configuration_sha256(configuration)
    _expect(
        record["configuration_sha256"] == expected_configuration_hash,
        semantic_issues,
        "configuration hash does not match the complete configuration",
    )
    _verify_configuration_identity_requirements(
        configuration,
        record["success_policy"]["primary_metric"],
        semantic_issues,
    )

    retained_ids = record["retained_topic_ids"]
    retained_set = set(retained_ids)
    results = record["observations"]["topic_results"]
    result_ids = [result["topic_id"] for result in results]
    rating_rows = record["human_rubric"]["ratings"]
    rating_ids = [rating["topic_id"] for rating in rating_rows]
    _expect_unique(result_ids, semantic_issues, "topic result IDs")
    _expect_unique(rating_ids, semantic_issues, "human rating IDs")
    _expect(
        set(result_ids).issubset(retained_set),
        semantic_issues,
        "topic results contain an unretained topic",
    )
    _expect(
        set(rating_ids).issubset(retained_set),
        semantic_issues,
        "human ratings contain an unretained topic",
    )
    _expect(
        not rating_rows
        or (
            configuration["browser_engine"] is not None
            and configuration["browser_version"] is not None
        ),
        semantic_issues,
        "retained human ratings require browser engine and version identity",
    )

    score_min = record["human_rubric"]["score_min"]
    score_max = record["human_rubric"]["score_max"]
    _expect(score_min < score_max, semantic_issues, "human rubric score range is empty")
    for rating in rating_rows:
        _expect(
            score_min <= rating["score"] <= score_max,
            semantic_issues,
            f"{rating['topic_id']}: human score is outside the declared rubric range",
        )

    observations = record["observations"]
    ceilings = record["ceilings"]
    _expect(
        observations["requests"] <= ceilings["requests"],
        semantic_issues,
        "observed requests exceed the predeclared ceiling",
    )
    _expect(
        observations["model_calls"] <= ceilings["model_calls"],
        semantic_issues,
        "observed model calls exceed the predeclared ceiling",
    )
    abort_evidence = record["abort_evidence"]
    totals = {
        "requests": sum(result["requests"] for result in results),
        "model_calls": sum(result["model_calls"] for result in results),
        "repairs": sum(result["repairs"] for result in results),
        "dropped_steps": sum(result["dropped_steps"] for result in results),
        "renderer_dropped_ops": sum(result["renderer_dropped_ops"] for result in results),
        "sanitized_fields": sum(result["sanitized_fields"] for result in results),
        "buffer_stalls": sum(result["buffer_stalls"] for result in results),
        "renderer_crashes": sum(result["renderer_crash"] for result in results),
    }
    if abort_evidence is not None:
        for field in ("requests", "model_calls", "repairs"):
            totals[field] += abort_evidence[field]
    for field, expected in totals.items():
        _expect(
            observations[field] == expected,
            semantic_issues,
            f"{field} total does not match topic results",
        )
    for result in results:
        first_ink = result["request_to_first_visible_ink_ms"]
        terminal = result["request_to_terminal_ms"]
        if first_ink is not None and terminal is not None:
            _expect(
                first_ink <= terminal,
                semantic_issues,
                f"{result['topic_id']}: first ink occurs after the terminal time",
            )
        finding_keys = [(finding["code"], finding["evidence"]) for finding in result["findings"]]
        _expect_unique(finding_keys, semantic_issues, f"{result['topic_id']}: finding keys")

    if record["status"] == "planned":
        _expect(
            abort_evidence is None,
            semantic_issues,
            "planned record contains abort evidence",
        )
        _expect(not results, semantic_issues, "planned record already contains topic results")
        _expect(
            not rating_rows or rating_ids == retained_ids,
            semantic_issues,
            "planned retained human ratings do not match retained topic order",
        )
        _expect(
            all(observations[field] == 0 for field in totals),
            semantic_issues,
            "planned record has nonzero observations",
        )
        _expect(
            record["decision"]["outcome"] == "pending",
            semantic_issues,
            "planned record has a terminal decision",
        )
        _expect(
            "vision_proxy_calibration" not in record,
            semantic_issues,
            "planned record contains post-run calibration",
        )
    elif record["status"] == "completed":
        _expect(
            abort_evidence is None,
            semantic_issues,
            "completed record contains abort evidence",
        )
        _expect(
            result_ids == retained_ids,
            semantic_issues,
            "completed topic results do not match retained topic order",
        )
        _expect(
            rating_ids == retained_ids,
            semantic_issues,
            "completed human ratings do not match retained topic order",
        )
        _expect(
            record["decision"]["outcome"] != "pending",
            semantic_issues,
            "completed record has no promote, park, or remove decision",
        )
    else:
        _expect(
            abort_evidence is not None,
            semantic_issues,
            "aborted record has no closed abort evidence",
        )
        _expect(
            result_ids == retained_ids[: len(result_ids)],
            semantic_issues,
            "aborted topic results are not the retained attempted prefix",
        )
        _expect(
            rating_ids == result_ids[: len(rating_ids)],
            semantic_issues,
            "aborted human ratings are not a completed-result prefix",
        )
        _expect(
            record["decision"]["outcome"] == "pending",
            semantic_issues,
            "aborted record has a promote, park, or remove decision",
        )
        _expect(
            record["decision"]["rationale"] == ABORTED_DECISION_RATIONALE,
            semantic_issues,
            "aborted record decision rationale is not the closed redacted value",
        )
        _expect(
            "vision_proxy_calibration" not in record,
            semantic_issues,
            "aborted record contains post-run calibration",
        )
        if abort_evidence is not None:
            attempted_topic_id = abort_evidence["attempted_topic_id"]
            attempt_counts = (
                abort_evidence["requests"],
                abort_evidence["model_calls"],
                abort_evidence["repairs"],
            )
            if attempted_topic_id is None:
                _expect(
                    attempt_counts == (0, 0, 0),
                    semantic_issues,
                    "abort attempt counts require an attempted topic ID",
                )
            else:
                expected_topic = (
                    retained_ids[len(result_ids)] if len(result_ids) < len(retained_ids) else None
                )
                _expect(
                    attempted_topic_id == expected_topic,
                    semantic_issues,
                    "abort attempt is not the next retained topic",
                )
            _expect(
                abort_evidence["repairs"] <= abort_evidence["model_calls"],
                semantic_issues,
                "abort repair count exceeds its model-call count",
            )
            _expect(
                abort_evidence["model_calls"] == 0 or abort_evidence["requests"] > 0,
                semantic_issues,
                "abort model-call count requires a counted request",
            )

    calibration = record.get("vision_proxy_calibration")
    if calibration is not None:
        _verify_vision_calibration(calibration, retained_ids, rating_rows, semantic_issues)

    if semantic_issues:
        raise ExperimentEvidenceError(semantic_issues)
    return record


def _verify_configuration_identity_requirements(
    configuration: dict[str, Any],
    primary_metric: str,
    issues: list[str],
) -> None:
    realtime_fields = (
        "realtime_model",
        "realtime_voice",
        "realtime_base_instructions_sha256",
        "realtime_tool_contract_sha256",
    )
    realtime_values = tuple(configuration[field] for field in realtime_fields)
    _expect(
        all(value is None for value in realtime_values)
        or all(value is not None for value in realtime_values),
        issues,
        "Realtime identity must be either complete or not applicable",
    )
    browser_values = (
        configuration["browser_engine"],
        configuration["browser_version"],
    )
    _expect(
        (browser_values[0] is None) == (browser_values[1] is None),
        issues,
        "browser engine and version identity must be supplied together",
    )

    realtime_required = any(
        (
            configuration["sync_mode"] == "paced",
            configuration["qa_direct_draw"] == "on",
            configuration["attention_choreography"] == "on",
            configuration["remote_audio_activity"] == "on",
        )
    )
    browser_required = any(
        (
            configuration["board_renderer"] == "tldraw",
            configuration["sync_mode"] == "paced",
            configuration["qa_direct_draw"] == "on",
            configuration["attention_choreography"] == "on",
            configuration["remote_audio_activity"] == "on",
            primary_metric in {"first_visible_ink_ms", "buffer_stall_rate"},
        )
    )
    _expect(
        not realtime_required or all(value is not None for value in realtime_values),
        issues,
        "enabled live voice/tool path requires complete Realtime identity",
    )
    _expect(
        not browser_required or all(value is not None for value in browser_values),
        issues,
        "browser-dependent experiment requires engine and version identity",
    )
    _expect(
        configuration["qa_direct_draw"] != "on"
        or configuration["annotation_schema_sha256"] is not None,
        issues,
        "direct Q&A drawing requires annotation schema identity",
    )
    _expect(
        configuration["annotation_whitespace"] != "bounded"
        or (
            configuration["annotation_prompt_sha256"] is not None
            and configuration["annotation_schema_sha256"] is not None
        ),
        issues,
        "annotation whitespace experiment requires prompt and schema identity",
    )


def load_experiment_record(path: Path) -> dict[str, Any]:
    """Read one JSON record without accepting duplicate keys or oversized input."""

    if path.suffix.lower() != ".json" or not path.is_file():
        raise ExperimentEvidenceError(["experiment record must be an existing JSON file"])
    if path.stat().st_size > MAX_EXPERIMENT_RECORD_BYTES:
        raise ExperimentEvidenceError(["record exceeds the 64 KiB byte budget"])
    try:
        value = json.loads(
            path.read_text(encoding="utf-8"), object_pairs_hook=_reject_duplicate_keys
        )
    except (UnicodeDecodeError, json.JSONDecodeError, ValueError) as error:
        raise ExperimentEvidenceError(["experiment record is not strict JSON"]) from error
    return verify_experiment_record(value)


def _verify_vision_calibration(
    calibration: dict[str, Any],
    retained_ids: list[str],
    ratings: list[dict[str, Any]],
    issues: list[str],
) -> None:
    samples = calibration["samples"]
    sample_ids = [sample["topic_id"] for sample in samples]
    _expect_unique(sample_ids, issues, "vision calibration topic IDs")
    _expect(
        sample_ids == retained_ids,
        issues,
        "vision calibration does not use the retained topic order exactly once",
    )
    ratings_by_topic = {rating["topic_id"]: rating["score"] for rating in ratings}
    for sample in samples:
        _expect(
            ratings_by_topic.get(sample["topic_id"]) == sample["human_score"],
            issues,
            f"{sample['topic_id']}: calibration changed the retained human score",
        )
    try:
        expected = calibrate_vision_proxy(samples)
    except ExperimentEvidenceError as error:
        issues.extend(error.issues)
        return
    _expect(
        math.isclose(
            calibration["observed_correlation"],
            expected["observed_correlation"],
            rel_tol=0,
            abs_tol=1e-12,
        ),
        issues,
        "vision calibration correlation is stale or incorrect",
    )
    _expect(
        calibration["qualifies_as_proxy"] == expected["qualifies_as_proxy"],
        issues,
        "vision calibration qualification disagrees with the predeclared threshold",
    )


def _normalize_calibration_samples(
    samples: Sequence[Mapping[str, Any]],
) -> list[dict[str, Any]]:
    if not VISION_PROXY_MIN_SAMPLES <= len(samples) <= VISION_PROXY_MAX_SAMPLES:
        raise ExperimentEvidenceError(["vision calibration requires 5 to 20 retained samples"])
    normalized: list[dict[str, Any]] = []
    seen: set[str] = set()
    for index, sample in enumerate(samples):
        topic_id = sample.get("topic_id")
        human_score = sample.get("human_score")
        proxy_score = sample.get("proxy_score")
        if (
            not isinstance(topic_id, str)
            or TOPIC_ID_PATTERN.fullmatch(topic_id) is None
            or topic_id in seen
        ):
            raise ExperimentEvidenceError(
                [f"vision calibration sample {index + 1} has an invalid or duplicate topic ID"]
            )
        seen.add(topic_id)
        normalized.append(
            {
                "topic_id": topic_id,
                "human_score": _bounded_score(human_score, "human"),
                "proxy_score": _bounded_score(proxy_score, "proxy"),
            }
        )
    return normalized


def _bounded_score(value: Any, label: str) -> float | int:
    if isinstance(value, bool) or not isinstance(value, (int, float)):
        raise ExperimentEvidenceError([f"vision calibration {label} score is not numeric"])
    number = float(value)
    if not math.isfinite(number) or not 0 <= number <= 10:
        raise ExperimentEvidenceError([f"vision calibration {label} score is outside 0..10"])
    return value


def _midranks(values: Sequence[float | int]) -> list[float]:
    indexed = sorted(enumerate(values), key=lambda item: (item[1], item[0]))
    ranks = [0.0] * len(values)
    start = 0
    while start < len(indexed):
        end = start + 1
        while end < len(indexed) and indexed[end][1] == indexed[start][1]:
            end += 1
        rank = ((start + 1) + end) / 2
        for position in range(start, end):
            ranks[indexed[position][0]] = rank
        start = end
    return ranks


def _pearson(left: Sequence[float], right: Sequence[float]) -> float:
    left_mean = sum(left) / len(left)
    right_mean = sum(right) / len(right)
    left_delta = [value - left_mean for value in left]
    right_delta = [value - right_mean for value in right]
    denominator = math.sqrt(
        sum(value * value for value in left_delta) * sum(value * value for value in right_delta)
    )
    if denominator == 0:
        raise ExperimentEvidenceError(
            ["vision calibration rank agreement is undefined for a constant score vector"]
        )
    numerator = sum(a * b for a, b in zip(left_delta, right_delta, strict=True))
    return max(-1.0, min(1.0, numerator / denominator))


def _reject_duplicate_keys(items: list[tuple[str, Any]]) -> dict[str, Any]:
    result: dict[str, Any] = {}
    for key, value in items:
        if key in result:
            raise ValueError("duplicate JSON key")
        result[key] = value
    return result


def _expect(condition: bool, issues: list[str], message: str) -> None:
    if not condition:
        issues.append(message)


def _expect_unique(values: Sequence[Any], issues: list[str], label: str) -> None:
    if len(values) != len(set(values)):
        issues.append(f"{label} must be unique")


def _json_path(path: Sequence[Any]) -> str:
    return "/" + "/".join(str(part) for part in path) if path else "/"


def main(argv: Sequence[str] | None = None) -> int:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--record", type=Path, required=True)
    args = parser.parse_args(argv)
    try:
        record = load_experiment_record(args.record)
    except ExperimentEvidenceError as error:
        print(json.dumps({"pass": False, "issues": error.issues}, indent=2))
        return 1
    print(
        json.dumps(
            {
                "schema": "chalk.drawing-experiment-verification.v1",
                "pass": True,
                "experiment_id": record["experiment_id"],
                "status": record["status"],
                "decision": record["decision"]["outcome"],
            },
            indent=2,
            sort_keys=True,
        )
    )
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
