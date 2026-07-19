import Ajv from "ajv";
import sceneSchema from "../../../shared/schema/resolved-board-scene.schema.json";
import type { RecoveryFinding, ResolvedBoardScene } from "./resolvedScene.generated";
import { BOARD_HEIGHT, BOARD_WIDTH, type LayoutBox } from "./layout";
import { layoutLintEvidence } from "./layoutLint";
import type { PreparedBoard } from "./renderer";

const validator = new Ajv({ allErrors: true, strict: true }).compile<ResolvedBoardScene>(sceneSchema);

export function buildResolvedBoardScene(
  requestId: string,
  prefixVersion: number,
  prepared: PreparedBoard,
  committedStepCount: number,
): ResolvedBoardScene {
  const rootElements = prepared.build.geometries.map((geometry) => {
    const state = geometry.stepIndex < committedStepCount
      ? "committed" as const
      : "buffered" as const;
    return {
      id: geometry.id,
      kind: geometry.kind,
      bounds: normalizedBounds(geometry.box),
      summary: compact(geometry.manifestSummary, 120),
      state,
    };
  });
  if (rootElements.length > 30) {
    throw new Error("Resolved board has more accepted roots than its scene budget.");
  }
  const optionalParts = prepared.build.geometries.flatMap((geometry) => {
    const state = geometry.stepIndex < committedStepCount
      ? "committed" as const
      : "buffered" as const;
    return (geometry.manifestParts ?? []).map((entry) => ({
      id: entry.id,
      kind: entry.kind,
      bounds: normalizedBounds(entry.box),
      summary: compact(entry.summary, 120),
      state,
    }));
  }).slice(0, 30 - rootElements.length);
  const elements = [...rootElements, ...optionalParts];
  const sceneIds = new Set(elements.map((element) => element.id));
  const findings = prepared.layoutIssues.flatMap((issue) => {
    const elementIds = [...new Set(issue.elementIds)]
      .filter((elementId) => sceneIds.has(elementId))
      .slice(0, 4);
    if (elementIds.length === 0 && issue.code !== "region_sparse") return [];
    return [{
      code: issue.code === "label_ink_overlap" ? "element_overlap" as const : issue.code,
      evidence: layoutLintEvidence(issue.code),
      element_ids: elementIds,
      ...(issue.zone ? { zone: issue.zone } : {}),
    }];
  }).slice(0, 12);
  const scene = {
    schema_version: "1.0",
    request_id: requestId,
    prefix_version: prefixVersion,
    elements,
    findings,
  };
  if (!validator(scene)) throw new Error("Resolved board scene failed its shared contract.");
  return scene as unknown as ResolvedBoardScene;
}

export function isResolvedBoardScene(value: unknown): value is ResolvedBoardScene {
  if (!validator(value)) return false;
  const ids = value.elements.map((element) => element.id);
  const knownIds = new Set(ids);
  return ids.length === knownIds.size &&
    value.elements.every((element) => {
      const [x, y, width, height] = element.bounds;
      return width > 0 && height > 0 && x + width <= 1.001 && y + height <= 1.001;
    }) &&
    value.findings.every((finding) =>
      finding.element_ids.every((elementId) => knownIds.has(elementId)),
    ) &&
    (value.recovery_findings ?? []).every((finding) =>
      finding.neighborhood.nearby_element_ids.every((elementId) => knownIds.has(elementId)) &&
      finding.affected_element_ids.every((elementId) => !knownIds.has(elementId)),
    );
}

export function withRecoveryFindings(
  scene: ResolvedBoardScene,
  findings: readonly RecoveryFinding[],
): ResolvedBoardScene {
  const value: ResolvedBoardScene = {
    ...scene,
    recovery_findings: findings.map((finding) => ({
      ...finding,
      affected_element_ids: [...finding.affected_element_ids],
      neighborhood: {
        ...finding.neighborhood,
        nearby_element_ids: [...finding.neighborhood.nearby_element_ids],
      },
    })) as ResolvedBoardScene["recovery_findings"],
  };
  if (!isResolvedBoardScene(value)) {
    throw new Error("Resolved recovery findings failed their shared contract.");
  }
  return value;
}

function normalizedBounds(box: LayoutBox): [number, number, number, number] {
  const left = round(clamp(box.x / BOARD_WIDTH));
  const top = round(clamp(box.y / BOARD_HEIGHT));
  const right = round(clamp((box.x + box.width) / BOARD_WIDTH));
  const bottom = round(clamp((box.y + box.height) / BOARD_HEIGHT));
  return [left, top, round(right - left), round(bottom - top)];
}

function clamp(value: number): number {
  return Math.max(0, Math.min(1, value));
}

function round(value: number): number {
  return Math.round(value * 1_000) / 1_000;
}

function compact(value: string, maximum: number): string {
  const normalized = value.replace(/\s+/gu, " ").trim();
  return normalized.length <= maximum ? normalized : `${normalized.slice(0, maximum - 1)}…`;
}
