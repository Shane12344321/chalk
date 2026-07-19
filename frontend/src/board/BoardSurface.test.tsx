import { describe, expect, it } from "vitest";
import { configuredBoardRenderer } from "./boardRendererConfig";

describe("board renderer flag", () => {
  it("keeps rough SVG as the dependable default", () => {
    expect(configuredBoardRenderer(undefined)).toBe("rough-svg");
    expect(configuredBoardRenderer("unknown")).toBe("rough-svg");
  });

  it("selects tldraw only by exact opt-in", () => {
    expect(configuredBoardRenderer("tldraw")).toBe("tldraw");
  });
});
