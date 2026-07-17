"""Shared-schema and semantic validation for untrusted lesson steps."""

from __future__ import annotations

import ast
import json
import math
from dataclasses import dataclass, field
from functools import lru_cache
from pathlib import Path
from typing import Any

from jsonschema import Draft7Validator
from referencing import Registry, Resource

PROJECT_ROOT = Path(__file__).resolve().parents[2]
LESSON_SCHEMA_PATH = PROJECT_ROOT / "shared/schema/lesson.schema.json"
STREAM_SCHEMA_PATH = PROJECT_ROOT / "shared/schema/lesson-stream.schema.json"

ALLOWED_NAMES = {"x", "pi", "e"}
ALLOWED_FUNCTIONS = {"sin", "cos", "tan", "exp", "log", "sqrt", "abs"}
ALLOWED_BINARY_OPERATORS = (ast.Add, ast.Sub, ast.Mult, ast.Div, ast.Pow)
ALLOWED_UNARY_OPERATORS = (ast.UAdd, ast.USub)
MAX_EXPRESSION_NODES = 64
MAX_NUMERIC_LITERAL = 1_000_000


class StepValidationError(ValueError):
    """A bounded, repair-safe description of an invalid model step."""

    def __init__(self, issues: list[str]) -> None:
        self.issues = issues[:12]
        super().__init__("; ".join(self.issues))


@dataclass
class LessonValidationState:
    """References that are safe to expose to the next generated step."""

    accepted_ids: dict[str, str] = field(default_factory=dict)
    accepted_step_ids: set[str] = field(default_factory=set)
    accepted_steps: int = 0

    def inventory(self) -> list[str]:
        return sorted(self.accepted_ids)


@lru_cache(maxsize=1)
def lesson_schema() -> dict[str, Any]:
    return _load_schema(LESSON_SCHEMA_PATH)


@lru_cache(maxsize=1)
def stream_schema() -> dict[str, Any]:
    return _load_schema(STREAM_SCHEMA_PATH)


@lru_cache(maxsize=1)
def step_validator() -> Draft7Validator:
    schema = lesson_schema()
    validator = Draft7Validator(
        {
            "$schema": schema["$schema"],
            "$id": "https://chalk.local/schema/lesson-step.validation.json",
            "$ref": "#/$defs/step",
            "$defs": schema["$defs"],
        }
    )
    validator.check_schema(validator.schema)
    return validator


@lru_cache(maxsize=1)
def envelope_validator() -> Draft7Validator:
    lesson = lesson_schema()
    stream = stream_schema()
    registry = Registry().with_resources(
        [
            (lesson["$id"], Resource.from_contents(lesson)),
            (stream["$id"], Resource.from_contents(stream)),
        ]
    )
    validator = Draft7Validator(stream, registry=registry)
    validator.check_schema(stream)
    return validator


