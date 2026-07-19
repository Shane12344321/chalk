"""Deterministic side selection from authoritative normalized renderer bounds."""

from __future__ import annotations

from collections.abc import Mapping, Sequence
from typing import Any, Literal

Side = Literal["above", "below", "left", "right"]
SIDES: tuple[Side, ...] = ("right", "below", "left", "above")
BOARD_WIDTH = 1600.0
BOARD_HEIGHT = 900.0
BOX_WIDTH = 290.0 / BOARD_WIDTH
BOX_HEIGHT = 88.0 / BOARD_HEIGHT
HORIZONTAL_GAP = 18.0 / BOARD_WIDTH
VERTICAL_GAP = 18.0 / BOARD_HEIGHT
HORIZONTAL_MARGIN = 24.0 / BOARD_WIDTH
VERTICAL_MARGIN = 24.0 / BOARD_HEIGHT


def annotation_open_sides(
    visible_elements: Sequence[Mapping[str, Any]],
) -> dict[str, list[Side]]:
    """Return the two least-crowded renderer-compatible sides for each target.

    The output is a compact hint/allowlist over existing target IDs. It never
    invents coordinates or alters renderer state. The conservative candidate
    size matches the largest current text/equation overlay box.
    """

    bounds = {str(element["id"]): _rect(element["bounds"]) for element in visible_elements}
    result: dict[str, list[Side]] = {}
    for element in visible_elements:
        target_id = str(element["id"])
        target = bounds[target_id]
        ranked = sorted(
            SIDES,
            key=lambda side: _side_score(side, target, bounds),
        )
        result[target_id] = ranked[:2]
    return result


def _side_score(
    side: Side,
    target: tuple[float, float, float, float],
    all_bounds: Mapping[str, tuple[float, float, float, float]],
) -> tuple[int, float, float, int]:
    preferred = _preferred_box(target, side)
    candidate = _clamp_box(preferred)
    overlap = sum(_intersection_area(candidate, other) for other in all_bounds.values())
    candidate_area = BOX_WIDTH * BOX_HEIGHT
    overlap_ratio = overlap / candidate_area
    clamp_distance = abs(preferred[0] - candidate[0]) + abs(preferred[1] - candidate[1])
    return (
        int(overlap_ratio > 0.08),
        round(overlap_ratio, 8),
        round(clamp_distance, 8),
        SIDES.index(side),
    )


def _preferred_box(
    target: tuple[float, float, float, float], side: Side
) -> tuple[float, float, float, float]:
    x, y, width, height = target
    if side == "above":
        return (
            x + (width - BOX_WIDTH) / 2,
            y - BOX_HEIGHT - VERTICAL_GAP,
            BOX_WIDTH,
            BOX_HEIGHT,
        )
    if side == "below":
        return (
            x + (width - BOX_WIDTH) / 2,
            y + height + VERTICAL_GAP,
            BOX_WIDTH,
            BOX_HEIGHT,
        )
    if side == "left":
        return (
            x - BOX_WIDTH - HORIZONTAL_GAP,
            y + (height - BOX_HEIGHT) / 2,
            BOX_WIDTH,
            BOX_HEIGHT,
        )
    return (
        x + width + HORIZONTAL_GAP,
        y + (height - BOX_HEIGHT) / 2,
        BOX_WIDTH,
        BOX_HEIGHT,
    )


def _clamp_box(
    box: tuple[float, float, float, float],
) -> tuple[float, float, float, float]:
    x, y, width, height = box
    return (
        min(1 - HORIZONTAL_MARGIN - width, max(HORIZONTAL_MARGIN, x)),
        min(1 - VERTICAL_MARGIN - height, max(VERTICAL_MARGIN, y)),
        width,
        height,
    )


def _intersection_area(
    first: tuple[float, float, float, float],
    second: tuple[float, float, float, float],
) -> float:
    left = max(first[0], second[0])
    top = max(first[1], second[1])
    right = min(first[0] + first[2], second[0] + second[2])
    bottom = min(first[1] + first[3], second[1] + second[3])
    return max(0.0, right - left) * max(0.0, bottom - top)


def _rect(value: Any) -> tuple[float, float, float, float]:
    # Pydantic has already enforced four finite normalized floats.
    x, y, width, height = value
    return float(x), float(y), float(width), float(height)
