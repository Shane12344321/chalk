import { describe, expect, it } from "vitest";
import { equationFontSizeForContent } from "./equationSizing";

describe("shared equation sizing", () => {
  it("keeps the painter and precommit font decision inside one closed range", () => {
    expect(equationFontSizeForContent("x=1", 300)).toBe(30);
    expect(equationFontSizeForContent("x".repeat(100), 300)).toBe(10);
    expect(equationFontSizeForContent("\\frac{dy}{dx}=2x", 700)).toBeLessThanOrEqual(31);
  });
});
