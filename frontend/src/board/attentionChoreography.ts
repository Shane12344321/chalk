import { useCallback, useEffect, useRef, useState } from "react";
import type { LessonPhase } from "../sync/reducer";
import type { DeixisKind, DeixisOverlay } from "./overlays";

export const ATTENTION_QUEUE_LIMIT = 4;

const ACTION_DURATION_MS: Readonly<Record<DeixisKind, number>> = {
  point_at: 2_200,
  circle_el: 2_200,
  underline: 2_200,
  flash: 2_200,
  trace_path: 2_600,
  focus_on: 2_400,
};

export interface AttentionContext {
  requestId: string;
  manifestVersion: number;
  phase: LessonPhase;
  visibleElementIds: readonly string[];
  interruptionEpoch: number;
}

export type AttentionEnqueueResult =
  | { ok: true; overlayId: string }
  | {
      ok: false;
      reason: "not_in_attention_phase" | "unknown_element" | "queue_full";
    };

export interface AttentionRail {
  overlays: readonly DeixisOverlay[];
  enqueue: (kind: DeixisKind, targetId: string) => AttentionEnqueueResult;
  cancel: () => void;
}

/**
 * A bounded, browser-owned rail for temporary visual attention. It never changes
 * lesson geometry or manifest state. Actions are stamped with the exact accepted
 * lesson and manifest version that admitted them, and execute one at a time.
 */
export function useAttentionChoreography(context: AttentionContext): AttentionRail {
  const contextRef = useRef(context);
  contextRef.current = context;
  const visibleIdsFingerprint = context.visibleElementIds.join("\u0000");
  const [active, setActive] = useState<DeixisOverlay>();
  const [queued, setQueued] = useState<DeixisOverlay[]>([]);
  const activeRef = useRef<DeixisOverlay>();
  const queuedRef = useRef<DeixisOverlay[]>([]);
  activeRef.current = active;
  queuedRef.current = queued;
  const timeoutRef = useRef<number>();

  const cancel = useCallback(() => {
    if (timeoutRef.current !== undefined) window.clearTimeout(timeoutRef.current);
    timeoutRef.current = undefined;
    activeRef.current = undefined;
    queuedRef.current = [];
    setActive(undefined);
    setQueued([]);
  }, []);

  const enqueue = useCallback(
    (kind: DeixisKind, targetId: string): AttentionEnqueueResult => {
      const latest = contextRef.current;
      if (!isAttentionPhase(latest.phase)) {
        return { ok: false, reason: "not_in_attention_phase" };
      }
      if (!latest.visibleElementIds.includes(targetId)) {
        return { ok: false, reason: "unknown_element" };
      }

      const overlayId = `attention_${crypto.randomUUID()}`;
      const action: DeixisOverlay = {
        id: overlayId,
        kind,
        targetId,
        requestId: latest.requestId,
        manifestVersion: latest.manifestVersion,
        durationMs: ACTION_DURATION_MS[kind],
      };
      // The active action and waiting actions share one deliberately small
      // budget so repeated tool calls cannot turn emphasis into a light show.
      if ((activeRef.current ? 1 : 0) + queuedRef.current.length >= ATTENTION_QUEUE_LIMIT) {
        return { ok: false, reason: "queue_full" };
      }
      const next = [...queuedRef.current, action];
      queuedRef.current = next;
      setQueued(next);
      return { ok: true, overlayId };
    },
    [],
  );

  useEffect(() => {
    if (active || queued.length === 0) return;
    const [candidate, ...remaining] = queued;
    const latest = contextRef.current;
    if (!isCurrent(candidate, latest)) {
      queuedRef.current = remaining;
      setQueued(remaining);
      return;
    }
    queuedRef.current = remaining;
    activeRef.current = candidate;
    setQueued(remaining);
    setActive(candidate);
  }, [active, queued]);

  useEffect(() => {
    if (!active) return;
    timeoutRef.current = window.setTimeout(() => {
      timeoutRef.current = undefined;
      activeRef.current = undefined;
      setActive(undefined);
    }, active.durationMs);
    return () => {
      if (timeoutRef.current !== undefined) window.clearTimeout(timeoutRef.current);
      timeoutRef.current = undefined;
    };
  }, [active]);

  useEffect(() => {
    const latest = contextRef.current;
    if (active && !isCurrent(active, latest)) cancel();
  }, [
    active,
    cancel,
    context.manifestVersion,
    context.phase,
    context.requestId,
    visibleIdsFingerprint,
  ]);

  useEffect(() => {
    // A speech-start interruption is a hard transient boundary. Removing the
    // rail is deterministic and leaves permanent geometry exactly untouched.
    cancel();
  }, [cancel, context.interruptionEpoch]);

  useEffect(() => cancel, [cancel]);

  return { overlays: active ? [active] : [], enqueue, cancel };
}

export function isAttentionPhase(phase: LessonPhase): boolean {
  return phase === "QA" || phase === "CHECKPOINT_FEEDBACK";
}

function isCurrent(action: DeixisOverlay, context: AttentionContext): boolean {
  return (
    isAttentionPhase(context.phase) &&
    action.requestId === context.requestId &&
    action.manifestVersion === context.manifestVersion &&
    context.visibleElementIds.includes(action.targetId)
  );
}
