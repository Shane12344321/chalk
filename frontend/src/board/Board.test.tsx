import { render } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import projectileLesson from "../../../demo/cached_lessons/projectile-range.lesson.json";
import { Board } from "./Board";
import { decodeLesson } from "./decode";
import { fitBoardText } from "./textLayout";

const lesson = decodeLesson(projectileLesson).lesson!;

describe("Board", () => {
  it("wraps long handwritten labels inside their allocated box", () => {
    const fitted = fitBoardText("Restoring force points toward equilibrium", {
      x: 0,
      y: 0,
      width: 310,
      height: 64,
    });
    expect(fitted.lines.length).toBeGreaterThan(1);
    expect(fitted.lines.join(" ")).toBe("Restoring force points toward equilibrium");
    expect(fitted.lines.length * fitted.lineHeight).toBeLessThanOrEqual(64);
  });

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

  it("records the first actually visible geometry once per measurement", () => {
    const onFirstVisibleInk = vi.fn();
    const view = render(
      <Board
        lesson={lesson}
        currentStepIndex={0}
        currentStepProgress={0}
        phase="TEACHING"
        measurementId="request-one"
        onFirstVisibleInk={onFirstVisibleInk}
      />,
    );
    expect(onFirstVisibleInk).not.toHaveBeenCalled();

    view.rerender(
      <Board
        lesson={lesson}
        currentStepIndex={0}
        currentStepProgress={0.01}
        phase="TEACHING"
        measurementId="request-one"
        onFirstVisibleInk={onFirstVisibleInk}
      />,
    );
    expect(onFirstVisibleInk).toHaveBeenCalledOnce();
    expect(onFirstVisibleInk).toHaveBeenCalledWith("request-one", expect.any(Number));

    view.rerender(
      <Board
        lesson={lesson}
        currentStepIndex={0}
        currentStepProgress={0.2}
        phase="TEACHING"
        measurementId="request-one"
        onFirstVisibleInk={onFirstVisibleInk}
      />,
    );
    expect(onFirstVisibleInk).toHaveBeenCalledOnce();
  });
});
