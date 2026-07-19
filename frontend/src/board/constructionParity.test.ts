import { describe, expect, it } from "vitest";
import fixture from "../../../shared/fixtures/construction-parity.json";
import { decodeLesson } from "./decode";
import { layoutSteps } from "./layout";

interface FixtureCase {
  id: string;
  family: string;
  setup: string | null;
  candidate: Record<string, unknown>;
  expected: {
    backend: "accept" | "reject";
    browser: "point" | "line" | "drop_decode" | "drop_resolve";
    code?: string;
    normalized_point?: [number, number];
    normalized_line?: [[number, number], [number, number]];
  };
}

const cases = fixture.cases as FixtureCase[];
const setups = fixture.setups as Record<string, Array<Record<string, unknown>>>;

describe("shared geometric-construction parity fixtures", () => {
  for (const testCase of cases) {
    it(testCase.id, () => {
      const setup = testCase.setup ? setups[testCase.setup] : [];
      const decoded = decodeLesson({
        schema_version: "1.4",
        title: testCase.family,
        steps: [...setup, testCase.candidate],
      });
      const constructionId = constructionIdOf(testCase.candidate);

      if (testCase.expected.browser === "drop_decode") {
        expect(
          decoded.lesson?.steps.flatMap((step) => step.ops).some(({ id }) => id === constructionId),
        ).toBe(false);
        expect(decoded.warnings.some(({ code }) => code === testCase.expected.code)).toBe(true);
        return;
      }

      expect(decoded.lesson, JSON.stringify(decoded.warnings)).toBeDefined();
      const warnings: Array<{ id: string; code: string }> = [];
      const items = layoutSteps(decoded.lesson!.steps, {
        onWarning: ({ id, code }) => warnings.push({ id, code }),
      });
      const item = items.find(({ op }) => op.id === constructionId);

      if (testCase.expected.browser === "drop_resolve") {
        expect(item).toBeUndefined();
        expect(warnings).toContainEqual({ id: constructionId, code: testCase.expected.code });
        // Failure is isolated: every unrelated accepted op remains laid out.
        const acceptedOtherIds = decoded.lesson!.steps
          .flatMap((step) => step.ops)
          .map(({ id }) => id)
          .filter((id) => id !== constructionId);
        expect(acceptedOtherIds.every((id) => items.some(({ op }) => op.id === id))).toBe(true);
        return;
      }

      expect(warnings).toEqual([]);
      expect(item?.construction?.kind).toBe(testCase.expected.browser);
      const construction = item!.construction!;
      if (construction.kind === "point") {
        expectPointClose(
          normalizePoint(construction.point, construction.canvas),
          testCase.expected.normalized_point!,
        );
      } else {
        expectPointClose(
          normalizePoint(construction.from, construction.canvas),
          testCase.expected.normalized_line![0],
        );
        expectPointClose(
          normalizePoint(construction.to, construction.canvas),
          testCase.expected.normalized_line![1],
        );
      }
    });
  }

  it("retains successful use across at least three unrelated topic families", () => {
    const successfulFamilies = new Set(
      cases
        .filter(({ expected }) => expected.browser === "point" || expected.browser === "line")
        .map(({ family }) => family),
    );
    expect(successfulFamilies.size).toBeGreaterThanOrEqual(3);
  });

  it("pins every initial relation with success and rejection evidence", () => {
    for (const kind of [
      "along",
      "midpoint_of",
      "intersection_of",
      "perpendicular_through",
      "tangent_at",
      "offset_from",
    ]) {
      const matching = cases.filter((testCase) => constructionKindOf(testCase.candidate) === kind);
      expect(matching.some(({ expected }) => expected.browser === "point" || expected.browser === "line")).toBe(true);
      expect(matching.some(({ expected }) => expected.browser.startsWith("drop_"))).toBe(true);
    }
  });
});

function constructionIdOf(step: Record<string, unknown>): string {
  const ops = step.ops as Array<Record<string, unknown>>;
  const op = ops.find((candidate) => "construct" in candidate);
  if (!op || typeof op.id !== "string") throw new Error("fixture has no construction op");
  return op.id;
}

function constructionKindOf(step: Record<string, unknown>): string {
  const ops = step.ops as Array<Record<string, unknown>>;
  const op = ops.find((candidate) => "construct" in candidate);
  const construct = op?.construct as Record<string, unknown> | undefined;
  if (!construct || typeof construct.kind !== "string") throw new Error("fixture has no construction kind");
  return construct.kind;
}

function normalizePoint(
  point: readonly [number, number],
  canvas: { x: number; y: number; width: number; height: number },
): [number, number] {
  return [
    (point[0] - canvas.x) / canvas.width,
    (point[1] - canvas.y) / canvas.height,
  ];
}

function expectPointClose(received: readonly number[], expected: readonly number[]): void {
  expect(received).toHaveLength(expected.length);
  received.forEach((value, index) => expect(value).toBeCloseTo(expected[index], 5));
}
