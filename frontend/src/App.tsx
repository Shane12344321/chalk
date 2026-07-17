import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import projectileLessonSource from "../../demo/cached_lessons/projectile-range.lesson.json";
import derivativeLessonSource from "../../demo/cached_lessons/derivative-slope.lesson.json";
import unitCircleLessonSource from "../../demo/cached_lessons/unit-circle-sine.lesson.json";
import { AnnotationClient, type AnnotationOp } from "./annotations";
import { Board } from "./board/Board";
import { decodeLesson } from "./board/decode";
import { buildBoardManifest } from "./board/manifest";
import type { VisibleBoardState } from "./board/manifest";
import type { DeixisKind, DeixisOverlay } from "./board/overlays";
import { isLessonProgram } from "./board/schema";
import type { NormalizedLesson } from "./board/decode";
import { isSpaceToSpeakEvent } from "./voiceShortcut";
import {
  decodeLessonNdjson,
  LessonStreamClient,
  type LessonStreamProgress,
} from "./lessonStream";
import {
  getOrCreateClientId,
  manifestHash,
  RealtimeClient,
  resolveLocalApiBaseUrl,
  serializeRedactedTrace,
} from "./realtime";
import type {
  PerceivedAudioStop,
  RealtimeSemanticEvent,
  RealtimeSnapshot,
  TraceEntry,
} from "./realtime";
import { useFixedLessonSync } from "./sync/useFixedLessonSync";

const API_BASE_URL = resolveLocalApiBaseUrl(import.meta.env.VITE_API_BASE_URL);
const CHALK_MODE =
  import.meta.env.VITE_CHALK_MODE === "diagnostics" ? "diagnostics" : "demo";

const INITIAL_SNAPSHOT: RealtimeSnapshot = {
  status: "disconnected",
  audioPlaybackActive: false,
  microphoneEnabled: false,
  trace: [],
  interruptions: [],
  consecutiveSuccessfulInterruptions: 0,
  toolRoundTrips: 0,
  tokenUsage: {
    total_tokens: 0,
    input_tokens: 0,
    output_tokens: 0,
    cached_input_tokens: 0,
    input_audio_tokens: 0,
    output_audio_tokens: 0,
  },
  tokenBudget: 20_000,
  contextPublications: [],
};

function checkedCachedLesson(source: unknown, name: string): NormalizedLesson {
  const result = decodeLesson(source);
  if (!isLessonProgram(source) || !result.lesson || result.warnings.length > 0) {
    throw new Error(`The checked-in ${name} lesson did not pass its shared contract.`);
  }
  return result.lesson;
}

const PROJECTILE_LESSON = checkedCachedLesson(projectileLessonSource, "projectile");
const CACHED_LESSONS = {
  projectile: PROJECTILE_LESSON,
  derivative: checkedCachedLesson(derivativeLessonSource, "derivative"),
  "unit-circle": checkedCachedLesson(unitCircleLessonSource, "unit-circle"),
} as const;
type CachedLessonKey = keyof typeof CACHED_LESSONS;
const EMPTY_PROJECTILE_MANIFEST = buildBoardManifest(PROJECTILE_LESSON.title, []);
const EMPTY_VISIBLE_BOARD: VisibleBoardState = {
  version: 0,
  manifest: EMPTY_PROJECTILE_MANIFEST,
  elements: [],
  fingerprint: JSON.stringify([EMPTY_PROJECTILE_MANIFEST, []]),
};

interface M3GenerationTiming {
  requestId: string;
  requestedAtMs: number;
  firstValidStepAtMs?: number;
  firstVisibleInkAtMs?: number;
  boardModel?: string;
  boardReasoningEffort?: string;
  boardPromptSha256?: string;
  repairPromptSha256?: string;
  acceptedSteps?: number;
  repairs?: number;
  droppedSteps?: number;
  partial?: boolean;
}

