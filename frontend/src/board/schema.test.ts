import { describe, expect, it } from "vitest";
import projectileLesson from "../../../demo/cached_lessons/projectile-range.lesson.json";
import { decodeLesson } from "./decode";
import { isLessonProgram, lessonSchemaErrors } from "./schema";

describe("lesson wire contract and defensive decoder", () => {
  it("accepts the checked-in projectile fixture with no repairs", () => {
    expect(isLessonProgram(projectileLesson)).toBe(true);
    expect(lessonSchemaErrors()).toEqual([]);
    const decoded = decodeLesson(projectileLesson);
    expect(decoded.warnings).toEqual([]);
    expect(decoded.lesson?.steps).toHaveLength(4);
    expect(decoded.lesson?.steps.flatMap((step) => step.ops)).toHaveLength(7);
  });

  it("rejects unknown wire operations but salvages valid sibling ops", () => {
    const source = {
      schema_version: "1.0",
      title: "Defensive",
      steps: [
        {
          id: "s1",
          script: "Keep the valid text.",
          ops: [
            { op: "text", id: "safe", region: "A1", content: "safe" },
            { op: "html", id: "unsafe", region: "A1", content: "<script />" },
          ],
          checkpoint: null,
        },
      ],
    };
    expect(isLessonProgram(source)).toBe(false);
    const decoded = decodeLesson(source);
    expect(decoded.lesson?.steps[0].ops.map((op) => op.id)).toEqual(["safe"]);
    expect(decoded.warnings.map((item) => item.code)).toContain("invalid_op");
  });

  it("drops invalid axes, their dependent curve, and unsafe equations independently", () => {
    const source = {
      schema_version: "1.0",
      title: "Broken references",
      steps: [
        {
          id: "s1",
          script: "These failures should remain isolated.",
          ops: [
            {
              op: "axes",
              id: "badaxes",
              region: "right",
              x: { min: 10, max: 0, label: "x" },
              y: { min: 0, max: 1, label: "y" },
            },
            { op: "curve", id: "dangling", axes_id: "badaxes", expr: "sin(x)" },
            { op: "equation", id: "badlatex", region: "A1", latex: "\\href{https://bad}{x}" },
            { op: "text", id: "survivor", region: "A2", content: "still renders" },
          ],
          checkpoint: null,
        },
      ],
    };
    const decoded = decodeLesson(source);
    expect(decoded.lesson?.steps[0].ops.map((op) => op.id)).toEqual(["survivor"]);
    expect(decoded.warnings.map((item) => item.code)).toEqual([
      "invalid_axes",
      "unknown_reference",
      "invalid_equation",
    ]);
  });

  it("enforces the thirty-word narration budget", () => {
    const source = structuredClone(projectileLesson) as Record<string, unknown> & {
      steps: Array<Record<string, unknown>>;
    };
    source.steps[0].script = Array.from({ length: 31 }, () => "word").join(" ");
    const decoded = decodeLesson(source);
    expect(decoded.lesson?.steps.map((step) => step.id)).not.toContain("s1");
    expect(decoded.warnings[0].code).toBe("invalid_step");
  });

  it("enforces the shared 240-character narration budget before Realtime", () => {
    const source = structuredClone(projectileLesson) as Record<string, unknown> & {
      steps: Array<Record<string, unknown>>;
    };
    source.steps[0].script = `${"x".repeat(120)} ${"y".repeat(120)}`;
    const decoded = decodeLesson(source);
    expect(decoded.lesson?.steps.map((step) => step.id)).not.toContain("s1");
    expect(decoded.warnings[0].code).toBe("invalid_step");
  });
});
