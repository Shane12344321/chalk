import { describe, expect, it } from "vitest";

import type { Region } from "./lesson.generated";
import {
  COMPOSITION_ARCHETYPES,
  boardRenderContextForPlan,
  compositionPlanFor,
  type CompositionArchetype,
} from "./compositionPlan";

const REGIONS = new Set<Region>([
  "A1", "A2", "A3", "B1", "B2", "B3",
  "C1", "C2", "C3", "D1", "D2", "D3",
  "left", "right", "full",
]);

describe("composition plans", () => {
  it("maps exactly the five shared archetypes", () => {
    expect(COMPOSITION_ARCHETYPES).toEqual([
      "single_large_figure",
      "derivation_plus_diagram",
      "worked_example_column",
      "comparison_pair",
      "graph_with_summary",
    ]);

    for (const archetype of COMPOSITION_ARCHETYPES) {
      expect(compositionPlanFor(archetype)?.archetype).toBe(archetype);
    }
  });

  it("uses only named schema regions and qualitative occupancy expectations", () => {
    for (const archetype of COMPOSITION_ARCHETYPES) {
      const plan = compositionPlanFor(archetype);
      expect(plan).not.toBeNull();
      expect(plan?.zones.length).toBeGreaterThan(0);
      for (const zone of plan?.zones ?? []) {
        expect(REGIONS.has(zone.region)).toBe(true);
        expect(["primary", "supporting", "peer"]).toContain(zone.occupancy);
        expect(Object.keys(zone).sort()).toEqual(["name", "occupancy", "region"]);
      }
      for (const region of plan?.occupancy.expectedZones ?? []) {
        expect(REGIONS.has(region)).toBe(true);
      }
    }
  });

  it("does not expose a model-shaped rectangle or custom-zone surface", () => {
    for (const archetype of COMPOSITION_ARCHETYPES) {
      const serialized = JSON.stringify(compositionPlanFor(archetype));
      expect(serialized).not.toMatch(/"(?:x|y|width|height|bounds|rectangles|customZones)"/);
    }
  });

  it("declares horizontal balance only for peer compositions", () => {
    expect(compositionPlanFor("derivation_plus_diagram")?.occupancy.balance).toBe("horizontal");
    expect(compositionPlanFor("comparison_pair")?.occupancy.balance).toBe("horizontal");
    expect(compositionPlanFor("single_large_figure")?.occupancy.balance).toBeUndefined();
    expect(compositionPlanFor("worked_example_column")?.occupancy.balance).toBeUndefined();
    expect(compositionPlanFor("graph_with_summary")?.occupancy.balance).toBeUndefined();
  });

  it("keeps historical plans opt-in and returns stable deterministic plans", () => {
    expect(compositionPlanFor(undefined)).toBeNull();
    for (const archetype of COMPOSITION_ARCHETYPES) {
      expect(compositionPlanFor(archetype)).toBe(compositionPlanFor(archetype));
    }
  });

  it("projects a live validated plan into browser-only renderer context", () => {
    expect(boardRenderContextForPlan(undefined)).toBeUndefined();
    expect(boardRenderContextForPlan({ composition_archetype: "comparison_pair" }))
      .toEqual({
        occupancyExpectations: {
          expectedZones: ["left", "right"],
          balance: "horizontal",
        },
      });
  });

  it("keeps the compile-time archetype union closed", () => {
    const everyArchetype: readonly CompositionArchetype[] = COMPOSITION_ARCHETYPES;
    expect(everyArchetype).toHaveLength(5);
  });
});
