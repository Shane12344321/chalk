export type CachedLessonKey = "projectile" | "derivative" | "unit-circle";

const KEYWORDS: Array<[CachedLessonKey, RegExp]> = [
  ["derivative", /deriv|slope|tangent|differenti|rate of change/i],
  ["unit-circle", /unit circle|sine|sin\b|cosine|trig|radian|angle.*circle/i],
  ["projectile", /projectil|launch|trajector|cannon|throw|range.*angle|kinematic/i],
];

/**
 * Choose the cached lesson closest to the failed topic so the fallback keeps
 * teaching something related instead of always loading the projectile lesson.
 */
export function pickCachedLessonKey(topic: string): CachedLessonKey {
  for (const [key, pattern] of KEYWORDS) {
    if (pattern.test(topic)) return key;
  }
  return "projectile";
}
