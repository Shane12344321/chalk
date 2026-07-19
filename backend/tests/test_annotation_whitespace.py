"""Generic density-aware side selection for transient annotations."""

from app.annotation_whitespace import annotation_open_sides


def element(element_id: str, bounds: list[float]) -> dict[str, object]:
    return {"id": element_id, "kind": "text", "bounds": bounds}


def test_open_sides_avoid_dense_neighbors_and_board_edge_clamping() -> None:
    hints = annotation_open_sides(
        [
            element("target", [0.05, 0.05, 0.12, 0.10]),
            element("rightblock", [0.17, 0.02, 0.25, 0.20]),
            element("belowblock", [0.03, 0.16, 0.25, 0.20]),
        ]
    )

    # Right and below are occupied; top/left also suffer edge clamping, but the
    # deterministic scorer still returns the least-overlapping two choices.
    assert hints["target"] == ["above", "left"]


def test_open_sides_are_stable_and_return_only_existing_ids() -> None:
    elements = [
        element("center", [0.44, 0.44, 0.12, 0.12]),
        element("top", [0.43, 0.20, 0.14, 0.10]),
    ]
    first = annotation_open_sides(elements)
    second = annotation_open_sides(elements)

    assert first == second
    assert list(first) == ["center", "top"]
    assert all(len(sides) == 2 and len(set(sides)) == 2 for sides in first.values())
    assert all(
        side in {"above", "below", "left", "right"} for sides in first.values() for side in sides
    )
