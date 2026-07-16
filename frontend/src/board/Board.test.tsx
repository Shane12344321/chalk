import { render } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import projectileLesson from "../../../demo/cached_lessons/projectile-range.lesson.json";
import { Board } from "./Board";
import { decodeLesson } from "./decode";

const lesson = decodeLesson(projectileLesson).lesson!;

describe("Board", () => {
  it("retains a visibly partial sketch and stable path after rerender", () => {
    const view = render(
      <Board lesson={lesson} currentStepIndex={0} currentStepProgress={0.5} phase="FROZEN" />,
    );
    const sketch = view.container.querySelector('[data-element-id="cannon"]')!;
    expect(sketch.getAttribute("data-progress")).toBe("0.333");
    const path = sketch.querySelector("path")!;
    const originalD = path.getAttribute("d");
    const offsets = [...sketch.querySelectorAll("path")].map((candidate) =>
      Number(candidate.getAttribute("stroke-dashoffset")),
    );
    expect(offsets.some((offset) => offset === 0)).toBe(true);
    expect(offsets.some((offset) => offset > 0 && offset < 1)).toBe(true);
    expect(offsets.some((offset) => offset === 1)).toBe(true);

    view.rerender(
      <Board lesson={lesson} currentStepIndex={0} currentStepProgress={0.5} phase="QA" />,
    );
    expect(
      view.container.querySelector('[data-element-id="cannon"] path')?.getAttribute("d"),
    ).toBe(originalD);
  });
});
