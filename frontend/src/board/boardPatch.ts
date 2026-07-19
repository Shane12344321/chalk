import type { BoardGeometry } from "./geometry";

export interface BoardPatchUpdate {
  before: BoardGeometry;
  after: BoardGeometry;
}

export interface BoardPatch {
  requestId: string;
  stepId: string;
  added: BoardGeometry[];
  updated: BoardPatchUpdate[];
  removed: BoardGeometry[];
}

export function createBoardPatch(
  requestId: string,
  stepId: string,
  before: readonly BoardGeometry[],
  after: readonly BoardGeometry[],
): BoardPatch {
  const previous = new Map(before.map((geometry) => [geometry.id, geometry]));
  const next = new Map(after.map((geometry) => [geometry.id, geometry]));
  const added = after.filter((geometry) => !previous.has(geometry.id));
  const removed = before.filter((geometry) => !next.has(geometry.id));
  const updated = after.flatMap((geometry) => {
    const original = previous.get(geometry.id);
    if (!original || geometryFingerprint(original) === geometryFingerprint(geometry)) return [];
    return [{ before: original, after: geometry }];
  });
  return { requestId, stepId, added, updated, removed };
}

export function applyBoardPatch(
  current: readonly BoardGeometry[],
  patch: BoardPatch,
): BoardGeometry[] {
  const removed = new Set(patch.removed.map((geometry) => geometry.id));
  const replacements = new Map(patch.updated.map(({ after }) => [after.id, after]));
  const result = current
    .filter((geometry) => !removed.has(geometry.id))
    .map((geometry) => replacements.get(geometry.id) ?? geometry);
  const existing = new Set(result.map((geometry) => geometry.id));
  for (const geometry of patch.added) {
    if (!existing.has(geometry.id)) result.push(geometry);
  }
  return result;
}

export function reverseBoardPatch(patch: BoardPatch): BoardPatch {
  return {
    requestId: patch.requestId,
    stepId: patch.stepId,
    added: patch.removed,
    updated: patch.updated.map(({ before, after }) => ({ before: after, after: before })),
    removed: patch.added,
  };
}

function geometryFingerprint(geometry: BoardGeometry): string {
  return JSON.stringify(geometry);
}
