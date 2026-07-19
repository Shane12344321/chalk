import type { BoardGeometry } from "./geometry";
import { BOARD_HEIGHT, BOARD_WIDTH, type LayoutBox } from "./layout";
import { revealGroupProgress } from "./reveal";

export const BOARD_MANIFEST_MAX_CHARS = 600;

export interface VisibleGeometry {
  geometry: BoardGeometry;
  progress: number;
}

export interface VisibleBoardElement {
  id: string;
  kind: BoardGeometry["kind"];
  box: LayoutBox;
  summary: string;
}

export interface AnnotationVisibleElement {
  id: string;
  kind: BoardGeometry["kind"];
  bounds: [number, number, number, number];
}

export interface VisibleBoardSnapshot {
  manifest: string;
  elements: VisibleBoardElement[];
  fingerprint: string;
}

export interface VisibleBoardState extends VisibleBoardSnapshot {
  version: number;
}

export function buildVisibleBoardSnapshot(
  title: string,
  visibleGeometry: readonly VisibleGeometry[],
): VisibleBoardSnapshot {
  const elements = visibleEntries(visibleGeometry).slice(-30);
  const manifest = buildManifestFromElements(title, elements);
  return {
    manifest,
    elements,
    fingerprint: JSON.stringify([manifest, elements]),
  };
}

export function toAnnotationVisibleElements(
  elements: readonly VisibleBoardElement[],
): AnnotationVisibleElement[] {
  return elements.map((element) => {
    const left = roundBound(clamp01(element.box.x / BOARD_WIDTH));
    const top = roundBound(clamp01(element.box.y / BOARD_HEIGHT));
    const right = roundBound(clamp01((element.box.x + element.box.width) / BOARD_WIDTH));
    const bottom = roundBound(clamp01((element.box.y + element.box.height) / BOARD_HEIGHT));
    return {
      id: element.id,
      kind: element.kind,
      bounds: [left, top, roundBound(right - left), roundBound(bottom - top)],
    };
  });
}

export function buildBoardManifest(
  title: string,
  visibleGeometry: readonly VisibleGeometry[],
): string {
  return buildManifestFromElements(title, visibleEntries(visibleGeometry).slice(-30));
}

function buildManifestFromElements(
  title: string,
  elements: readonly VisibleBoardElement[],
): string {
  const header = `Lesson: ${compact(title, 80)}.`;
  if (elements.length === 0) return `${header} Visible board: empty.`;

  const detailed = elements.map((element) =>
    `${element.id} (${locationOf(element.box)}): ${compact(element.summary, 100)}`,
  );
  const candidate = `${header} Visible board: ${detailed.join("; ")}.`;
  if (candidate.length <= BOARD_MANIFEST_MAX_CHARS) return candidate;

  const compactEntries = elements.map((element) =>
    `${element.id}:${element.kind}@${locationOf(element.box)}`,
  );
  const fallback = `${header} Visible board: ${compactEntries.join(", ")}.`;
  return compact(fallback, BOARD_MANIFEST_MAX_CHARS);
}

function visibleEntries(
  visibleGeometry: readonly VisibleGeometry[],
): VisibleBoardElement[] {
  return visibleGeometry.flatMap(({ geometry, progress }) => {
    if (geometry.manifestParts?.length) {
      return geometry.manifestParts
        .filter(
          (part) =>
            revealGroupProgress(geometry.paths, part.revealGroup, progress) >= 0.999,
        )
        .map((part) => ({
          id: part.id,
          kind: part.kind,
          box: { ...part.box },
          summary: part.summary,
        }));
    }
    if (progress < 1) return [];
    return [{
      id: geometry.id,
      kind: geometry.kind,
      box: { ...geometry.box },
      summary: geometry.manifestSummary,
    }];
  });
}

function locationOf(box: LayoutBox): "left" | "center" | "right" {
  const center = box.x + box.width / 2;
  if (center < BOARD_WIDTH / 3) return "left";
  if (center > (BOARD_WIDTH * 2) / 3) return "right";
  return "center";
}

function compact(value: string, maximum: number): string {
  const normalized = value.replace(/\s+/gu, " ").trim();
  if (normalized.length <= maximum) return normalized;
  return `${normalized.slice(0, Math.max(0, maximum - 1)).trimEnd()}…`;
}

function clamp01(value: number): number {
  return Math.min(1, Math.max(0, value));
}

function roundBound(value: number): number {
  return Math.round(value * 1_000) / 1_000;
}
