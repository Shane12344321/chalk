import json
from pathlib import Path

import pytest

from app.resolved_scene import validate_lesson_plan, validate_resolved_scene

PROJECT_ROOT = Path(__file__).resolve().parents[2]

COMPOSITION_ARCHETYPES = (
    "single_large_figure",
    "derivation_plus_diagram",
    "worked_example_column",
    "comparison_pair",
    "graph_with_summary",
)


def lesson_plan() -> dict[str, object]:
    return {
        "kind": "lesson_plan",
        "visual_structure": "A bounded visual argument",
        "progression": ["introduce", "develop", "conclude"],
        "checkpoint_step": 2,
    }


def test_resolved_scene_shared_parity_fixture() -> None:
    fixture = json.loads(
        (PROJECT_ROOT / "shared/fixtures/resolved-scene-parity.json").read_text(encoding="utf-8")
    )
    for case in fixture["cases"]:
        value = case["value"]
        if case["valid"]:
            assert (
                validate_resolved_scene(
                    value,
                    request_id=value["request_id"],
                    prefix_version=value["prefix_version"],
                )
                == value
            )
        else:
            with pytest.raises(ValueError):
                validate_resolved_scene(
                    value,
                    request_id=value["request_id"],
                    prefix_version=value["prefix_version"],
                )


def test_lesson_plan_remains_backward_compatible_without_composition_archetype() -> None:
    value = lesson_plan()
    assert validate_lesson_plan(value) == value


@pytest.mark.parametrize("archetype", COMPOSITION_ARCHETYPES)
def test_lesson_plan_accepts_each_closed_composition_archetype(archetype: str) -> None:
    value = {**lesson_plan(), "composition_archetype": archetype}
    assert validate_lesson_plan(value) == value


@pytest.mark.parametrize(
    "composition",
    [
        "custom_grid",
        {"name": "comparison_pair", "bounds": [0, 0, 1, 1]},
        ["left", "right"],
    ],
)
def test_lesson_plan_rejects_open_ended_composition_geometry(composition: object) -> None:
    value = {**lesson_plan(), "composition_archetype": composition}
    with pytest.raises(ValueError, match="lesson plan failed shared schema"):
        validate_lesson_plan(value)


def test_lesson_plan_rejects_arbitrary_zone_fields() -> None:
    value = {
        **lesson_plan(),
        "composition_archetype": "comparison_pair",
        "composition_zones": [{"x": 0, "y": 0, "width": 0.5, "height": 1}],
    }
    with pytest.raises(ValueError, match="lesson plan failed shared schema"):
        validate_lesson_plan(value)


def test_recovery_findings_are_bounded_and_semantically_unique() -> None:
    request_id = "783c6081-75a4-4ed2-8be7-4e0f32680a2b"

    def finding(index: int) -> dict[str, object]:
        return {
            "finding_id": f"rf_{index:08x}",
            "code": "browser_invalid_op",
            "intent": "line",
            "status": "pending",
            "affected_element_ids": [f"bad{index}"],
            "affected_op_indexes": [0],
            "source_step_id": "s1",
            "neighborhood": {"nearby_element_ids": []},
        }

    scene = {
        "schema_version": "1.0",
        "request_id": request_id,
        "prefix_version": 1,
        "elements": [],
        "findings": [],
        "recovery_findings": [finding(index) for index in range(9)],
    }
    with pytest.raises(ValueError, match="resolved scene failed shared schema"):
        validate_resolved_scene(scene, request_id=request_id, prefix_version=1)

    scene["recovery_findings"] = [finding(0), finding(0)]
    with pytest.raises(ValueError, match="recovery finding IDs must be unique"):
        validate_resolved_scene(scene, request_id=request_id, prefix_version=1)
