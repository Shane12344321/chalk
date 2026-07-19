import { describe, expect, it } from "vitest";
import {
  Phase6AudioActivityRecorder,
  preparePhase6AudioRunPlan,
} from "./phase6AudioActivityRecorder";

const SCRIPT = "This curve reaches its maximum at forty-five degrees.";
const HASH = "a".repeat(64);

async function plan() {
  return preparePhase6AudioRunPlan({
    experimentId: "phase-six-audio",
    runId: "audio-run-one",
    cachedLessonId: "projectile",
    stepId: "range",
    script: SCRIPT,
    model: "gpt-realtime-2.1-mini",
    voice: "marin",
    browserLabel: "chrome-macos",
  }, async () => HASH);
}

describe("Phase-6 audio-activity recorder", () => {
  it("pins only the cached-script hash and records a closed activity run", async () => {
    const prepared = await plan();
    let now = 1_000;
    const recorder = new Phase6AudioActivityRecorder(prepared, {
      signal: new AbortController().signal,
      isCurrent: () => true,
      now: () => now,
    });
    expect(recorder.claimResponse()).toBe(true);
    expect(recorder.claimResponse()).toBe(false);
    now = 1_050;
    expect(recorder.bufferStarted()).toBe(true);
    expect(recorder.activityTransition({ active: true, observedAtMs: 1_100, rms: 0.9 })).toBe(true);
    expect(recorder.addAudibleReference(1_090, 2_700)).toBe(true);
    expect(recorder.activityTransition({ active: false, observedAtMs: 2_750, rms: 0 })).toBe(true);
    now = 2_800;
    expect(recorder.bufferStopped()).toBe(true);
    expect(recorder.recordInterruption("preserved")).toBe(true);
    now = 2_900;
    const evidence = recorder.finish({
      outcome: "completed",
      monitor: { active: false, transitions: 2, samples: 120, maxSampleCostMs: 0.15 },
      humanPreference: "improved",
    });
    expect(evidence).toMatchObject({
      response_calls: 1,
      outcome: "completed",
      metrics: {
        activity_start_latency_ms: 10,
        activity_stop_offset_ms: 50,
        false_pause_count: 0,
        samples: 120,
      },
    });
    const serialized = JSON.stringify(evidence);
    expect(serialized).not.toContain(SCRIPT);
    expect(serialized).not.toContain("0.9");
  });

  it("rejects duplicate transitions, overlapping references, retries, and post-terminal writes", async () => {
    const prepared = await plan();
    let now = 0;
    const recorder = new Phase6AudioActivityRecorder(prepared, {
      signal: new AbortController().signal,
      isCurrent: () => true,
      now: () => now,
    });
    expect(recorder.claimResponse()).toBe(true);
    expect(recorder.activityTransition({ active: true, observedAtMs: 10, rms: 0.1 })).toBe(true);
    expect(recorder.activityTransition({ active: true, observedAtMs: 20, rms: 0.2 })).toBe(false);
    expect(recorder.addAudibleReference(5, 15)).toBe(true);
    expect(recorder.addAudibleReference(14, 25)).toBe(false);
    now = 30;
    const evidence = recorder.finish({
      outcome: "response_failed",
      monitor: { active: true, transitions: 1, samples: 2, maxSampleCostMs: 0.1 },
      humanPreference: "improved",
    });
    expect(evidence.human_preference).toBe("not_rated");
    expect(recorder.claimResponse()).toBe(false);
    expect(() => recorder.finish({
      outcome: "response_failed",
      monitor: { active: true, transitions: 1, samples: 2, maxSampleCostMs: 0.1 },
      humanPreference: "not_rated",
    })).toThrow(/already terminal/u);
  });

  it("can fail unsupported before spend and overrides aborted or stale results", async () => {
    const prepared = await plan();
    let now = 10;
    const unsupported = new Phase6AudioActivityRecorder(prepared, {
      signal: new AbortController().signal,
      isCurrent: () => true,
      now: () => now,
    });
    now = 20;
    expect(unsupported.finish({
      outcome: "unsupported",
      monitor: { active: false, transitions: 0, samples: 0, maxSampleCostMs: 0 },
      humanPreference: "not_rated",
    })).toMatchObject({ outcome: "unsupported", response_calls: 0 });

    const controller = new AbortController();
    now = 30;
    const aborted = new Phase6AudioActivityRecorder(prepared, {
      signal: controller.signal,
      isCurrent: () => true,
      now: () => now,
    });
    expect(aborted.claimResponse()).toBe(true);
    controller.abort();
    now = 40;
    expect(aborted.finish({
      outcome: "completed",
      monitor: { active: false, transitions: 0, samples: 0, maxSampleCostMs: 0 },
      humanPreference: "improved",
    })).toMatchObject({ outcome: "aborted", human_preference: "not_rated" });

    let current = true;
    now = 50;
    const stale = new Phase6AudioActivityRecorder(prepared, {
      signal: new AbortController().signal,
      isCurrent: () => current,
      now: () => now,
    });
    expect(stale.claimResponse()).toBe(true);
    current = false;
    now = 60;
    expect(stale.finish({
      outcome: "completed",
      monitor: { active: false, transitions: 0, samples: 0, maxSampleCostMs: 0 },
      humanPreference: "improved",
    })).toMatchObject({ outcome: "stale", human_preference: "not_rated" });
  });

  it("fails closed on non-monotonic monitor or clock timings", async () => {
    const prepared = await plan();
    let now = 100;
    const recorder = new Phase6AudioActivityRecorder(prepared, {
      signal: new AbortController().signal,
      isCurrent: () => true,
      now: () => now,
    });
    expect(recorder.activityTransition({ active: true, observedAtMs: 90, rms: 0.1 })).toBe(false);
    now = 99;
    expect(() => recorder.bufferStarted()).toThrow(/non-monotonic/u);
  });

  it("rejects malformed identities and hash providers before any run exists", async () => {
    await expect(preparePhase6AudioRunPlan({
      experimentId: "phase-six-audio",
      runId: "audio-run-one",
      cachedLessonId: "projectile",
      stepId: "RANGE",
      script: SCRIPT,
      model: "gpt-realtime-2.1-mini",
      voice: "marin",
      browserLabel: "chrome-macos",
    }, async () => HASH)).rejects.toThrow(/step ID/u);
    await expect(preparePhase6AudioRunPlan({
      experimentId: "phase-six-audio",
      runId: "audio-run-one",
      cachedLessonId: "projectile",
      stepId: "range",
      script: SCRIPT,
      model: "gpt-realtime-2.1-mini",
      voice: "marin",
      browserLabel: "chrome-macos",
    }, async () => "bad")).rejects.toThrow(/SHA-256/u);
  });

  it("rejects mutated plans and monitor snapshots that disagree with retained transitions", async () => {
    const prepared = await plan();
    const mutated = structuredClone(prepared);
    mutated.responseCallCeiling = 2 as 1;
    expect(() => new Phase6AudioActivityRecorder(mutated, {
      signal: new AbortController().signal,
      isCurrent: () => true,
      now: () => 0,
    })).toThrow(/plan is invalid/u);

    let now = 0;
    const recorder = new Phase6AudioActivityRecorder(prepared, {
      signal: new AbortController().signal,
      isCurrent: () => true,
      now: () => now,
    });
    expect(recorder.claimResponse()).toBe(true);
    expect(recorder.activityTransition({ active: true, observedAtMs: 10, rms: 0.03 })).toBe(true);
    now = 20;
    expect(() => recorder.finish({
      outcome: "response_failed",
      monitor: { active: false, transitions: 0, samples: 1, maxSampleCostMs: 0.1 },
      humanPreference: "not_rated",
    })).toThrow(/snapshot does not match/u);
  });
});
