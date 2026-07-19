import { describe, expect, it } from "vitest";
import {
  EMPTY_SYNC_STATE,
  fixedSyncReducer,
  type FixedSyncEvent,
  type FixedSyncState,
} from "./reducer";

const STEP_IDS = ["s1", "s2", "s3", "s4"];

describe("fixed lesson sync reducer", () => {
  it("waits for animation, generation, playback stop, and drain before advancing", () => {
    let state = startState();
    state = send(state, { type: "NARRATION_ACTIVITY" });
    state = send(state, { type: "NARRATION_DONE" });
    state = send(state, { type: "AUDIO_STOPPED" });
    state = send(state, { type: "DRAIN_ELAPSED" });
    expect(state.currentStepIndex).toBe(0);
    state = send(state, { type: "TICK", progress: 1 });
    expect(state).toMatchObject({ phase: "TEACHING", currentStepIndex: 1, currentStepProgress: 0 });
  });

  it("freezes partial ink, resumes it, and rejects the prior narration cycle", () => {
    let state = startState();
    state = send(state, { type: "NARRATION_ACTIVITY" });
    state = send(state, { type: "TICK", progress: 0.42 });
    const oldCycle = state.cycle;
    state = send(state, { type: "STUDENT_SPEECH_STARTED" });
    expect(state).toMatchObject({ phase: "FROZEN", currentStepProgress: 0.42 });
    state = send(state, { type: "INTERRUPTION_COMMITTED" });
    expect(state.phase).toBe("QA");
    state = send(state, { type: "RESUME" });
    expect(state).toMatchObject({ phase: "TEACHING", currentStepProgress: 0.42, cycle: oldCycle + 1 });

    const ignoredBefore = state.ignoredEvents;
    state = fixedSyncReducer(state, {
      type: "NARRATION_DONE",
      requestId: state.requestId,
      stepId: "s1",
      cycle: oldCycle,
    });
    expect(state.narrationDone).toBe(false);
    expect(state.ignoredEvents).toBe(ignoredBefore + 1);
  });

  it("retains monotonic bounded transcript progress without starting ink", () => {
    let state = startState();
    state = send(state, { type: "NARRATION_PROGRESS", progress: 0.6 });
    state = send(state, { type: "NARRATION_PROGRESS", progress: 0.4 });
    expect(state).toMatchObject({
      transcriptProgress: 0.6,
      animationStarted: false,
      currentStepProgress: 0,
    });
    state = send(state, { type: "NARRATION_PROGRESS", progress: 4 });
    expect(state.transcriptProgress).toBe(1);
  });

  it("recovers a missed playback-start event when playback stop is observed", () => {
    let state = startState();
    state = send(state, { type: "AUDIO_STOPPED" });
    expect(state).toMatchObject({
      animationStarted: true,
      audioStopped: true,
      currentStepProgress: 0,
    });
  });

  it("records three consecutive deterministic four-step runs", () => {
    let state = startState();
    for (let run = 0; run < 3; run += 1) {
      for (const stepId of STEP_IDS) {
        expect(state.stepIds[state.currentStepIndex]).toBe(stepId);
        state = finishCurrentStep(state);
      }
      expect(state).toMatchObject({
        phase: "DONE",
        currentStepIndex: 3,
        currentStepProgress: 1,
        completedRuns: run + 1,
      });
      if (run < 2) {
        state = fixedSyncReducer(state, { type: "START", requestId: state.requestId });
      }
    }
  });

  it("asks one checkpoint, listens, gives feedback, then advances", () => {
    let state = startState("request-1", ["s2"]);
    state = finishCurrentStep(state);
    expect(state.stepIds[state.currentStepIndex]).toBe("s2");
    state = finishCurrentStep(state);
    expect(state).toMatchObject({
      phase: "CHECKPOINT_ASKING",
      currentStepIndex: 1,
    });

    state = send(state, { type: "CHECKPOINT_PROMPT_ACTIVITY" });
    state = send(state, { type: "CHECKPOINT_PROMPT_DONE" });
    state = send(state, { type: "CHECKPOINT_PROMPT_AUDIO_STOPPED" });
    state = send(state, { type: "CHECKPOINT_PROMPT_DRAIN_ELAPSED" });
    expect(state.phase).toBe("CHECKPOINT_LISTENING");

    state = send(state, { type: "CHECKPOINT_STUDENT_SPEECH_STARTED" });
    expect(state.phase).toBe("CHECKPOINT_FEEDBACK");
    state = send(state, { type: "CHECKPOINT_FEEDBACK_ACTIVITY" });
    state = send(state, { type: "CHECKPOINT_FEEDBACK_DONE" });
    state = send(state, { type: "CHECKPOINT_FEEDBACK_AUDIO_STOPPED" });
    state = send(state, { type: "CHECKPOINT_FEEDBACK_DRAIN_ELAPSED" });
    expect(state).toMatchObject({
      phase: "TEACHING",
      currentStepIndex: 2,
      completedCheckpointStepIds: ["s2"],
    });
  });

  it("accepts an answer that starts before the checkpoint prompt fully settles", () => {
    let state = startState("request-1", ["s1"]);
    state = finishCurrentStep(state);
    expect(state.phase).toBe("CHECKPOINT_ASKING");
    state = send(state, { type: "CHECKPOINT_STUDENT_SPEECH_STARTED" });
    expect(state.phase).toBe("CHECKPOINT_FEEDBACK");
  });

  it("advances cleanly when checkpoint feedback fails", () => {
    let state = startState("request-1", ["s1"]);
    state = finishCurrentStep(state);
    state = send(state, { type: "CHECKPOINT_STUDENT_SPEECH_STARTED" });
    expect(state.phase).toBe("CHECKPOINT_FEEDBACK");

    state = send(state, { type: "CHECKPOINT_FAILED" });

    expect(state).toMatchObject({
      phase: "TEACHING",
      currentStepIndex: 1,
      completedCheckpointStepIds: ["s1"],
    });
  });

  it("retries one failed checkpoint prompt without entering listening", () => {
    let state = startState("request-1", ["s1"]);
    state = finishCurrentStep(state);
    expect(state.phase).toBe("CHECKPOINT_ASKING");
    const firstCycle = state.cycle;

    state = send(state, { type: "CHECKPOINT_FAILED" });
    expect(state).toMatchObject({
      phase: "CHECKPOINT_ASKING",
      checkpointPromptFailures: 1,
      cycle: firstCycle + 1,
    });

    state = send(state, { type: "CHECKPOINT_FAILED" });
    expect(state).toMatchObject({
      phase: "TEACHING",
      currentStepIndex: 1,
      completedCheckpointStepIds: ["s1"],
    });
  });

  it("ignores stale request and step events", () => {
    const state = startState();
    const stale = fixedSyncReducer(state, {
      type: "NARRATION_ACTIVITY",
      requestId: "old-request",
      stepId: "s4",
      cycle: state.cycle,
    });
    expect(stale.animationStarted).toBe(false);
    expect(stale.ignoredEvents).toBe(1);
  });

  it("creates a clean request boundary when Q&A switches topic", () => {
    let state = startState();
    state = send(state, { type: "STUDENT_SPEECH_STARTED" });
    state = send(state, { type: "INTERRUPTION_COMMITTED" });
    const oldCycle = state.cycle;

    state = fixedSyncReducer(state, {
      type: "NEW_TOPIC",
      requestId: "request-2",
    });
    expect(state).toMatchObject({
      phase: "GENERATING",
      requestId: "request-2",
      stepIds: [],
      currentStepProgress: 0,
      sourceComplete: false,
    });

    const stale = fixedSyncReducer(state, {
      type: "NARRATION_DONE",
      requestId: "request-1",
      stepId: "s1",
      cycle: oldCycle,
    });
    expect(stale.narrationDone).toBe(false);
    expect(stale.ignoredEvents).toBe(1);
  });

  it("waits for streamed steps and resumes when the next accepted step arrives", () => {
    const requestId = "request-live";
    let state = fixedSyncReducer(EMPTY_SYNC_STATE, {
      type: "LOAD",
      requestId,
      stepIds: ["s1"],
      checkpointStepIds: [],
      sourceComplete: false,
    });
    state = fixedSyncReducer(state, { type: "START", requestId });
    state = finishCurrentStep(state);
    expect(state).toMatchObject({ phase: "GENERATING", currentStepIndex: 0 });

    state = fixedSyncReducer(state, {
      type: "APPEND_STEPS",
      requestId,
      stepIds: ["s1", "s2"],
      checkpointStepIds: [],
    });
    expect(state).toMatchObject({ phase: "TEACHING", currentStepIndex: 1 });
    state = finishCurrentStep(state);
    expect(state.phase).toBe("GENERATING");

    state = fixedSyncReducer(state, { type: "SOURCE_DONE", requestId });
    expect(state).toMatchObject({ phase: "DONE", completedRuns: 1 });
  });
});

