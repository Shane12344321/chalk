"""Shared validation for stateless resolved-board continuation context."""

from __future__ import annotations

import json
from functools import lru_cache
from pathlib import Path
from typing import Any

from jsonschema import Draft7Validator

PROJECT_ROOT = Path(__file__).resolve().parents[2]
SCENE_SCHEMA_PATH = PROJECT_ROOT / "shared/schema/resolved-board-scene.schema.json"
PLAN_SCHEMA_PATH = PROJECT_ROOT / "shared/schema/lesson-plan.schema.json"
MAX_RESOLVED_SCENE_BYTES = 12 * 1024
MAX_LESSON_PLAN_BYTES = 1_024


@lru_cache(maxsize=1)
def scene_validator() -> Draft7Validator:
    return _validator(SCENE_SCHEMA_PATH)


@lru_cache(maxsize=1)
def plan_validator() -> Draft7Validator:
    return _validator(PLAN_SCHEMA_PATH)


def validate_resolved_scene(value: Any, *, request_id: str, prefix_version: int) -> dict[str, Any]:
    normalized = _validate(value, scene_validator(), MAX_RESOLVED_SCENE_BYTES, "resolved scene")
    if normalized["request_id"] != request_id or normalized["prefix_version"] != prefix_version:
        raise ValueError("resolved scene identity does not match accepted prefix")
    ids = [element["id"] for element in normalized["elements"]]
    if len(ids) != len(set(ids)):
        raise ValueError("resolved scene element IDs must be unique")
    for element in normalized["elements"]:
        x, y, width, height = element["bounds"]
        if width <= 0 or height <= 0 or x + width > 1.001 or y + height > 1.001:
            raise ValueError("resolved scene bounds must be positive and inside the board")
    known_ids = set(ids)
    if any(
        element_id not in known_ids
        for finding in normalized["findings"]
        for element_id in finding["element_ids"]
    ):
        raise ValueError("resolved scene finding references an unknown element")
    recovery_findings = normalized.get("recovery_findings", [])
    finding_ids = [finding["finding_id"] for finding in recovery_findings]
    if len(finding_ids) != len(set(finding_ids)):
        raise ValueError("resolved scene recovery finding IDs must be unique")
    if any(
        nearby_id not in known_ids
        for finding in recovery_findings
        for nearby_id in finding["neighborhood"]["nearby_element_ids"]
    ):
        raise ValueError("resolved recovery neighborhood references an unknown element")
    if any(
        affected_id in known_ids
        for finding in recovery_findings
        for affected_id in finding["affected_element_ids"]
    ):
        raise ValueError("failed recovery element cannot also be visible")
    return normalized


def validate_lesson_plan(value: Any) -> dict[str, Any]:
    normalized = _validate(value, plan_validator(), MAX_LESSON_PLAN_BYTES, "lesson plan")
    checkpoint = normalized["checkpoint_step"]
    if checkpoint is not None and checkpoint > len(normalized["progression"]):
        raise ValueError("lesson plan checkpoint exceeds progression")
    return normalized


def _validator(path: Path) -> Draft7Validator:
    schema = json.loads(path.read_text(encoding="utf-8"))
    validator = Draft7Validator(schema)
    validator.check_schema(schema)
    return validator


def _validate(
    value: Any, validator: Draft7Validator, byte_limit: int, label: str
) -> dict[str, Any]:
    encoded = json.dumps(value, ensure_ascii=False, separators=(",", ":")).encode()
    if len(encoded) > byte_limit:
        raise ValueError(f"{label} exceeds byte budget")
    issues = sorted(validator.iter_errors(value), key=lambda issue: list(issue.absolute_path))
    if issues:
        raise ValueError(f"{label} failed shared schema")
    return json.loads(encoded)
