import { describe, expect, it } from "vitest";
import type { VisibleBoardElement } from "./manifest";
import {
  buildGroundedBoardQuestion,
  configuredBoardQuestionGrounding,
  groundingEvidence,
} from "./boardQuestionGrounding";

const elements: VisibleBoardElement[] = [{
  id: "ray1",
  kind: "arrow",
  box: { x: 200, y: 180, width: 400, height: 90 },
  summary: "incident ray approaching the interface",
}];

describe("board question grounding", () => {
  it("defaults every unknown flag to structured truth", () => {
    expect(configuredBoardQuestionGrounding(undefined)).toBe("structured");
    expect(configuredBoardQuestionGrounding("vision")).toBe("structured");
  });

  it("adds a bounded low-detail image only under the exact experiment flag", () => {
    const result = buildGroundedBoardQuestion({
      mode: "structured-image",
      question: "Why does this ray bend?",
      elements,
      imageDataUrl: "data:image/png;base64,aGVsbG8=",
    });
    expect(result.mode).toBe("structured-image");
    expect(result.text).toContain('"id":"ray1"');
    expect(result.image?.detail).toBe("low");
    expect(groundingEvidence(result)).toEqual({
      mode: "structured-image",
      structuredChars: result.text.length,
      imagePresent: true,
    });
    expect(JSON.stringify(groundingEvidence(result))).not.toContain("aGVsbG8");
  });

  it("falls back without weakening structured context when the image is invalid", () => {
    const result = buildGroundedBoardQuestion({
      mode: "structured-image",
      question: "Where is this?",
      elements,
      imageDataUrl: "https://example.com/student.png",
    });
    expect(result.mode).toBe("structured");
    expect(result.image).toBeUndefined();
    expect(result.text).toContain("authoritative");
  });
});
