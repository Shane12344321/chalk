import { useCallback, useEffect, useReducer, useRef } from "react";
import { estimateNarrationDuration } from "../board/animation";
import type { NormalizedLesson } from "../board/decode";
import type { ConnectionStatus, RealtimeClient, RealtimeSemanticEvent } from "../realtime";
import {
  EMPTY_SYNC_STATE,
  fixedSyncReducer,
  type FixedSyncEvent,
  type FixedSyncState,
} from "./reducer";

const AUDIO_DRAIN_GUARD_MS = 260;

interface UseFixedLessonSyncOptions {
  lesson: NormalizedLesson;
  clientRef: React.MutableRefObject<RealtimeClient | undefined>;
  connectionStatus: ConnectionStatus;
  responseIdle: boolean;
}

export function useFixedLessonSync({
  lesson,
  clientRef,
  connectionStatus,
  responseIdle,
}: UseFixedLessonSyncOptions) {
  const requestIdRef = useRef<string>();
  if (!requestIdRef.current) requestIdRef.current = crypto.randomUUID();
  const requestId = requestIdRef.current;
  const [state, dispatch] = useReducer(fixedSyncReducer, EMPTY_SYNC_STATE);
  const stateRef = useRef(state);
  const narrationKeyRef = useRef<string>();
  const checkpointKeyRef = useRef<string>();
  const wasConnectedRef = useRef(false);
  stateRef.current = state;

  useEffect(() => {
    narrationKeyRef.current = undefined;
    checkpointKeyRef.current = undefined;
    dispatch({
      type: "LOAD",
      requestId,
      stepIds: lesson.steps.map((step) => step.id),
      checkpointStepIds: lesson.steps
        .filter((step) => step.checkpoint !== null)
        .map((step) => step.id),
    });
  }, [lesson, requestId]);

  useEffect(() => {
    if (connectionStatus === "connected") {
      wasConnectedRef.current = true;
      return;
    }
    if (
      wasConnectedRef.current &&
      [
        "TEACHING",
        "FROZEN",
        "QA",
        "CHECKPOINT_ASKING",
        "CHECKPOINT_LISTENING",
        "CHECKPOINT_FEEDBACK",
      ].includes(state.phase)
    ) {
      narrationKeyRef.current = undefined;
      checkpointKeyRef.current = undefined;
      dispatch({ type: "RESET", requestId });
    }
  }, [connectionStatus, requestId, state.phase]);

  useEffect(() => {
    if (state.phase !== "TEACHING") return;
    if (connectionStatus !== "connected" || !responseIdle) return;
    const step = lesson.steps[state.currentStepIndex];
    if (!step) return;
    const key = `${state.requestId}:${step.id}:${state.cycle}`;
    if (narrationKeyRef.current === key) return;
    narrationKeyRef.current = key;
    let cancelled = false;
    const context = correlationFor(state);
    void (async () => {
      try {
        await clientRef.current?.setInteractionGuidance(undefined);
        if (cancelled || stateRef.current.phase !== "TEACHING") return;
        clientRef.current?.requestNarration(step.script, context);
      } catch {
        narrationKeyRef.current = undefined;
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [clientRef, connectionStatus, lesson.steps, responseIdle, state]);

  useEffect(() => {
    if (state.phase !== "CHECKPOINT_ASKING") return;
    if (connectionStatus !== "connected" || !responseIdle) return;
    const step = lesson.steps[state.currentStepIndex];
    const checkpoint = step?.checkpoint;
    if (!step || !checkpoint) return;
    const key = `${state.requestId}:checkpoint:${step.id}:${state.cycle}`;
    if (checkpointKeyRef.current === key) return;
    checkpointKeyRef.current = key;
    let cancelled = false;
    const context = correlationFor(state);
    const guidance = checkpointGuidance(
      checkpoint.question,
      checkpoint.expected_gist,
    );
    void (async () => {
      try {
        await clientRef.current?.setInteractionGuidance(guidance);
        if (cancelled || stateRef.current.phase !== "CHECKPOINT_ASKING") return;
        clientRef.current?.requestCheckpointPrompt(checkpoint.question, context);
      } catch {
        checkpointKeyRef.current = undefined;
        dispatch({ type: "CHECKPOINT_FAILED", ...context });
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [clientRef, connectionStatus, lesson.steps, responseIdle, state]);

  useEffect(() => {
    if (state.phase !== "TEACHING" || !state.animationStarted || state.animationDone) return;
    const step = lesson.steps[state.currentStepIndex];
    if (!step) return;
    const duration = estimateNarrationDuration(step.script);
    const startProgress = state.currentStepProgress;
    const startedAt = performance.now();
    let frame = 0;
    const tick = (now: number) => {
      const progress = startProgress + (now - startedAt) / duration;
      dispatch(correlatedTick(state, progress));
      if (progress < 1) frame = requestAnimationFrame(tick);
    };
    frame = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frame);
  }, [lesson.steps, state]);

  const onSemanticEvent = useCallback((event: RealtimeSemanticEvent) => {
    if (event.type === "student.speech_started") {
      const current = stateRef.current;
      const stepId = current.stepIds[current.currentStepIndex];
      if (!stepId) return;
      const correlation = {
        requestId: current.requestId,
        stepId,
        cycle: current.cycle,
      };
      if (current.phase === "TEACHING") {
        try {
          clientRef.current?.expectAutomaticResponse("student_qa", correlation);
        } catch {
          return;
        }
        dispatch({ type: "STUDENT_SPEECH_STARTED", ...correlation });
        queueMicrotask(() =>
          dispatch({ type: "INTERRUPTION_COMMITTED", ...correlation }),
        );
      } else if (
        current.phase === "CHECKPOINT_ASKING" ||
        current.phase === "CHECKPOINT_LISTENING"
      ) {
        try {
          clientRef.current?.expectAutomaticResponse(
            "checkpoint_feedback",
            correlation,
          );
          dispatch({
            type: "CHECKPOINT_STUDENT_SPEECH_STARTED",
            ...correlation,
          });
        } catch {
          dispatch({ type: "CHECKPOINT_FAILED", ...correlation });
        }
      }
      return;
    }

    const correlation = event.context;
    if (event.type === "narration.activity") {
      dispatch({ type: "NARRATION_ACTIVITY", ...correlation });
    } else if (event.type === "narration.generation_done") {
      dispatch({ type: "NARRATION_DONE", ...correlation });
    } else if (event.type === "narration.playback_stopped") {
      dispatch({ type: "AUDIO_STOPPED", ...correlation });
      window.setTimeout(() => {
        dispatch({ type: "DRAIN_ELAPSED", ...correlation });
      }, AUDIO_DRAIN_GUARD_MS);
    } else if (event.type === "narration.failed") {
      narrationKeyRef.current = undefined;
      dispatch({ type: "RESET", requestId: correlation.requestId });
    } else if (event.type === "checkpoint.prompt_activity") {
      dispatch({ type: "CHECKPOINT_PROMPT_ACTIVITY", ...correlation });
    } else if (event.type === "checkpoint.prompt_generation_done") {
      dispatch({ type: "CHECKPOINT_PROMPT_DONE", ...correlation });
    } else if (event.type === "checkpoint.prompt_playback_stopped") {
      dispatch({ type: "CHECKPOINT_PROMPT_AUDIO_STOPPED", ...correlation });
      window.setTimeout(() => {
        dispatch({ type: "CHECKPOINT_PROMPT_DRAIN_ELAPSED", ...correlation });
      }, AUDIO_DRAIN_GUARD_MS);
    } else if (event.type === "checkpoint.prompt_failed") {
      checkpointKeyRef.current = undefined;
      dispatch({ type: "CHECKPOINT_FAILED", ...correlation });
    } else if (event.type === "checkpoint.feedback_activity") {
      dispatch({ type: "CHECKPOINT_FEEDBACK_ACTIVITY", ...correlation });
    } else if (event.type === "checkpoint.feedback_generation_done") {
      dispatch({ type: "CHECKPOINT_FEEDBACK_DONE", ...correlation });
    } else if (event.type === "checkpoint.feedback_playback_stopped") {
      dispatch({ type: "CHECKPOINT_FEEDBACK_AUDIO_STOPPED", ...correlation });
      window.setTimeout(() => {
        dispatch({ type: "CHECKPOINT_FEEDBACK_DRAIN_ELAPSED", ...correlation });
      }, AUDIO_DRAIN_GUARD_MS);
    }
  }, [clientRef]);

  const start = useCallback(() => {
    dispatch({ type: "START", requestId });
  }, [requestId]);

  const resume = useCallback(() => {
    const current = stateRef.current;
    const stepId = current.stepIds[current.currentStepIndex];
    if (!stepId) return;
    clientRef.current?.cancelExpectedAutomaticResponse("student_qa", {
      requestId: current.requestId,
      stepId,
      cycle: current.cycle,
    });
    dispatch({
      type: "RESUME",
      requestId: current.requestId,
      stepId,
      cycle: current.cycle,
    });
  }, [clientRef]);

  return { state, start, resume, onSemanticEvent };
}

function correlatedTick(state: FixedSyncState, progress: number): Extract<FixedSyncEvent, { type: "TICK" }> {
  return {
    type: "TICK",
    progress,
    requestId: state.requestId,
    stepId: state.stepIds[state.currentStepIndex] ?? "",
    cycle: state.cycle,
  };
}

function correlationFor(state: FixedSyncState) {
  return {
    requestId: state.requestId,
    stepId: state.stepIds[state.currentStepIndex] ?? "",
    cycle: state.cycle,
  };
}

function checkpointGuidance(question: string, expectedGist: string): string {
  return `The student is answering the checkpoint question "${question}". Expected gist: "${expectedGist}". Respond in one brief sentence: acknowledge a correct answer or gently correct an incorrect one. Do not ask another question or mention Resume.`;
}
