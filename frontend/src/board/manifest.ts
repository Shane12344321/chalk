import type { BoardGeometry } from "./geometry";
import { BOARD_WIDTH } from "./layout";

export const BOARD_MANIFEST_MAX_CHARS = 600;

export interface VisibleGeometry {
  geometry: BoardGeometry;
  progress: number;
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
