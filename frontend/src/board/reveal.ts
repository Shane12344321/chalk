export interface RevealPath {
  revealGroup?: number;
  revealWeight?: number;
}

export function revealGroupProgress(
  paths: readonly RevealPath[],
  revealGroup: number,
  progress: number,
): number {
  const groups = new Map<number, number>();
  for (const path of paths) {
    if (path.revealGroup === undefined) continue;
    groups.set(
      path.revealGroup,
      Math.max(groups.get(path.revealGroup) ?? 0, path.revealWeight ?? 1),
    );
  }
  const ordered = [...groups.entries()].sort(([left], [right]) => left - right);
  const total = ordered.reduce((sum, [, weight]) => sum + weight, 0);
  if (total <= 0) return clamp(progress);
  const before = ordered
    .filter(([group]) => group < revealGroup)
    .reduce((sum, [, weight]) => sum + weight, 0);
  const own = groups.get(revealGroup) ?? 1;
  return easeInOut(clamp((progress * total - before) / own));
}

function clamp(value: number): number {
  return Math.min(1, Math.max(0, value));
}

function easeInOut(value: number): number {
  return value < 0.5 ? 4 * value * value * value : 1 - (-2 * value + 2) ** 3 / 2;
}
