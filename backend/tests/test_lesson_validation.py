"""Adversarial tests for the server-side lesson trust boundary."""

import copy
import json
from pathlib import Path

import pytest

from app.lesson_validation import (
    LessonValidationState,
    StepValidationError,
    validate_curve_expression,
    validate_envelope,
    validate_step,
)

REQUEST_ID = "783c6081-75a4-4ed2-8be7-4e0f32680a2b"


def text_step(**overrides: object) -> dict[str, object]:
    value: dict[str, object] = {
        "id": "s1",
        "script": "A short valid explanation.",
        "ops": [{"op": "text", "id": "label", "region": "A1", "content": "Slope"}],
        "checkpoint": None,
    }
    value.update(overrides)
    return value


def test_accepts_same_step_backward_reference_and_commits_state_atomically() -> None:
    state = LessonValidationState()
    step = {
        "id": "s1",
        "script": "Plot the parabola on these axes.",
        "ops": [
            {
                "op": "axes",
                "id": "axes1",
                "region": "right",
                "x": {"min": -2, "max": 2, "label": "x"},
                "y": {"min": 0, "max": 4, "label": "y"},
            },
            {
                "op": "curve",
                "id": "curve1",
                "axes_id": "axes1",
                "expr": "x^2",
                "domain": [-2, 2],
            },
        ],
        "checkpoint": None,
    }

    accepted = validate_step(step, state)

    assert accepted == step
    assert accepted is not step
    assert state.accepted_ids == {"axes1": "axes", "curve1": "curve"}
    assert state.accepted_step_ids == {"s1"}
    assert state.accepted_steps == 1


def test_rejects_forward_reference_without_poisoning_accepted_state() -> None:
    state = LessonValidationState()
    step = {
        "id": "s1",
        "script": "This invalid curve appears before its axes.",
        "ops": [
            {"op": "curve", "id": "curve1", "axes_id": "axes1", "expr": "x"},
            {
                "op": "axes",
                "id": "axes1",
                "region": "right",
                "x": {"min": 0, "max": 1, "label": "x"},
                "y": {"min": 0, "max": 1, "label": "y"},
            },
        ],
        "checkpoint": None,
    }

    with pytest.raises(StepValidationError, match="not already accepted"):
        validate_step(step, state)

    assert state.accepted_ids == {}
    assert state.accepted_steps == 0


def test_rejected_step_ids_cannot_satisfy_later_references() -> None:
    state = LessonValidationState()
    invalid_axes = text_step(
        ops=[
            {
                "op": "axes",
                "id": "axes1",
                "region": "right",
                "x": {"min": 1, "max": 1, "label": "x"},
                "y": {"min": 0, "max": 1, "label": "y"},
            }
        ]
    )
    later_curve = text_step(
        id="s2",
        ops=[{"op": "curve", "id": "curve1", "axes_id": "axes1", "expr": "x"}],
    )

    with pytest.raises(StepValidationError):
        validate_step(invalid_axes, state)
    with pytest.raises(StepValidationError, match="not already accepted"):
        validate_step(later_curve, state)

    assert state.accepted_ids == {}


@pytest.mark.parametrize(
    "expression",
    [
        "__import__('os')",
        "x.__class__",
        "x[0]",
        "v*x",
        "sin(x, 2)",
        "log(x, base=2)",
        "x // 2",
        "1e999",
        "1000001",
    ],
)
def test_rejects_expressions_outside_the_chalk_subset(expression: str) -> None:
    with pytest.raises(ValueError):
        validate_curve_expression(expression)


@pytest.mark.parametrize(
    "expression",
    ["sin(2*x*pi/180)", "x^2", "sqrt(abs(x))", "exp(-x/2)+e"],
)
def test_accepts_restricted_curve_expressions(expression: str) -> None:
    validate_curve_expression(expression)


def test_envelope_schema_reuses_the_shared_step_contract() -> None:
    step = text_step()
    validate_envelope({"type": "lesson.step", "request_id": REQUEST_ID, "step": step})

    invalid = copy.deepcopy(step)
    invalid["ops"][0]["unexpected"] = True  # type: ignore[index]
    with pytest.raises(ValueError, match="invalid CHALK lesson stream envelope"):
        validate_envelope({"type": "lesson.step", "request_id": REQUEST_ID, "step": invalid})


def test_error_envelope_accepts_only_bounded_terminal_codes_and_reasons() -> None:
    validate_envelope(
        {
            "type": "lesson.error",
            "request_id": REQUEST_ID,
            "code": "upstream_incomplete",
            "upstream_reason": "max_output_tokens",
            "failure_origin": "generation",
            "repair_attempts": 0,
            "fallback_available": True,
        }
    )

    with pytest.raises(ValueError, match="invalid CHALK lesson stream envelope"):
        validate_envelope(
            {
                "type": "lesson.error",
                "request_id": REQUEST_ID,
                "code": "response.incomplete",
                "upstream_reason": "private-unbounded-reason",
                "fallback_available": True,
            }
        )

    with pytest.raises(ValueError, match="invalid CHALK lesson stream envelope"):
        validate_envelope(
            {
                "type": "lesson.error",
                "request_id": REQUEST_ID,
                "code": "invalid_stream",
                "failure_origin": "repair",
                "repair_attempts": 5,
                "fallback_available": True,
            }
        )

    with pytest.raises(ValueError, match="invalid CHALK lesson stream envelope"):
        validate_envelope(
            {
                "type": "lesson.error",
                "request_id": REQUEST_ID,
                "code": "generation_timeout",
                "upstream_reason": "server_error",
                "fallback_available": True,
            }
        )


def test_word_budget_and_duplicate_ids_are_enforced_beyond_json_schema() -> None:
    state = LessonValidationState()
    too_many_words = " ".join(f"word{index}" for index in range(31))
    with pytest.raises(StepValidationError, match="30 words"):
        validate_step(text_step(script=too_many_words), state)

    validate_step(text_step(), state)
    with pytest.raises(StepValidationError, match="duplicate"):
        validate_step(text_step(id="s2"), state)


def test_all_ten_golden_lessons_pass_the_backend_step_boundary() -> None:
    golden_dir = Path(__file__).resolve().parents[2] / "tests/golden"
    fixtures = sorted(golden_dir.glob("*.lesson.json"))
    assert len(fixtures) == 10
    for fixture in fixtures:
        program = json.loads(fixture.read_text(encoding="utf-8"))
        state = LessonValidationState()
        for step in program["steps"]:
            validate_step(step, state)
        assert state.accepted_steps == len(program["steps"]), fixture.name
