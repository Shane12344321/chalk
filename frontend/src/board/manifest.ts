import type { BoardGeometry } from "./geometry";
import { BOARD_WIDTH, type LayoutBox } from "./layout";

export const BOARD_MANIFEST_MAX_CHARS = 600;

export interface VisibleGeometry {
  geometry: BoardGeometry;
  progress: number;
}

export interface VisibleBoardElement {
  id: string;
  kind: BoardGeometry["kind"];
  box: LayoutBox;
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
  const committed = visibleGeometry.filter(({ progress }) => progress >= 1);
  const manifest = buildBoardManifest(title, committed);
  const elements = committed.map(({ geometry }) => ({
    id: geometry.id,
    kind: geometry.kind,
    box: { ...geometry.box },
  }));
  return {
    manifest,
    elements,
    fingerprint: JSON.stringify([manifest, elements]),
  };
}

export function buildBoardManifest(
  title: string,
  visibleGeometry: readonly VisibleGeometry[],
): string {
  const committed = visibleGeometry.filter(({ progress }) => progress >= 1);
  const header = `Lesson: ${compact(title, 80)}.`;
  if (committed.length === 0) return `${header} Visible board: empty.`;

  const detailed = committed.map(({ geometry }) =>
    `${geometry.id} (${locationOf(geometry)}): ${compact(geometry.manifestSummary, 72)}`,
  );
  const candidate = `${header} Visible board: ${detailed.join("; ")}.`;
  if (candidate.length <= BOARD_MANIFEST_MAX_CHARS) return candidate;

  const compactEntries = committed.map(({ geometry }) =>
    `${geometry.id}:${geometry.kind}@${locationOf(geometry)}`,
  );
  const fallback = `${header} Visible board: ${compactEntries.join(", ")}.`;
  return compact(fallback, BOARD_MANIFEST_MAX_CHARS);
}

function locationOf(geometry: BoardGeometry): "left" | "center" | "right" {
  const center = geometry.box.x + geometry.box.width / 2;
  if (center < BOARD_WIDTH / 3) return "left";
  if (center > (BOARD_WIDTH * 2) / 3) return "right";
  return "center";
}

function compact(value: string, maximum: number): string {
  const normalized = value.replace(/\s+/gu, " ").trim();
  if (normalized.length <= maximum) return normalized;
  return `${normalized.slice(0, Math.max(0, maximum - 1)).trimEnd()}…`;
}