def validate_step(value: Any, state: LessonValidationState) -> dict[str, Any]:
    """Validate one complete step without mutating accepted state on failure."""

    issues = _schema_issues(step_validator(), value)
    if issues:
        raise StepValidationError(issues)
    assert isinstance(value, dict)

    semantic_issues: list[str] = []
    if state.accepted_steps >= 8:
        semantic_issues.append("lesson step budget exceeded")

    step_id = value["id"]
    if step_id in state.accepted_step_ids:
        semantic_issues.append("duplicate step id")
    if len(value["script"].strip().split()) > 30:
        semantic_issues.append("script exceeds 30 words")

    visible_types = dict(state.accepted_ids)
    pending_types: dict[str, str] = {}
    for index, op in enumerate(value["ops"]):
        op_id = op["id"]
        op_type = op["op"]
        if op_id in visible_types or op_id in pending_types:
            semantic_issues.append(f"op {index} has a duplicate element id")
            continue

        anchor = op.get("anchor")
        if isinstance(anchor, dict):
            anchor_id = anchor.get("el")
            if anchor_id not in visible_types and anchor_id not in pending_types:
                semantic_issues.append(f"op {index} anchor is not already accepted")

        if op_type == "axes":
            if op["x"]["min"] >= op["x"]["max"] or op["y"]["min"] >= op["y"]["max"]:
                semantic_issues.append(f"op {index} axes bounds do not increase")
        elif op_type == "curve":
            axes_id = op["axes_id"]
            axes_type = pending_types.get(axes_id, visible_types.get(axes_id))
            if axes_type != "axes":
                semantic_issues.append(f"op {index} axes reference is not already accepted")
            domain = op.get("domain")
            if domain is not None and domain[0] >= domain[1]:
                semantic_issues.append(f"op {index} curve domain does not increase")
            try:
                validate_curve_expression(op["expr"])
            except ValueError as error:
                semantic_issues.append(f"op {index} expression: {error}")

        pending_types[op_id] = op_type

    if semantic_issues:
        raise StepValidationError(semantic_issues)

    # JSON round-tripping gives downstream code a detached, JSON-only value.
    normalized = json.loads(json.dumps(value, ensure_ascii=False))
    state.accepted_ids.update(pending_types)
    state.accepted_step_ids.add(step_id)
    state.accepted_steps += 1
    return normalized


def validate_envelope(value: Any) -> None:
    issues = _schema_issues(envelope_validator(), value)
    if issues:
        raise ValueError("invalid CHALK lesson stream envelope: " + "; ".join(issues))


def validate_curve_expression(expression: str) -> None:
    """Parse the CHALK expression subset without evaluating model output."""

    try:
        tree = ast.parse(expression.replace("^", "**"), mode="eval")
    except (SyntaxError, ValueError, TypeError):
        raise ValueError("syntax is outside the restricted grammar") from None

    nodes = list(ast.walk(tree))
    if len(nodes) > MAX_EXPRESSION_NODES:
        raise ValueError("expression is too complex")

    for node in nodes:
        if isinstance(node, (ast.Load, ast.Expression)):
            continue
        if isinstance(node, ast.BinOp):
            if not isinstance(node.op, ALLOWED_BINARY_OPERATORS):
                raise ValueError("operator is not allowed")
            continue
        if isinstance(node, ast.UnaryOp):
            if not isinstance(node.op, ALLOWED_UNARY_OPERATORS):
                raise ValueError("unary operator is not allowed")
            continue
        if isinstance(node, ALLOWED_BINARY_OPERATORS + ALLOWED_UNARY_OPERATORS):
            continue
        if isinstance(node, ast.Name):
            if node.id not in ALLOWED_NAMES and node.id not in ALLOWED_FUNCTIONS:
                raise ValueError("name is not allowed")
            continue
        if isinstance(node, ast.Call):
            if (
                not isinstance(node.func, ast.Name)
                or node.func.id not in ALLOWED_FUNCTIONS
                or len(node.args) != 1
                or node.keywords
            ):
                raise ValueError("function call is not allowed")
            continue
        if isinstance(node, ast.Constant):
            if (
                isinstance(node.value, bool)
                or not isinstance(node.value, (int, float))
                or not math.isfinite(float(node.value))
                or abs(float(node.value)) > MAX_NUMERIC_LITERAL
            ):
                raise ValueError("numeric literal is outside the budget")
            continue
        raise ValueError("syntax node is not allowed")


def _load_schema(path: Path) -> dict[str, Any]:
    with path.open(encoding="utf-8") as handle:
        value = json.load(handle)
    if not isinstance(value, dict):
        raise RuntimeError(f"Schema at {path.name} is not an object")
    Draft7Validator.check_schema(value)
    return value


def _schema_issues(validator: Draft7Validator, value: Any) -> list[str]:
    errors = sorted(validator.iter_errors(value), key=lambda error: list(error.absolute_path))
    issues: list[str] = []
    for error in errors[:12]:
        path = "/" + "/".join(str(part) for part in error.absolute_path)
        issues.append(f"{path or '/'} {error.message}")
    return issues
