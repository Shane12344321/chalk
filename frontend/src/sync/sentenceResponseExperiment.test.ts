import { describe, expect, it } from "vitest";
import {
  prepareSentenceResponsePlan,
  SentenceResponseEvidenceCollector,
} from "./sentenceResponseExperiment";

const SCRIPT =
  "Therefore theta is forty-five degrees. Equal launch and landing heights make that the maximum-range angle.";

describe("sentence-response comparison contract", () => {
  it("pins one-call and two-call plans from identical normalized content", () => {
    const single = prepareSentenceResponsePlan("phase6-sentence", SCRIPT, "single_response");
    const split = prepareSentenceResponsePlan("phase6-sentence", SCRIPT, "per_sentence");
    expect(single.segments).toEqual([SCRIPT]);
    expect(single.responseCallCeiling).toBe(1);
    expect(split.segments).toEqual([
      "Therefore theta is forty-five degrees.",
      "Equal launch and landing heights make that the maximum-range angle.",
    ]);
    expect(split.responseCallCeiling).toBe(2);
    expect(split.segments.join(" ")).toBe(single.segments[0]);
  });

  it("requires serial settlement and records content-free gap/latency evidence", () => {
    const plan = prepareSentenceResponsePlan("phase6-sentence", SCRIPT, "per_sentence");
    const collector = new SentenceResponseEvidenceCollector(plan);
    expect(collector.request(1, 0)).toBe(false);
    expect(collector.request(0, 100)).toBe(true);
    expect(collector.activity(0, 140)).toBe(true);
    expect(collector.playbackStopped(0, 900)).toBe(true);
    expect(collector.request(1, 910)).toBe(false);
    expect(collector.generationDone(0, 920)).toBe(true);
    expect(collector.request(1, 930)).toBe(true);
    expect(collector.activity(1, 1_020)).toBe(true);
    expect(collector.generationDone(1, 1_600)).toBe(true);
    expect(collector.playbackStopped(1, 1_650)).toBe(true);

    const summary = collector.summary();
    expect(summary).toEqual({
      schema: "chalk.sentence-response-evidence.v1",
      experimentId: "phase6-sentence",
      mode: "per_sentence",
      plannedResponses: 2,
      requestedResponses: 2,
      completedResponses: 2,
      failedResponses: 0,
      interrupted: false,
      totalLatencyMs: 1_550,
      interSentenceGapMs: [120],
    });
    expect(JSON.stringify(summary)).not.toContain("theta");
  });

  it("records failure/interruption without inventing completion", () => {
    const plan = prepareSentenceResponsePlan("phase6-sentence", SCRIPT, "per_sentence");
    const collector = new SentenceResponseEvidenceCollector(plan);
    expect(collector.request(0, 0)).toBe(true);
    expect(collector.fail(0)).toBe(true);
    collector.interrupt();
    expect(collector.request(1, 10)).toBe(false);
    expect(collector.summary()).toMatchObject({
      requestedResponses: 1,
      completedResponses: 0,
      failedResponses: 1,
      interrupted: true,
      interSentenceGapMs: [],
    });
  });

  it("rejects scripts that cannot form the bounded paired comparison", () => {
    expect(() => prepareSentenceResponsePlan("x", SCRIPT, "per_sentence")).toThrow(/ID/);
    expect(() => prepareSentenceResponsePlan("phase6-one", "One sentence only.", "per_sentence"))
      .toThrow(/two to five/);
    expect(() => prepareSentenceResponsePlan("phase6-long", "x".repeat(241), "single_response"))
      .toThrow(/character budget/);
  });
});
