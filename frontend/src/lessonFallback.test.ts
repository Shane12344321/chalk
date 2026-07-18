import { describe, expect, it } from "vitest";
import { pickCachedLessonKey } from "./lessonFallback";

describe("topic-aware cached fallback", () => {
  it("maps derivative-flavoured topics to the derivative lesson", () => {
    expect(pickCachedLessonKey("Derivative as slope at a point")).toBe("derivative");
    expect(pickCachedLessonKey("what is differentiation")).toBe("derivative");
    expect(pickCachedLessonKey("tangent lines")).toBe("derivative");
  });

  it("maps trigonometry topics to the unit-circle lesson", () => {
    expect(pickCachedLessonKey("the unit circle")).toBe("unit-circle");
    expect(pickCachedLessonKey("why sine waves oscillate")).toBe("unit-circle");
    expect(pickCachedLessonKey("intro to trig")).toBe("unit-circle");
  });

  it("maps launch topics to the projectile lesson and defaults there", () => {
    expect(pickCachedLessonKey("projectile range at 45 degrees")).toBe("projectile");
    expect(pickCachedLessonKey("throwing a ball")).toBe("projectile");
    expect(pickCachedLessonKey("photosynthesis")).toBe("projectile");
  });
});