function App() {
  const isDiagnostics = CHALK_MODE === "diagnostics";
  const clientIdRef = useRef<string>();
  if (!clientIdRef.current) clientIdRef.current = getOrCreateClientId();
  const cachedRequestIdRef = useRef<string>();
  if (!cachedRequestIdRef.current) cachedRequestIdRef.current = crypto.randomUUID();
  const clientRef = useRef<RealtimeClient>();
  const lessonStreamRef = useRef<LessonStreamClient>();
  if (!lessonStreamRef.current) {
    lessonStreamRef.current = new LessonStreamClient(API_BASE_URL, clientIdRef.current);
  }
  const annotationClientRef = useRef<AnnotationClient>();
  if (!annotationClientRef.current) {
    annotationClientRef.current = new AnnotationClient(API_BASE_URL, clientIdRef.current);
  }
  const semanticHandlerRef = useRef<(event: RealtimeSemanticEvent) => void>();
  const generationTimingRef = useRef<M3GenerationTiming>();
  const teachHandlerRef = useRef<
    (topic: string, studentContext: string) => { requestId: string }
  >();
  const [snapshot, setSnapshot] = useState(INITIAL_SNAPSHOT);
  const [boardManifest, setBoardManifest] = useState(EMPTY_PROJECTILE_MANIFEST);
  const visibleBoardRef = useRef(EMPTY_VISIBLE_BOARD);
  const [deixisOverlays, setDeixisOverlays] = useState<DeixisOverlay[]>([]);
  const [annotationOps, setAnnotationOps] = useState<AnnotationOp[]>([]);
  const overlayTimeoutsRef = useRef(new Map<string, number>());
  const [topic, setTopic] = useState("Derivative as slope at a point");
  const [cachedLessonKey, setCachedLessonKey] = useState<CachedLessonKey>("projectile");
  const [activeLesson, setActiveLesson] = useState<{
    lesson: NormalizedLesson;
    requestId: string;
    complete: boolean;
    source: "cached" | "live" | "review";
  }>({
    lesson: PROJECTILE_LESSON,
    requestId: cachedRequestIdRef.current,
    complete: true,
    source: "cached",
  });
  const [generation, setGeneration] = useState<{
    status: "idle" | "generating" | "ready" | "fallback";
    message?: string;
    warnings: number;
    repairs: number;
    droppedSteps: number;
  }>({ status: "idle", warnings: 0, repairs: 0, droppedSteps: 0 });
  const [autoStartRequestId, setAutoStartRequestId] = useState<string>();
  const [contextError, setContextError] = useState<string>();
  const [copyState, setCopyState] = useState<"idle" | "copied" | "failed">(
    "idle",
  );
  const [m3CopyState, setM3CopyState] = useState<"idle" | "copied" | "failed">(
    "idle",
  );
  const [generationTiming, setGenerationTiming] = useState<M3GenerationTiming>();
  const [reviewStepIndex, setReviewStepIndex] = useState(0);
  const lessonSync = useFixedLessonSync({
    lesson: activeLesson.lesson,
    lessonRequestId: activeLesson.requestId,
    lessonComplete: activeLesson.complete,
    clientRef,
    connectionStatus: snapshot.status,
    responseIdle: !snapshot.activeResponseId && !snapshot.audioPlaybackActive,
  });
  semanticHandlerRef.current = lessonSync.onSemanticEvent;

  const clearDeixisOverlays = useCallback(() => {
    for (const timeout of overlayTimeoutsRef.current.values()) {
      window.clearTimeout(timeout);
    }
    overlayTimeoutsRef.current.clear();
    setDeixisOverlays([]);
  }, []);

  const handleVisibleStateChange = useCallback((state: VisibleBoardState) => {
    visibleBoardRef.current = state;
    setBoardManifest(state.manifest);
  }, []);

  const showDeixis = useCallback(
    (kind: DeixisKind, elementId: string): { overlayId: string } | undefined => {
      if (!visibleBoardRef.current.elements.some((element) => element.id === elementId)) {
        return undefined;
      }
      const overlayId = `overlay_${crypto.randomUUID()}`;
      setDeixisOverlays((current) => [
        ...current.slice(-7),
        { id: overlayId, kind, targetId: elementId },
      ]);
      const timeout = window.setTimeout(() => {
        setDeixisOverlays((current) => current.filter((item) => item.id !== overlayId));
        overlayTimeoutsRef.current.delete(overlayId);
      }, 2_200);
      overlayTimeoutsRef.current.set(overlayId, timeout);
      return { overlayId };
    },
    [],
  );

  const clearAnnotations = useCallback(() => {
    annotationClientRef.current?.cancel();
    setAnnotationOps([]);
  }, []);

  const requestAnnotation = useCallback((question: string) => {
    const visible = visibleBoardRef.current;
    if (visible.elements.length === 0) return undefined;
    const requestId = crypto.randomUUID();
    void annotationClientRef.current
      ?.start({
        requestId,
        manifestVersion: visible.version,
        question,
        boardManifest: visible.manifest,
        visibleElementIds: visible.elements.map((element) => element.id),
      })
      .then((result) => {
        if (visibleBoardRef.current.version !== result.program.manifest_version) return;
        setAnnotationOps([...result.program.ops]);
      })
      .catch((error: unknown) => {
        if (error instanceof DOMException && error.name === "AbortError") return;
        setContextError(
          "Explanatory ink was unavailable; Chalk can continue with the visible board.",
        );
      });
    return { requestId };
  }, []);

  useEffect(() => {
    const client = new RealtimeClient({
      apiBaseUrl: API_BASE_URL,
      clientId: clientIdRef.current!,
      mode: CHALK_MODE,
      callbacks: {
        onSnapshot: setSnapshot,
        onSemanticEvent: (event) => semanticHandlerRef.current?.(event),
        onTeachRequested: (requestedTopic, studentContext) => {
          const handler = teachHandlerRef.current;
          if (!handler) throw new Error("Lesson generation is not ready.");
          return handler(requestedTopic, studentContext);
        },
        onDeixisRequested: showDeixis,
        onAnnotateRequested: requestAnnotation,
      },
    });
    clientRef.current = client;
    void client.setBoardContext(EMPTY_PROJECTILE_MANIFEST);
    return () => {
      clientRef.current = undefined;
      lessonStreamRef.current?.cancel();
      clearDeixisOverlays();
      clearAnnotations();
      void client.disconnect();
    };
  }, [clearAnnotations, clearDeixisOverlays, requestAnnotation, showDeixis]);

  useEffect(() => {
    clearDeixisOverlays();
    clearAnnotations();
  }, [activeLesson.requestId, clearAnnotations, clearDeixisOverlays]);

  useEffect(() => {
    const client = clientRef.current;
    if (!client) return;
    void client
      .setBoardContext(boardManifest)
      .then(() => setContextError(undefined))
      .catch(() =>
        setContextError(
          "The latest board grounding update failed; Chalk may use the previous visible state.",
        ),
      );
  }, [boardManifest, snapshot.status]);

  const isBusy = !["disconnected", "connected", "error"].includes(
    snapshot.status,
  );
  const canConnect = snapshot.status === "disconnected" || snapshot.status === "error";
  const canDisconnect =
    snapshot.status !== "disconnected" && snapshot.status !== "disconnecting";
  const recentTrace = useMemo(() => snapshot.trace.slice(-30).reverse(), [snapshot.trace]);
  const activeCheckpoint =
    activeLesson.lesson.steps[lessonSync.state.currentStepIndex]?.checkpoint;
  const visibleManifestHash = manifestHash(boardManifest);
  const isOfflineCachedPreview =
    activeLesson.source === "cached" &&
    snapshot.status === "disconnected" &&
    lessonSync.state.phase === "IDLE";

  useEffect(() => {
    if (
      !autoStartRequestId ||
      autoStartRequestId !== activeLesson.requestId ||
      lessonSync.state.requestId !== activeLesson.requestId ||
      lessonSync.state.phase !== "IDLE" ||
      snapshot.status !== "connected" ||
      snapshot.activeResponseId ||
      snapshot.audioPlaybackActive
    ) {
      return;
    }
    const emptyManifest = buildBoardManifest(activeLesson.lesson.title, []);
    void clientRef.current
      ?.setBoardContext(emptyManifest)
      .then(() => {
        setContextError(undefined);
        setAutoStartRequestId(undefined);
        lessonSync.start();
      })
      .catch(() => {
        setContextError(
          "Chalk could not reset its board grounding. Disconnect and reconnect before retrying.",
        );
      });
  }, [
    activeLesson,
    autoStartRequestId,
    lessonSync,
    snapshot.activeResponseId,
    snapshot.audioPlaybackActive,
    snapshot.status,
  ]);

  const connect = () => {
    setCopyState("idle");
    void clientRef.current?.connect().catch(() => {
      // The client publishes a redacted, user-facing error in its snapshot.
    });
  };

  const disconnect = () => {
    clearDeixisOverlays();
    clearAnnotations();
    void clientRef.current?.disconnect();
  };

  const toggleMicrophone = () => {
    try {
      clientRef.current?.setMicrophoneEnabled(!snapshot.microphoneEnabled);
    } catch {
      // Connection errors are already represented by the client snapshot.
    }
  };

  useEffect(() => {
    const startSpeakingFromSpace = (event: KeyboardEvent) => {
      if (
        snapshot.status !== "connected" ||
        snapshot.microphoneEnabled ||
        !isSpaceToSpeakEvent(event)
      ) {
        return;
      }
      event.preventDefault();
      try {
        clientRef.current?.setMicrophoneEnabled(true);
      } catch {
        // Connection errors are already represented by the client snapshot.
      }
    };
    window.addEventListener("keydown", startSpeakingFromSpace);
    return () => window.removeEventListener("keydown", startSpeakingFromSpace);
  }, [snapshot.microphoneEnabled, snapshot.status]);

  const startLesson = () => {
    const client = clientRef.current;
    if (!client) return;
    clearAnnotations();
    void client
      .setBoardContext(buildBoardManifest(activeLesson.lesson.title, []))
      .then(() => {
        setContextError(undefined);
        lessonSync.start();
      })
      .catch(() =>
        setContextError(
          "Chalk could not reset its board grounding. Disconnect and reconnect before retrying.",
        ),
      );
  };

  const resumeLesson = () => {
    clearDeixisOverlays();
    clearAnnotations();
    lessonSync.resume();
  };

  const generateLesson = (requestedTopic: string, studentContext = ""): string => {
    const normalizedTopic = requestedTopic.trim();
    if (!normalizedTopic) throw new Error("Enter a math or physics topic first.");
    clearDeixisOverlays();
    clearAnnotations();
    const requestId = crypto.randomUUID();
    const timing = { requestId, requestedAtMs: performance.now() };
    generationTimingRef.current = timing;
    setGenerationTiming(timing);
    setM3CopyState("idle");
    setGeneration({ status: "generating", warnings: 0, repairs: 0, droppedSteps: 0 });
    setAutoStartRequestId(requestId);
    void lessonStreamRef.current
      ?.start(
        {
          requestId,
          topic: normalizedTopic,
          studentContext,
          boardState: boardManifest,
        },
        (progress: LessonStreamProgress) => {
          if (progress.steps.length === 0) return;
          const currentTiming = generationTimingRef.current;
          if (
            currentTiming?.requestId === progress.requestId &&
            currentTiming.firstValidStepAtMs === undefined
          ) {
            const updatedTiming = {
              ...currentTiming,
              firstValidStepAtMs: performance.now(),
              ...(progress.boardModel ? { boardModel: progress.boardModel } : {}),
              ...(progress.boardReasoningEffort
                ? { boardReasoningEffort: progress.boardReasoningEffort }
                : {}),
              ...(progress.boardPromptSha256
                ? { boardPromptSha256: progress.boardPromptSha256 }
                : {}),
              ...(progress.repairPromptSha256
                ? { repairPromptSha256: progress.repairPromptSha256 }
                : {}),
            };
            generationTimingRef.current = updatedTiming;
            setGenerationTiming(updatedTiming);
          }
          setActiveLesson({
            lesson: {
              schemaVersion: "1.0",
              title: progress.title,
              steps: progress.steps,
            },
            requestId: progress.requestId,
            complete: progress.complete,
            source: "live",
          });
          setGeneration((current) => ({
            ...current,
            status: progress.complete ? "ready" : "generating",
            warnings: progress.warnings,
          }));
        },
      )
      .then((result) => {
        const currentTiming = generationTimingRef.current;
        if (currentTiming?.requestId === result.requestId) {
          const updatedTiming = {
            ...currentTiming,
            ...(result.boardModel ? { boardModel: result.boardModel } : {}),
            ...(result.boardReasoningEffort
              ? { boardReasoningEffort: result.boardReasoningEffort }
              : {}),
            ...(result.boardPromptSha256
              ? { boardPromptSha256: result.boardPromptSha256 }
              : {}),
            ...(result.repairPromptSha256
              ? { repairPromptSha256: result.repairPromptSha256 }
              : {}),
            acceptedSteps: result.steps.length,
            repairs: result.repairs,
            droppedSteps: result.droppedSteps,
            partial: result.partial,
          };
          generationTimingRef.current = updatedTiming;
          setGenerationTiming(updatedTiming);
        }
        setActiveLesson({
          lesson: result.lesson,
          requestId: result.requestId,
          complete: true,
          source: "live",
        });
        setGeneration({
          status: "ready",
          ...(result.partial
            ? { message: "Generation ended early; Chalk is continuing with the accepted validated steps." }
            : {}),
          warnings: result.warnings,
          repairs: result.repairs,
          droppedSteps: result.droppedSteps,
        });
      })
      .catch((error: unknown) => {
        if (error instanceof DOMException && error.name === "AbortError") return;
        const fallbackRequestId = crypto.randomUUID();
        setActiveLesson({
          lesson: PROJECTILE_LESSON,
          requestId: fallbackRequestId,
          complete: true,
          source: "cached",
        });
        setAutoStartRequestId(fallbackRequestId);
        setGeneration({
          status: "fallback",
          message: "Live generation was unavailable, so Chalk loaded the validated cached lesson.",
          warnings: 0,
          repairs: 0,
          droppedSteps: 0,
        });
      });
    return requestId;
  };

  const useCachedLesson = () => {
    lessonStreamRef.current?.cancel();
    const requestId = crypto.randomUUID();
    setActiveLesson({
      lesson: CACHED_LESSONS[cachedLessonKey],
      requestId,
      complete: true,
      source: "cached",
    });
    setGeneration({ status: "idle", warnings: 0, repairs: 0, droppedSteps: 0 });
    generationTimingRef.current = undefined;
    setGenerationTiming(undefined);
    setM3CopyState("idle");
    setAutoStartRequestId(requestId);
  };

  const reviewCapturedLesson = async (file: File | undefined) => {
    if (!file) return;
    try {
      const result = decodeLessonNdjson(await file.text());
      lessonStreamRef.current?.cancel();
      generationTimingRef.current = undefined;
      setGenerationTiming(undefined);
      setActiveLesson({
        lesson: result.lesson,
        requestId: result.requestId,
        complete: true,
        source: "review",
      });
      setReviewStepIndex(result.lesson.steps.length - 1);
      setAutoStartRequestId(undefined);
      setGeneration({
        status: "ready",
        message: "Captured validated lesson loaded locally for layout review; no API call was made.",
        warnings: result.warnings,
        repairs: result.repairs,
        droppedSteps: result.droppedSteps,
      });
    } catch {
      setGeneration((current) => ({
        ...current,
        message: "The captured lesson failed local stream or lesson validation.",
      }));
    }
  };

  teachHandlerRef.current = (requestedTopic, studentContext) => {
    if (
      snapshot.status !== "connected" ||
      generation.status === "generating" ||
      !["IDLE", "DONE"].includes(lessonSync.state.phase)
    ) {
      throw new Error("A lesson is already active.");
    }
    return { requestId: generateLesson(requestedTopic, studentContext) };
  };

  const copyTrace = async () => {
    try {
      await navigator.clipboard.writeText(
        serializeRedactedTrace(snapshot.trace, snapshot.interruptions, {
          model: snapshot.sessionModel,
          voice: snapshot.sessionVoice,
          browser: navigator.userAgent,
          tokenUsage: snapshot.tokenUsage,
          tokenBudget: snapshot.tokenBudget,
          contextPublications: snapshot.contextPublications,
          visibleManifestHash,
          lastAcknowledgedManifestHash: snapshot.lastAcknowledgedManifestHash,
        }),
      );
      setCopyState("copied");
    } catch {
      setCopyState("failed");
    }
  };

  const recordFirstVisibleInk = useCallback(
    (measurementId: string, observedAtMs: number) => {
      const currentTiming = generationTimingRef.current;
      if (
        currentTiming?.requestId !== measurementId ||
        currentTiming.firstVisibleInkAtMs !== undefined
      ) {
        return;
      }
      const updatedTiming = { ...currentTiming, firstVisibleInkAtMs: observedAtMs };
      generationTimingRef.current = updatedTiming;
      setGenerationTiming(updatedTiming);
    },
    [],
  );

  const copyM3Timing = async () => {
    if (!generationTiming) return;
    const firstStepMs = elapsed(
      generationTiming.requestedAtMs,
      generationTiming.firstValidStepAtMs,
    );
    const firstVisibleMs = elapsed(
      generationTiming.requestedAtMs,
      generationTiming.firstVisibleInkAtMs,
    );
    const stepToInkMs = elapsed(
      generationTiming.firstValidStepAtMs,
      generationTiming.firstVisibleInkAtMs,
    );
    try {
      await navigator.clipboard.writeText(
        JSON.stringify(
          {
            schema: "chalk.m3-browser-timing.v1",
            generated_at: new Date().toISOString(),
            request_id_suffix: generationTiming.requestId.slice(-8),
            board_model: generationTiming.boardModel ?? null,
            board_reasoning_effort: generationTiming.boardReasoningEffort ?? null,
            board_prompt_sha256: generationTiming.boardPromptSha256 ?? null,
            repair_prompt_sha256: generationTiming.repairPromptSha256 ?? null,
            request_to_first_valid_step_ms: firstStepMs,
            first_valid_step_to_first_visible_ink_ms: stepToInkMs,
            request_to_first_visible_ink_ms: firstVisibleMs,
            accepted_steps: generationTiming.acceptedSteps ?? null,
            repairs: generationTiming.repairs ?? null,
            dropped_steps: generationTiming.droppedSteps ?? null,
            partial: generationTiming.partial ?? null,
          },
          null,
          2,
        ),
      );
      setM3CopyState("copied");
    } catch {
      setM3CopyState("failed");
    }
  };

  const setPerceivedStop = (markerId: string, value: PerceivedAudioStop) => {
    clientRef.current?.updatePerceivedAudioStop(markerId, value);
  };

  return (
    <main className="app-shell">
      <header className="hero">
        <div>
          <p className="eyebrow">
            {isDiagnostics ? "Diagnostics · deterministic board" : "Live visual tutoring"}
          </p>
          <h1>CHALK</h1>
          <p className="tagline">A tutor that draws while it talks—and stops when you do.</p>
        </div>
        <StatusPill status={snapshot.status} />
      </header>

      <section className="lesson-stage" aria-labelledby="lesson-title">
        <form
          className="topic-form"
          onSubmit={(event) => {
            event.preventDefault();
            try {
              generateLesson(topic);
            } catch (error) {
              setGeneration({
                status: "fallback",
                message: error instanceof Error ? error.message : "Enter a valid topic.",
                warnings: 0,
                repairs: 0,
                droppedSteps: 0,
              });
            }
          }}
        >
          <label htmlFor="lesson-topic">What should Chalk teach?</label>
          <div>
            <input
              id="lesson-topic"
              value={topic}
              maxLength={80}
              onChange={(event) => setTopic(event.target.value)}
              placeholder="A math or physics topic"
            />
            <button
              className="primary"
              type="submit"
              disabled={
                snapshot.status !== "connected" ||
                generation.status === "generating" ||
                !["IDLE", "DONE"].includes(lessonSync.state.phase) ||
                Boolean(snapshot.activeResponseId) ||
                snapshot.audioPlaybackActive
              }
            >
              {generation.status === "generating" ? "Preparing lesson…" : "Generate & teach"}
            </button>
            <button
              className="secondary"
              type="button"
              onClick={useCachedLesson}
            >
              Load cached lesson
            </button>
            <select
              aria-label="Cached lesson"
              value={cachedLessonKey}
              onChange={(event) => setCachedLessonKey(event.target.value as CachedLessonKey)}
            >
              <option value="projectile">Projectile range</option>
              <option value="derivative">Derivative as slope</option>
              <option value="unit-circle">Unit circle to sine</option>
            </select>
          </div>
          {generation.message ? <p role="status">{generation.message}</p> : null}
        </form>
        <div className="lesson-heading">
          <div>
            <p className="eyebrow">
              {isDiagnostics
                ? `${activeLesson.source} lesson · ${activeLesson.complete ? "complete" : "streaming"}`
                : activeLesson.source === "live"
                  ? "Live generated lesson"
                  : "Interactive cached lesson"}
            </p>
            <h2 id="lesson-title">{activeLesson.lesson.title}</h2>
          </div>
          <div className="lesson-actions">
            <button
              className="primary"
              type="button"
              onClick={startLesson}
              disabled={snapshot.status !== "connected" || !["IDLE", "DONE"].includes(lessonSync.state.phase)}
            >
              {lessonSync.state.phase === "DONE" ? "Replay current lesson" : "Start current lesson"}
            </button>
            <button
              className="secondary"
              type="button"
              onClick={resumeLesson}
              disabled={
                lessonSync.state.phase !== "QA" ||
                snapshot.status !== "connected" ||
                Boolean(snapshot.activeResponseId) ||
                snapshot.audioPlaybackActive
              }
            >
              Resume frozen step
            </button>
          </div>
        </div>
        <Board
          lesson={activeLesson.lesson}
          currentStepIndex={
            activeLesson.source === "review"
              ? reviewStepIndex
              : isOfflineCachedPreview
                ? activeLesson.lesson.steps.length - 1
              : lessonSync.state.currentStepIndex
          }
          currentStepProgress={
            activeLesson.source === "review" || isOfflineCachedPreview
              ? 1
              : lessonSync.state.currentStepProgress
          }
          phase={
            activeLesson.source === "review"
              ? "REVIEW"
              : isOfflineCachedPreview
                ? "PREVIEW"
                : lessonSync.state.phase
          }
          onVisibleStateChange={handleVisibleStateChange}
          overlays={deixisOverlays}
          annotations={annotationOps}
          measurementId={activeLesson.source === "live" ? activeLesson.requestId : undefined}
          onFirstVisibleInk={recordFirstVisibleInk}
        />
        {isDiagnostics && activeLesson.source === "review" ? (
          <div className="review-controls" aria-label="Captured lesson review controls">
            <button
              className="secondary"
              type="button"
              onClick={() => setReviewStepIndex((index) => Math.max(0, index - 1))}
              disabled={reviewStepIndex === 0}
            >
              Previous step
            </button>
            <span>
              Showing through step {reviewStepIndex + 1} / {activeLesson.lesson.steps.length}
            </span>
            <button
              className="secondary"
              type="button"
              onClick={() =>
                setReviewStepIndex((index) =>
                  Math.min(activeLesson.lesson.steps.length - 1, index + 1),
                )
              }
              disabled={reviewStepIndex >= activeLesson.lesson.steps.length - 1}
            >
              Next step
            </button>
          </div>
        ) : null}
        {contextError ? <p className="error" role="alert">{contextError}</p> : null}
        {isDiagnostics && activeLesson.source === "live" ? (
          <div className="stream-note">
            <span>
              {activeLesson.lesson.steps.length} accepted step{activeLesson.lesson.steps.length === 1 ? "" : "s"}
              {activeLesson.complete ? " · stream complete" : " · more steps may arrive"}
              {generation.repairs ? ` · ${generation.repairs} repairs` : ""}
              {generation.droppedSteps ? ` · ${generation.droppedSteps} dropped` : ""}
              {generationTiming?.firstValidStepAtMs
                ? ` · first step ${elapsed(generationTiming.requestedAtMs, generationTiming.firstValidStepAtMs)} ms`
                : ""}
              {generationTiming?.firstVisibleInkAtMs
                ? ` · first ink ${elapsed(generationTiming.requestedAtMs, generationTiming.firstVisibleInkAtMs)} ms`
                : ""}
            </span>
            <button
              className="trace-copy"
              type="button"
              onClick={() => void copyM3Timing()}
              disabled={!generationTiming?.firstVisibleInkAtMs || !activeLesson.complete}
            >
              {m3CopyState === "copied"
                ? "Timing copied"
                : m3CopyState === "failed"
                  ? "Copy failed"
                  : "Copy M3 timing"}
            </button>
          </div>
        ) : null}
        {isDiagnostics && activeLesson.source !== "review" ? (
          <div className="sync-strip" aria-label="Fixed synchronization status">
            <span><strong>{lessonSync.state.phase}</strong> fixed sync</span>
            <div className="sync-track" aria-hidden="true">
              <span style={{ width: `${lessonSync.state.currentStepProgress * 100}%` }} />
            </div>
            <span>{Math.round(lessonSync.state.currentStepProgress * 100)}% current step</span>
            <span><strong>{lessonSync.state.completedRuns} / 3</strong> completed runs</span>
            <span>
              grounding {snapshot.lastAcknowledgedManifestHash === visibleManifestHash ? "acknowledged" : "pending"}
            </span>
            {lessonSync.state.ignoredEvents > 0 ? <span>{lessonSync.state.ignoredEvents} stale/invalid events ignored</span> : null}
          </div>
        ) : null}
        {activeLesson.source === "review" ? (
          <p className="lesson-hint">
            Local review mode shows all accepted geometry through the selected step. Capture the board and record the human layout verdict in the evaluation summary.
          </p>
        ) : snapshot.status !== "connected" ? (
          <p className="lesson-hint">Connect the microphone below, then start the lesson. Routine board rendering is local; only narration uses the mini Realtime model.</p>
        ) : lessonSync.state.phase === "TEACHING" ? (
          <p className="lesson-hint lesson-hint-live">Interrupt while a stroke is moving. The ink should remain exactly where it stopped.</p>
        ) : lessonSync.state.phase === "QA" ? (
          <p className="lesson-hint lesson-hint-frozen">Ink frozen. Ask your question, then use “Resume frozen step” when ready.</p>
        ) : lessonSync.state.phase === "CHECKPOINT_ASKING" ? (
          <p className="lesson-hint lesson-hint-live">
            Chalk has a quick check before moving on.
          </p>
        ) : lessonSync.state.phase === "CHECKPOINT_LISTENING" ? (
          <p className="lesson-hint lesson-hint-live">
            Your turn: {activeCheckpoint?.question}
          </p>
        ) : lessonSync.state.phase === "CHECKPOINT_FEEDBACK" ? (
          <p className="lesson-hint lesson-hint-live">
            Chalk is responding to your answer.
          </p>
        ) : lessonSync.state.phase === "GENERATING" ? (
          <p className="lesson-hint lesson-hint-live">Chalk is validating the next board step.</p>
        ) : null}
      </section>

      <section className="voice-stage" aria-labelledby="voice-title">
        <div className={`orb ${snapshot.audioPlaybackActive ? "orb-speaking" : ""}`} aria-hidden="true">
          <span />
          <span />
          <span />
        </div>
        <div className="voice-copy">
          <h2 id="voice-title">
            {snapshot.status === "connected"
              ? snapshot.audioPlaybackActive
                ? "Chalk is speaking"
                : snapshot.microphoneEnabled
                  ? "Listening to you"
                  : "Microphone paused"
              : "Connect the voice loop"}
          </h2>
          <p>
            {snapshot.status === "connected"
              ? snapshot.microphoneEnabled
                ? "Speak now. The microphone pauses automatically when your turn ends."
                : "Press Space when you want to answer or interrupt Chalk."
              : "The browser will ask for microphone access after the backend mints a short-lived session credential."}
          </p>
          <div className="button-row">
            <button className="primary" type="button" onClick={connect} disabled={!canConnect || isBusy}>
              {isBusy ? "Connecting…" : "Connect microphone"}
            </button>
            <button
              className={snapshot.microphoneEnabled ? "secondary" : "primary"}
              type="button"
              onClick={toggleMicrophone}
              disabled={snapshot.status !== "connected"}
              aria-pressed={snapshot.microphoneEnabled}
              title="You can also press Space anywhere outside a form control"
            >
              {snapshot.microphoneEnabled ? "Stop listening" : "Speak"}
            </button>
            <button className="secondary" type="button" onClick={disconnect} disabled={!canDisconnect}>
              Disconnect
            </button>
          </div>
          {snapshot.lastError ? (
            <p className="error" role="alert">{snapshot.lastError}</p>
          ) : null}
        </div>
      </section>

      {isDiagnostics ? (
        <>
          <section className="panel evaluation-import" aria-labelledby="evaluation-import-title">
            <div>
              <p className="eyebrow">M3 evidence review</p>
              <h2 id="evaluation-import-title">Review captured lesson without regenerating</h2>
            </div>
            <label>
              Captured `.ndjson` file
              <input
                type="file"
                accept=".ndjson,application/x-ndjson"
                onChange={(event) => {
                  void reviewCapturedLesson(event.target.files?.[0]);
                  event.target.value = "";
                }}
              />
            </label>
          </section>
          <section className="metrics" aria-label="Realtime diagnostics">
        <Metric
          label="Settled interruption streak"
          value={`${snapshot.consecutiveSuccessfulInterruptions} / 5`}
          detail="Counts settled cancellations with no post-freeze output metadata, not raw speech-start events."
          pass={snapshot.consecutiveSuccessfulInterruptions >= 5}
        />
        <Metric
          label="Dummy tool round trips"
          value={String(snapshot.toolRoundTrips)}
          detail='Say: “Use debug echo and echo hello.”'
          pass={snapshot.toolRoundTrips > 0}
        />
        <Metric
          label="Session"
          value={snapshot.sessionModel ?? "Not connected"}
          detail={snapshot.sessionVoice ? `Voice: ${snapshot.sessionVoice}` : "Voice set by the backend"}
          pass={snapshot.status === "connected"}
        />
        <Metric
          label="Session token budget"
          value={`${snapshot.tokenUsage.total_tokens.toLocaleString()} / ${snapshot.tokenBudget.toLocaleString()}`}
          detail={`${snapshot.tokenUsage.input_tokens.toLocaleString()} input · ${snapshot.tokenUsage.output_tokens.toLocaleString()} output · auto-disconnect at limit`}
          pass={snapshot.tokenUsage.total_tokens < snapshot.tokenBudget}
        />
          </section>

          <section className="evidence-grid">
        <article className="panel interruptions-panel">
          <div className="panel-heading">
            <div>
              <p className="eyebrow">Manual + measured evidence</p>
              <h2>Interruptions</h2>
            </div>
            <span className="count">{snapshot.interruptions.length}</span>
          </div>
          <p className="panel-note">
            Handler-state stop latency measures only the synchronous local state mutation at event receipt. It is not rendered-animation or audible-stop latency; perceived audio stop is recorded separately.
          </p>
          {snapshot.interruptions.length === 0 ? (
            <EmptyState>Interrupt an active response to create the first marker.</EmptyState>
          ) : (
            <ol className="interruption-list">
              {[...snapshot.interruptions].reverse().map((marker, reverseIndex) => (
                <li key={marker.id}>
                  <div className="marker-title">
                    <strong>Run {snapshot.interruptions.length - reverseIndex}</strong>
                    <span className={`settlement settlement-${marker.settlement}`}>{marker.settlement}</span>
                  </div>
                  <dl>
                    <div>
                      <dt>Handler-state stop</dt>
                      <dd>{marker.local_handler_stop_latency_ms.toFixed(1)} ms</dd>
                    </div>
                    <div>
                      <dt>Possible stale output events</dt>
                      <dd>{marker.stale_output_events}</dd>
                    </div>
                  </dl>
                  <label>
                    Perceived audio stop
                    <select
                      value={marker.perceived_audio_stop}
                      onChange={(event) =>
                        setPerceivedStop(marker.id, event.target.value as PerceivedAudioStop)
                      }
                    >
                      <option value="not-recorded">Not recorded</option>
                      <option value="immediate">Immediate</option>
                      <option value="short-tail">Short audible tail</option>
                      <option value="long-tail">Long audible tail</option>
                    </select>
                  </label>
                </li>
              ))}
            </ol>
          )}
        </article>

        <article className="panel trace-panel">
          <div className="panel-heading">
            <div>
              <p className="eyebrow">Metadata only</p>
              <h2>Redacted event trace</h2>
            </div>
            <button className="trace-copy" type="button" onClick={copyTrace} disabled={snapshot.trace.length === 0}>
              {copyState === "copied" ? "Copied" : copyState === "failed" ? "Copy failed" : "Copy trace"}
            </button>
          </div>
          <p className="panel-note">
            Transcript text, audio, tool arguments, authorization values, and client secrets are never retained here.
          </p>
          {recentTrace.length === 0 ? (
            <EmptyState>Connection events will appear here without their content.</EmptyState>
          ) : (
            <div className="trace-list" role="log" aria-live="polite">
              {recentTrace.map((entry) => (
                <TraceRow key={`${entry.sequence}-${entry.type}`} entry={entry} />
              ))}
            </div>
          )}
        </article>
          </section>
        </>
      ) : null}
    </main>
  );
}

