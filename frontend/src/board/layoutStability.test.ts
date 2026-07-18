import { describe, expect, it } from "vitest";
import derivativeLesson from "../../../demo/cached_lessons/derivative-slope.lesson.json";
import projectileLesson from "../../../demo/cached_lessons/projectile-range.lesson.json";
import unitCircleLesson from "../../../demo/cached_lessons/unit-circle-sine.lesson.json";
import { decodeLesson } from "./decode";
import { layoutSteps } from "./layout";

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
