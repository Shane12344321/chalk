import { describe, expect, it } from "vitest";
import derivativeLesson from "../../../demo/cached_lessons/derivative-slope.lesson.json";
import projectileLesson from "../../../demo/cached_lessons/projectile-range.lesson.json";
import unitCircleLesson from "../../../demo/cached_lessons/unit-circle-sine.lesson.json";
import { decodeLesson } from "./decode";
import { layoutHardFindingVector, layoutSteps } from "./layout";

const goldenFixtures = import.meta.glob("../../../tests/golden/*.lesson.json", {
  eager: true,
  import: "default",
}) as Record<string, unknown>;

const corpus: Array<[string, unknown]> = [
  ["cached/projectile", projectileLesson],
  ["cached/derivative", derivativeLesson],
  ["cached/unit-circle", unitCircleLesson],
  ...Object.entries(goldenFixtures).map(
    ([path, source]): [string, unknown] => [path.split("/").at(-1)!, source],
  ),
];

describe("layout is prefix-stable while steps stream in", () => {
  for (const [name, source] of corpus) {
    it(`never moves committed ink in ${name}`, () => {
      const lesson = decodeLesson(source).lesson!;
      const full = layoutSteps(lesson.steps).map(({ op, box }) => ({ id: op.id, box }));
      for (let prefix = 1; prefix < lesson.steps.length; prefix += 1) {
        const partial = layoutSteps(lesson.steps.slice(0, prefix)).map(({ op, box }) => ({
          id: op.id,
          box,
        }));
        expect(partial).toEqual(full.slice(0, partial.length));
      }
    });
  }

  for (const [name, source] of corpus) {
    it(`never worsens the preferred hard vector in ${name}`, () => {
      const lesson = decodeLesson(source).lesson!;
      const preferred = layoutSteps(lesson.steps, { candidatePlacement: "preferred-only" });
      const resolved = layoutSteps(lesson.steps);
      const preferredHard = layoutHardFindingVector(preferred, lesson.steps);
      const resolvedHard = layoutHardFindingVector(resolved, lesson.steps);
      resolvedHard.forEach((value, index) => {
        expect(value).toBeLessThanOrEqual(preferredHard[index]);
      });
    });
  }

  it("keeps all three byte-pinned cached layouts unchanged without a composition plan", () => {
    const fingerprints = [projectileLesson, derivativeLesson, unitCircleLesson].map((source) => {
      const lesson = decodeLesson(source).lesson!;
      return JSON.stringify(layoutSteps(lesson.steps).map(({ op, box, canvasBox }) => ({
        id: op.id,
        box,
        ...(canvasBox ? { canvasBox } : {}),
      })));
    });
    expect(fingerprints).toEqual([
      '[{"id":"title","box":{"x":68,"y":66,"width":310,"height":64}},{"id":"cannon","box":{"x":68,"y":342,"width":318,"height":190}},{"id":"rangeaxes","box":{"x":832,"y":66,"width":700,"height":430}},{"id":"rangecurve","box":{"x":832,"y":66,"width":700,"height":430}},{"id":"formula","box":{"x":450,"y":66,"width":318,"height":92}},{"id":"doubleangle","box":{"x":454,"y":165.36,"width":310,"height":64}},{"id":"answer","box":{"x":68,"y":618,"width":310,"height":64}}]',
      '[{"id":"title","box":{"x":68,"y":66,"width":310,"height":64}},{"id":"axes1","box":{"x":832,"y":66,"width":700,"height":430}},{"id":"curve1","box":{"x":832,"y":66,"width":700,"height":430}},{"id":"eq1","box":{"x":450,"y":342,"width":310,"height":64}}]',
      '[{"id":"title","box":{"x":68,"y":66,"width":310,"height":64}},{"id":"circle","box":{"x":68,"y":342,"width":318,"height":190}},{"id":"axes1","box":{"x":832,"y":66,"width":700,"height":430}},{"id":"curve1","box":{"x":832,"y":66,"width":700,"height":430}},{"id":"eq1","box":{"x":68,"y":618,"width":310,"height":64}}]',
    ]);
  });

  it("never moves committed ink when a later step crowds an occupied region", () => {
    const steps = [0, 1, 2, 3].map((index) => ({
      id: `s${index + 1}`,
      script: "Add another label to the same region.",
      ops: [
        {
          op: "text" as const,
          id: `label${index}`,
          region: "A1" as const,
          content: `Label ${index}`,
        },
      ],
      checkpoint: null,
    }));
    const lesson = decodeLesson({ schema_version: "1.0", title: "Crowded", steps }).lesson!;
    const full = layoutSteps(lesson.steps).map(({ box }) => box);
    for (let prefix = 1; prefix < lesson.steps.length; prefix += 1) {
      const partial = layoutSteps(lesson.steps.slice(0, prefix)).map(({ box }) => box);
      expect(partial).toEqual(full.slice(0, partial.length));
    }
    for (let index = 1; index < full.length; index += 1) {
      expect(full[index].y).toBeGreaterThanOrEqual(full[index - 1].y + full[index - 1].height);
    }
  });
});
