import { describe, expect, it } from "vitest";
import fixture from "../../../shared/fixtures/resolved-scene-parity.json";
import { buildResolvedBoardScene, isResolvedBoardScene } from "./resolvedScene";
import type { PreparedBoard } from "./renderer";

describe("resolved board scene parity", () => {
  for (const testCase of fixture.cases) {
    it(testCase.name, () => {
      expect(isResolvedBoardScene(testCase.value)).toBe(testCase.valid);
    });
  }

  it("retains every accepted root before budgeting expanded diagram parts", () => {
    const geometries = ["figurea", "figureb"].map((id, geometryIndex) => ({
      id,
      kind: "diagram" as const,
      box: { x: 100 + geometryIndex * 700, y: 100, width: 600, height: 600 },
      paths: [],
      labels: [],
      manifestSummary: `${id} parent`,
      stepIndex: 0,
      opIndex: geometryIndex,
      manifestParts: Array.from({ length: 16 }, (_, partIndex) => ({
        id: `p${geometryIndex}${partIndex.toString(36)}`,
        kind: "diagram" as const,
        box: {
          x: 120 + geometryIndex * 700 + (partIndex % 4) * 100,
          y: 120 + Math.floor(partIndex / 4) * 100,
          width: 80,
          height: 80,
        },
        summary: `part ${partIndex}`,
        revealGroup: partIndex,
      })),
    }));
    const prepared = {
      lesson: {
        schemaVersion: "1.2",
        title: "Composite",
        steps: [],
      },
      build: { geometries, warnings: [] },
      layoutIssues: [{ code: "label_overlap", elementIds: ["figurea", "figureb"] }],
    } as PreparedBoard;

    const scene = buildResolvedBoardScene(
      "783c6081-75a4-4ed2-8be7-4e0f32680a2b",
      1,
      prepared,
      1,
    );

    expect(scene.elements).toHaveLength(30);
    expect(scene.elements.slice(0, 2).map((element) => element.id)).toEqual([
      "figurea",
      "figureb",
    ]);
    expect(scene.findings).toEqual([
      expect.objectContaining({ element_ids: ["figurea", "figureb"] }),
    ]);
    expect(isResolvedBoardScene(scene)).toBe(true);
  });

  it("drops a lint whose failed root is absent instead of leaking an unknown ID", () => {
    const prepared = {
      lesson: { schemaVersion: "1.2", title: "Failure", steps: [] },
      build: { geometries: [], warnings: [{ id: "failed", detail: "raw exception" }] },
      layoutIssues: [{ code: "text_overflow", elementIds: ["failed"] }],
    } as PreparedBoard;
    const scene = buildResolvedBoardScene(
      "783c6081-75a4-4ed2-8be7-4e0f32680a2b",
      1,
      prepared,
      0,
    );
    expect(scene.findings).toEqual([]);
  });
});