function StatusPill({ status }: { status: RealtimeSnapshot["status"] }) {
  return (
    <div className={`status-pill status-${status}`} aria-live="polite">
      <span aria-hidden="true" />
      {status.replaceAll("-", " ")}
    </div>
  );
}

function Metric({
  label,
  value,
  detail,
  pass,
}: {
  label: string;
  value: string;
  detail: string;
  pass: boolean;
}) {
  return (
    <article className={`metric ${pass ? "metric-pass" : ""}`}>
      <p>{label}</p>
      <strong>{value}</strong>
      <small>{detail}</small>
    </article>
  );
}

function TraceRow({ entry }: { entry: TraceEntry }) {
  const usage =
    entry.total_tokens === undefined
      ? undefined
      : `${entry.total_tokens.toLocaleString()} tokens`;
  const metadata = [entry.status, entry.response_id, entry.call_id, entry.code, usage]
    .filter(Boolean)
    .join(" · ");
  return (
    <div className="trace-row">
      <time>{entry.at_ms.toFixed(1)} ms</time>
      <span className={`direction direction-${entry.direction}`}>{entry.direction}</span>
      <code>{entry.type}</code>
      {metadata ? <small>{metadata}</small> : null}
    </div>
  );
}

function EmptyState({ children }: { children: string }) {
  return <p className="empty-state">{children}</p>;
}

function elapsed(start: number | undefined, end: number | undefined): number | null {
  if (start === undefined || end === undefined || end < start) return null;
  return Math.round((end - start) * 10) / 10;
}

export default App;