function startState(
  requestId = "request-1",
  checkpointStepIds: string[] = [],
): FixedSyncState {
  const loaded = fixedSyncReducer(EMPTY_SYNC_STATE, {
    type: "LOAD",
    requestId,
    stepIds: STEP_IDS,
    checkpointStepIds,
    sourceComplete: true,
  });
  return fixedSyncReducer(loaded, { type: "START", requestId });
}

function finishCurrentStep(state: FixedSyncState): FixedSyncState {
  state = send(state, { type: "NARRATION_ACTIVITY" });
  state = send(state, { type: "TICK", progress: 1 });
  state = send(state, { type: "NARRATION_DONE" });
  state = send(state, { type: "AUDIO_STOPPED" });
  return send(state, { type: "DRAIN_ELAPSED" });
}

function send(
  state: FixedSyncState,
  event: { type: CorrelatedType; progress?: number },
): FixedSyncState {
  const correlated = {
    ...event,
    requestId: state.requestId,
    stepId: state.stepIds[state.currentStepIndex],
    cycle: state.cycle,
  } as FixedSyncEvent;
  return fixedSyncReducer(state, correlated);
}

type CorrelatedType = Exclude<
  FixedSyncEvent["type"],
  "NEW_TOPIC" | "LOAD" | "APPEND_STEPS" | "SOURCE_DONE" | "START" | "RESET"
>;
