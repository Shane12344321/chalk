import { describe, expect, it } from "vitest";
import type { VisibleBoardState } from "../board/manifest";
import { buildQaAnnotationProgram } from "./qaAnnotation";

const REQUEST_ID = "123e4567-e89b-42d3-a456-426614174000";
const VISIBLE: VisibleBoardState = {
  version: 7,
  manifest: "Lesson: vectors. Visible board: ray1.",
  fingerprint: "visible-7",
  elements: [
    {
      id: "ray1",
      kind: "arrow",
      box: { x: 100, y: 100, width: 300, height: 80 },
      summary: "incident ray",
    },
  ],
};

describe("Q&A annotation builder", () => {
  it("stamps current renderer truth and produces at most two schema-valid overlay ops", () => {
    const result = buildQaAnnotationProgram(
      [
        { kind: "circle", target_id: "ray1" },
        { kind: "text", target_id: "ray1", side: "above", content: "  smaller angle  " },
      ],
      "QA",
      VISIBLE,
      REQUEST_ID,
    );
    expect(result).toMatchObject({
      ok: true,
      program: {
        request_id: REQUEST_ID,
        manifest_version: 7,
        ops: [
          { op: "circle", target_id: "ray1" },
          { op: "text", target_id: "ray1", side: "above", content: "smaller angle" },
        ],
      },
    });
  });

  it("refuses marks outside Q&A, empty boards, stale targets, and oversized batches", () => {
    expect(buildQaAnnotationProgram([{ kind: "circle", target_id: "ray1" }], "TEACHING", VISIBLE, REQUEST_ID)).toEqual({ ok: false, reason: "not_in_qa" });
    expect(buildQaAnnotationProgram([{ kind: "circle", target_id: "ray1" }], "QA", { ...VISIBLE, version: 0, elements: [] }, REQUEST_ID)).toEqual({ ok: false, reason: "empty_board" });
    expect(buildQaAnnotationProgram([{ kind: "circle", target_id: "future" }], "QA", VISIBLE, REQUEST_ID)).toEqual({ ok: false, reason: "unknown_element" });
    expect(buildQaAnnotationProgram([
      { kind: "circle", target_id: "ray1" },
      { kind: "underline", target_id: "ray1" },
      { kind: "arrow", target_id: "ray1", side: "right" },
    ], "QA", VISIBLE, REQUEST_ID)).toEqual({ ok: false, reason: "invalid_program" });
  });

  it("rejects unsafe text after browser normalization instead of truncating it", () => {
    expect(buildQaAnnotationProgram([
      { kind: "text", target_id: "ray1", side: "below", content: "x".repeat(101) },
    ], "QA", VISIBLE, REQUEST_ID)).toEqual({ ok: false, reason: "invalid_program" });
  });
});
