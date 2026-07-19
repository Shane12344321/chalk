import type { Region } from "./lesson.generated";
import type { LessonPlan } from "../lessonStream/lessonPlan.generated";
import type { BoardRenderContext } from "./renderer";

export type CompositionArchetype = NonNullable<LessonPlan["composition_archetype"]>;

export type CompositionZoneName =
  | "main_figure"
  | "derivation"
  | "diagram"
  | "worked_steps"
  | "worked_summary"
  | "comparison_left"
  | "comparison_right"
  | "graph"
  | "graph_summary";

export type ZoneOccupancyRole = "primary" | "supporting" | "peer";

export interface CompositionZone {
  /** Renderer-owned semantic name; never accepted from model output. */
  readonly name: CompositionZoneName;
  /** An existing schema region, not model-authored geometry. */
  readonly region: Region;
  /** Qualitative expectation used by later density policy, not a placement rectangle. */
  readonly occupancy: ZoneOccupancyRole;
}

export interface CompositionOccupancyExpectations {
  /** Zones expected to accumulate meaningful content by lesson completion. */
  readonly expectedZones: readonly Region[];
  /** Present only when peer zones should carry comparable visual weight. */
  readonly balance?: "horizontal";
}

export interface ResolvedCompositionPlan {
  readonly archetype: CompositionArchetype;
  readonly zones: readonly CompositionZone[];
  readonly occupancy: CompositionOccupancyExpectations;
}

export const COMPOSITION_ARCHETYPES = [
  "single_large_figure",
  "derivation_plus_diagram",
  "worked_example_column",
  "comparison_pair",
  "graph_with_summary",
] as const satisfies readonly CompositionArchetype[];

const COMPOSITION_PLANS = {
  single_large_figure: {
    archetype: "single_large_figure",
    zones: [{ name: "main_figure", region: "full", occupancy: "primary" }],
    occupancy: { expectedZones: ["full"] },
  },
  derivation_plus_diagram: {
    archetype: "derivation_plus_diagram",
    zones: [
      { name: "derivation", region: "left", occupancy: "peer" },
      { name: "diagram", region: "right", occupancy: "peer" },
    ],
    occupancy: { expectedZones: ["left", "right"], balance: "horizontal" },
  },
  worked_example_column: {
    archetype: "worked_example_column",
    zones: [
      { name: "worked_steps", region: "left", occupancy: "primary" },
      { name: "worked_summary", region: "right", occupancy: "supporting" },
    ],
    occupancy: { expectedZones: ["left", "right"] },
  },
  comparison_pair: {
    archetype: "comparison_pair",
    zones: [
      { name: "comparison_left", region: "left", occupancy: "peer" },
      { name: "comparison_right", region: "right", occupancy: "peer" },
    ],
    occupancy: { expectedZones: ["left", "right"], balance: "horizontal" },
  },
  graph_with_summary: {
    archetype: "graph_with_summary",
    zones: [
      { name: "graph", region: "left", occupancy: "primary" },
      { name: "graph_summary", region: "right", occupancy: "supporting" },
    ],
    occupancy: { expectedZones: ["left", "right"] },
  },
} as const satisfies Record<CompositionArchetype, ResolvedCompositionPlan>;

/**
 * Translate a model-selected closed name into renderer-owned named regions.
 * Historical plans omit the field and intentionally receive no composition policy.
 */
export function compositionPlanFor(
  archetype: CompositionArchetype | undefined,
): ResolvedCompositionPlan | null {
  return archetype === undefined ? null : COMPOSITION_PLANS[archetype];
}

/** Keep the model plan out of lesson wire state while exposing only renderer policy. */
export function boardRenderContextForPlan(
  plan: Pick<LessonPlan, "composition_archetype"> | undefined,
): BoardRenderContext | undefined {
  const resolved = compositionPlanFor(plan?.composition_archetype);
  return resolved ? { occupancyExpectations: resolved.occupancy } : undefined;
}
