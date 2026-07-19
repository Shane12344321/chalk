import { describe, expect, it, vi } from "vitest";
import {
  preparePhase6SentencePlan,
  runPhase6SentenceTrial,
  type Phase6SentenceMode,
} from "./phase6SentenceRunner";

const SCRIPT =
  "Therefore theta is forty-five degrees. Equal launch and landing heights make that the maximum-range angle.";
const HASH = "a".repeat(64);

async function plan(mode: Phase6SentenceMode, runId = `runner-${mode.replace("_", "-")}`) {
  return preparePhase6SentencePlan({
    experimentId: "phase-six-runner",
    runId,
    cachedLessonId: "projectile",
    stepId: "range",
    script: `  ${SCRIPT.replace(" ", "   ")}  `,
    model: "gpt-realtime-2.1-mini",
    voice: "marin",
    browserLabel: "chrome-macos",
    mode,
  }, async () => HASH);
}

describe("Phase-6 injected sentence runner", () => {
  it("pins normalized cached content but retains only its SHA-256 identity", async () => {
    const prepared = await plan("per_sentence");
    expect(prepared.segments).toEqual([
      "Therefore theta is forty-five degrees.",
      "Equal launch and landing heights make that the maximum-range angle.",
    ]);
    expect(prepared.identity.script_sha256).toBe(HASH);
    expect(prepared.responseCallCeiling).toBe(2);
  });

  it("dispatches serially once per segment and records monotonic content-free evidence", async () => {
    const prepared = await plan("per_sentence");
    let now = 1_000;
    let activeDispatches = 0;
    const scripts: string[] = [];
    const dispatch = vi.fn(async ({ script, onLifecycle }) => {
      activeDispatches += 1;
      expect(activeDispatches).toBe(1);
      scripts.push(script);
      now += 10;
      expect(onLifecycle("activity")).toBe(true);
      now += 10;
      expect(onLifecycle("generation_done")).toBe(true);
      now += 10;
      expect(onLifecycle("playback_stopped")).toBe(true);
      activeDispatches -= 1;
      return { outcome: "completed" as const };
    });
    const trial = await runPhase6SentenceTrial(prepared, {
      signal: new AbortController().signal,
      isCurrent: () => true,
      dispatch,
      now: () => now,
      hashText: async () => HASH,
    });
    expect(dispatch).toHaveBeenCalledTimes(2);
    expect(scripts.join(" ")).toBe(SCRIPT);
    expect(trial).toMatchObject({
      terminal_reason: "completed",
      requested_responses: 2,
      completed_responses: 2,
      failed_responses: 0,
      total_latency_ms: 60,
      inter_response_gap_ms: [10],
    });
    expect(JSON.stringify(trial)).not.toContain("theta");
  });

  it("stops after the first dispatch failure with no retry or later response", async () => {
    const prepared = await plan("per_sentence");
    let now = 0;
    const dispatch = vi.fn(async () => {
      now += 10;
      throw new Error("synthetic transport failure with content that must not survive");
    });
    const trial = await runPhase6SentenceTrial(prepared, {
      signal: new AbortController().signal,
      isCurrent: () => true,
      dispatch,
      now: () => now,
      hashText: async () => HASH,
    });
    expect(dispatch).toHaveBeenCalledOnce();
    expect(trial).toMatchObject({
      terminal_reason: "response_failed",
      requested_responses: 1,
      completed_responses: 0,
      failed_responses: 1,
      total_latency_ms: null,
    });
    expect(JSON.stringify(trial)).not.toContain("synthetic transport");
  });

  it("makes no call when already aborted or stale", async () => {
    const prepared = await plan("single_response");
    const dispatch = vi.fn();
    const aborted = new AbortController();
    aborted.abort();
    const abortedTrial = await runPhase6SentenceTrial(prepared, {
      signal: aborted.signal,
      isCurrent: () => true,
      dispatch,
      now: () => 0,
      hashText: async () => HASH,
    });
    expect(abortedTrial.terminal_reason).toBe("aborted");
    expect(abortedTrial.requested_responses).toBe(0);

    const staleTrial = await runPhase6SentenceTrial(prepared, {
      signal: new AbortController().signal,
      isCurrent: () => false,
      dispatch,
      now: () => 0,
      hashText: async () => HASH,
    });
    expect(staleTrial.terminal_reason).toBe("stale");
    expect(dispatch).not.toHaveBeenCalled();
  });

  it("rejects a late result after abort and ignores later lifecycle callbacks", async () => {
    const prepared = await plan("per_sentence");
    const controller = new AbortController();
    let now = 0;
    let lateLifecycle: ((stage: "activity") => boolean) | undefined;
    const trialPromise = runPhase6SentenceTrial(prepared, {
      signal: controller.signal,
      isCurrent: () => true,
      dispatch: async ({ onLifecycle }) => {
        lateLifecycle = onLifecycle;
        now = 10;
        onLifecycle("activity");
        controller.abort();
        await Promise.resolve();
        return { outcome: "completed" };
      },
      now: () => now,
      hashText: async () => HASH,
    });
    const trial = await trialPromise;
    expect(trial.terminal_reason).toBe("aborted");
    expect(trial.requested_responses).toBe(1);
    expect(lateLifecycle?.("activity")).toBe(false);
  });

  it("marks a superseded result stale and refuses the next segment", async () => {
    const prepared = await plan("per_sentence");
    let current = true;
    let now = 0;
    const dispatch = vi.fn(async ({ onLifecycle }) => {
      now = 10;
      onLifecycle("activity");
      now = 20;
      onLifecycle("generation_done");
      now = 30;
      onLifecycle("playback_stopped");
      current = false;
      return { outcome: "completed" as const };
    });
    const trial = await runPhase6SentenceTrial(prepared, {
      signal: new AbortController().signal,
      isCurrent: () => current,
      dispatch,
      now: () => now,
      hashText: async () => HASH,
    });
    expect(trial.terminal_reason).toBe("stale");
    expect(dispatch).toHaveBeenCalledOnce();
  });

  it("fails closed when lifecycle evidence is duplicate, missing, or clock-regressing", async () => {
    const prepared = await plan("single_response");
    let now = 100;
    const duplicate = await runPhase6SentenceTrial(prepared, {
      signal: new AbortController().signal,
      isCurrent: () => true,
      dispatch: async ({ onLifecycle }) => {
        now = 110;
        onLifecycle("activity");
        expect(onLifecycle("activity")).toBe(false);
        return { outcome: "completed" };
      },
      now: () => now,
      hashText: async () => HASH,
    });
    expect(duplicate.terminal_reason).toBe("response_failed");

    let calls = 0;
    await expect(runPhase6SentenceTrial(prepared, {
      signal: new AbortController().signal,
      isCurrent: () => true,
      dispatch: vi.fn(),
      now: () => (calls++ === 0 ? 100 : 99),
      hashText: async () => HASH,
    })).rejects.toThrow(/non-monotonic/u);
  });

  it("rejects malformed identity and non-SHA hash providers before dispatch exists", async () => {
    await expect(preparePhase6SentencePlan({
      experimentId: "phase-six-runner",
      runId: "runner-single-response",
      cachedLessonId: "projectile",
      stepId: "RANGE",
      script: SCRIPT,
      model: "gpt-realtime-2.1-mini",
      voice: "marin",
      browserLabel: "chrome-macos",
      mode: "single_response",
    }, async () => HASH)).rejects.toThrow(/step ID/u);
    await expect(preparePhase6SentencePlan({
      experimentId: "phase-six-runner",
      runId: "runner-single-response",
      cachedLessonId: "projectile",
      stepId: "range",
      script: SCRIPT,
      model: "gpt-realtime-2.1-mini",
      voice: "marin",
      browserLabel: "chrome-macos",
      mode: "single_response",
    }, async () => "not-a-hash")).rejects.toThrow(/SHA-256/u);
  });

  it("revalidates a mutated plan and its content hash before invoking the dispatcher", async () => {
    const prepared = await plan("per_sentence");
    const strictHash = async (value: string) => value === SCRIPT ? HASH : "c".repeat(64);
    const mutated = structuredClone(prepared);
    mutated.segments = [...mutated.segments, "A smuggled third sentence."];
    mutated.responseCallCeiling = 3;
    const dispatch = vi.fn();
    await expect(runPhase6SentenceTrial(mutated, {
      signal: new AbortController().signal,
      isCurrent: () => true,
      dispatch,
      now: () => 0,
      hashText: strictHash,
    })).rejects.toThrow(/pinned hash/u);
    expect(dispatch).not.toHaveBeenCalled();

    const relabelled = structuredClone(prepared);
    relabelled.identity.script_sha256 = "b".repeat(64);
    await expect(runPhase6SentenceTrial(relabelled, {
      signal: new AbortController().signal,
      isCurrent: () => true,
      dispatch,
      now: () => 0,
      hashText: strictHash,
    })).rejects.toThrow(/pinned hash/u);
    expect(dispatch).not.toHaveBeenCalled();
  });
});
