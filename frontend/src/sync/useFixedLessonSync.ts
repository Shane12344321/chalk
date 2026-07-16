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
  const wasConnectedRef = useRef(false);
  stateRef.current = state;

  useEffect(() => {
    narrationKeyRef.current = undefined;
    dispatch({ type: "LOAD", requestId, stepIds: lesson.steps.map((step) => step.id) });
  }, [lesson, requestId]);

  useEffect(() => {
    if (connectionStatus === "connected") {
      wasConnectedRef.current = true;
      return;
    }
    if (
      wasConnectedRef.current &&
      ["TEACHING", "FROZEN", "QA"].includes(state.phase)
    ) {
      narrationKeyRef.current = undefined;
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
    try {
      clientRef.current?.requestNarration(step.script, {
        requestId: state.requestId,
        stepId: step.id,
        cycle: state.cycle,
      });
    } catch {
      narrationKeyRef.current = undefined;
    }
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
      if (current.phase !== "TEACHING") return;
      const stepId = current.stepIds[current.currentStepIndex];
      if (!stepId) return;
      const correlation = {
        requestId: current.requestId,
        stepId,
        cycle: current.cycle,
      };
      dispatch({ type: "STUDENT_SPEECH_STARTED", ...correlation });
      queueMicrotask(() => dispatch({ type: "INTERRUPTION_COMMITTED", ...correlation }));
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
    }
  }, []);

  const start = useCallback(() => {
    dispatch({ type: "START", requestId });
  }, [requestId]);

  const resume = useCallback(() => {
    const current = stateRef.current;
    const stepId = current.stepIds[current.currentStepIndex];
    if (!stepId) return;
    dispatch({
      type: "RESUME",
      requestId: current.requestId,
      stepId,
      cycle: current.cycle,
    });
  }, []);

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
