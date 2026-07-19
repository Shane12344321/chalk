"""Shared-schema and semantic validation for annotation overlays."""

from __future__ import annotations

import json
import re
from collections.abc import Mapping, Set
from functools import lru_cache
from pathlib import Path
from typing import Any

from jsonschema import Draft7Validator

PROJECT_ROOT = Path(__file__).resolve().parents[2]
ANNOTATION_SCHEMA_PATH = PROJECT_ROOT / "shared/schema/annotation.schema.json"
FORBIDDEN_LATEX_COMMAND = re.compile(
    r"\\(?:href|url|includegraphics|html[a-z]*|class|style|gdef|def|newcommand|renewcommand)\b",
    re.IGNORECASE,
)


class AnnotationValidationError(ValueError):
    def __init__(self, issues: list[str]) -> None:
        self.issues = issues[:12]
        super().__init__("; ".join(self.issues))


@lru_cache(maxsize=1)
def annotation_validator() -> Draft7Validator:
    with ANNOTATION_SCHEMA_PATH.open(encoding="utf-8") as handle:
        schema = json.load(handle)
    Draft7Validator.check_schema(schema)
    return Draft7Validator(schema)


def validate_annotation(
    value: Any,
    *,
    request_id: str,
    manifest_version: int,
    visible_element_ids: set[str],
    allowed_sides: Mapping[str, Set[str]] | None = None,
) -> dict[str, Any]:
    issues = _schema_issues(value)
    if issues:
        raise AnnotationValidationError(issues)
    assert isinstance(value, dict)

    semantic_issues: list[str] = []
    if value["request_id"] != request_id:
        semantic_issues.append("request_id does not match")
    if value["manifest_version"] != manifest_version:
        semantic_issues.append("manifest_version does not match")

    annotation_ids: set[str] = set()
    for index, op in enumerate(value["ops"]):
        if op["id"] in annotation_ids or op["id"] in visible_element_ids:
            semantic_issues.append(f"op {index} has a duplicate element id")
        annotation_ids.add(op["id"])
        if op["target_id"] not in visible_element_ids:
            semantic_issues.append(f"op {index} target is not visible")
        if (
            "side" in op
            and allowed_sides is not None
            and op["target_id"] in allowed_sides
            and op["side"] not in allowed_sides[op["target_id"]]
        ):
            semantic_issues.append(f"op {index} side is not in the renderer whitespace allowlist")
        if op["op"] == "equation" and FORBIDDEN_LATEX_COMMAND.search(op["latex"]):
            semantic_issues.append(f"op {index} equation contains a forbidden command")

    if semantic_issues:
        raise AnnotationValidationError(semantic_issues)
    return json.loads(json.dumps(value, ensure_ascii=False))


def _schema_issues(value: Any) -> list[str]:
    errors = sorted(
        annotation_validator().iter_errors(value),
        key=lambda error: list(error.absolute_path),
    )
    return [
        f"/{'/'.join(str(part) for part in error.absolute_path)} {error.message}"
        for error in errors[:12]
    ]
