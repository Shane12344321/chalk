"""Backend half of the shared schema-1.4 construction contract."""

from __future__ import annotations

import copy
import json
from pathlib import Path
from typing import Any

import pytest

from app.lesson_validation import LessonValidationState, StepValidationError, validate_step
from app.prompt_contract import MAX_LESSON_WIRE_CONTRACT_CHARS, lesson_wire_contract

PROJECT_ROOT = Path(__file__).resolve().parents[2]
FIXTURE_PATH = PROJECT_ROOT / "shared/fixtures/construction-parity.json"


def _fixture() -> dict[str, Any]:
    value = json.loads(FIXTURE_PATH.read_text(encoding="utf-8"))
    assert value["version"] == 1
    return value


@pytest.mark.parametrize("case", _fixture()["cases"], ids=lambda case: case["id"])
def test_shared_construction_reference_contract(case: dict[str, Any]) -> None:
    fixture = _fixture()
    setup_name = case["setup"]
    setup = [] if setup_name is None else fixture["setups"][setup_name]
    state = LessonValidationState()
    for step in setup:
        validate_step(step, state)

    before = copy.deepcopy(state)
    if case["expected"]["backend"] == "accept":
        accepted = validate_step(case["candidate"], state)
        construction_ops = [op for op in accepted["ops"] if "construct" in op]
        assert len(construction_ops) == 1
        assert state.accepted_ids[construction_ops[0]["id"]] in {"point", "line"}
    else:
        with pytest.raises(StepValidationError):
            validate_step(case["candidate"], state)
        # A rejected constructor cannot leak an ID or any other partial state.
        assert state == before


def test_fixture_covers_closed_relations_and_unrelated_families() -> None:
    cases = _fixture()["cases"]
    relation_cases: dict[str, list[dict[str, Any]]] = {}
    for case in cases:
        construction = next(op["construct"] for op in case["candidate"]["ops"] if "construct" in op)
        relation_cases.setdefault(construction["kind"], []).append(case)

    assert set(relation_cases) == {
        "along",
        "midpoint_of",
        "intersection_of",
        "perpendicular_through",
        "tangent_at",
        "offset_from",
    }
    for cases_for_relation in relation_cases.values():
        assert any(case["expected"]["browser"] in {"point", "line"} for case in cases_for_relation)
        assert any(case["expected"]["browser"].startswith("drop_") for case in cases_for_relation)

    successful_families = {
        case["family"] for case in cases if case["expected"]["browser"] in {"point", "line"}
    }
    assert len(successful_families) >= 3


def test_generated_prompt_contract_covers_every_construction_shape() -> None:
    contract = lesson_wire_contract()
    assert len(contract) <= MAX_LESSON_WIRE_CONTRACT_CHARS
    for token in (
        "geometryPointReference",
        "pointConstruction",
        "perpendicularConstruction",
        "tangentConstruction",
        'kind:"along"',
        'kind:"midpoint_of"',
        'kind:"intersection_of"',
        'kind:"offset_from"',
        'kind:"perpendicular_through"',
        'kind:"tangent_at"',
    ):
        assert token in contract
