import { render } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { Board } from "./Board";
import { decodeLesson } from "./decode";

const fixtures = import.meta.glob("../../../demo/cached_lessons/*.lesson.json", {
  eager: true,
  import: "default",
}) as Record<string, unknown>;

describe("recording caches", () => {
  it("keeps exactly the three accepted demo topics offline", () => {
    expect(Object.keys(fixtures).sort()).toEqual([
      "../../../demo/cached_lessons/derivative-slope.lesson.json",
      "../../../demo/cached_lessons/projectile-range.lesson.json",
      "../../../demo/cached_lessons/unit-circle-sine.lesson.json",
    ]);
  });

  for (const [path, source] of Object.entries(fixtures)) {
    it(`decodes and renders ${path.split("/").at(-1)} without a network path`, () => {
      const decoded = decodeLesson(source);
      expect(decoded.warnings).toEqual([]);
      const lesson = decoded.lesson!;
      const view = render(
        <Board
          lesson={lesson}
          currentStepIndex={lesson.steps.length - 1}
          currentStepProgress={1}
          phase="DONE"
        />,
      );
      expect(view.container.querySelector(".board-warning")).toBeNull();
      expect(view.container.querySelectorAll("[data-element-id]")).toHaveLength(
        lesson.steps.reduce((sum, step) => sum + step.ops.length, 0),
      );
      view.unmount();
    });
  }
});
