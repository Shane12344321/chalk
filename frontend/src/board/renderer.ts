import { opProgress } from "./animation";
import type { NormalizedLesson } from "./decode";
import {
  BoardGeometryStore,
  type BoardGeometry,
  type GeometryBuildResult,
} from "./geometry";
import {
  analyzeBoardOccupancy,
  findReadingOrderConflicts,
  layoutSteps,
  type BoardOccupancyExpectations,
} from "./layout";
import {
  groupLayoutLintIssues,
  lintBoardGeometry,
  type LayoutLintIssue,
} from "./layoutLint";
import {
  buildVisibleBoardSnapshot,
  type VisibleBoardSnapshot,
} from "./manifest";
import { measurableRootsForSteps } from "./premeasureLesson";
import type { PrecommitMeasurementCache, RootMeasurement } from "./precommitMeasurement";

export type BoardRendererKind = "rough-svg" | "tldraw";

export interface PreparedBoard {
  lesson: NormalizedLesson;
  build: GeometryBuildResult;
  layoutIssues: LayoutLintIssue[];
}

export interface BoardRenderContext {
  /** Validated plan intent translated into browser-owned occupancy expectations. */
  occupancyExpectations?: BoardOccupancyExpectations;
}

export interface BoardRenderer {
  readonly kind: BoardRendererKind;
  prepareLesson(lesson: NormalizedLesson, context?: BoardRenderContext): PreparedBoard;
  geometryProgress(
    prepared: PreparedBoard,
    geometry: BoardGeometry,
    currentStepIndex: number,
    currentStepProgress: number,
  ): number;
  visibleSnapshot(
    prepared: PreparedBoard,
    currentStepIndex: number,
    currentStepProgress: number,
  ): VisibleBoardSnapshot;
}

/**
 * Renderer-neutral model for the accepted SVG/rough.js board. React remains
 * responsible only for painting the prepared geometry; lesson layout, manifest
 * truth and diagnostics now cross one replaceable boundary.
 */
export class RoughSvgBoardRenderer implements BoardRenderer {
  readonly kind = "rough-svg" as const;
  private readonly geometryStore = new BoardGeometryStore();

  constructor(private readonly measurementCache?: PrecommitMeasurementCache) {}

  prepareLesson(lesson: NormalizedLesson, context: BoardRenderContext = {}): PreparedBoard {
    const measurements = new Map<string, RootMeasurement>();
    for (const root of measurableRootsForSteps(lesson.steps)) {
      const measurement = this.measurementCache?.lookup(root);
      if (measurement) measurements.set(root.id, measurement);
    }
    const layoutWarnings: GeometryBuildResult["warnings"] = [];
    const laidOut = layoutSteps(lesson.steps, {
      measurements,
      occupancyExpectations: context.occupancyExpectations,
      onWarning: ({ id, code }) => {
        // Only closed renderer-owned codes cross this boundary; exception text
        // remains local and cannot leak into continuation evidence.
        layoutWarnings.push({
          id,
          detail: code === "missing_dependency"
            ? "layout:missing_dependency"
            : `construction:${code}`,
        });
      },
    });
    const geometryBuild = this.geometryStore.build(laidOut);
    const build = {
      ...geometryBuild,
      warnings: [...layoutWarnings, ...geometryBuild.warnings],
    };
    return {
      lesson,
      build,
      layoutIssues: groupLayoutLintIssues([
        ...lintBoardGeometry(build.geometries),
        ...analyzeBoardOccupancy(laidOut, context.occupancyExpectations).findings,
        ...findReadingOrderConflicts(laidOut, lesson.steps),
        ...[...measurements.values()]
          .filter((measurement) => measurement.evidence === "estimated")
          .map((measurement): LayoutLintIssue => ({
            code: "measurement_unavailable",
            elementIds: [measurement.id],
          })),
      ]),
    };
  }

  geometryProgress(
    prepared: PreparedBoard,
    geometry: BoardGeometry,
    currentStepIndex: number,
    currentStepProgress: number,
  ): number {
    if (geometry.stepIndex < currentStepIndex) return 1;
    if (geometry.stepIndex > currentStepIndex) return 0;
    const step = prepared.lesson.steps[geometry.stepIndex];
    return step ? opProgress(step.ops, geometry.opIndex, currentStepProgress) : 0;
  }

  visibleSnapshot(
    prepared: PreparedBoard,
    currentStepIndex: number,
    currentStepProgress: number,
  ): VisibleBoardSnapshot {
    return buildVisibleBoardSnapshot(
      prepared.lesson.title,
      prepared.build.geometries.map((geometry) => ({
        geometry,
        progress: this.geometryProgress(
          prepared,
          geometry,
          currentStepIndex,
          currentStepProgress,
        ),
      })),
    );
  }
}
