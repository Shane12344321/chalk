import { useEffect, useMemo, useRef, useState } from "react";
import projectileLessonSource from "../../demo/cached_lessons/projectile-range.lesson.json";
import { Board } from "./board/Board";
import { decodeLesson } from "./board/decode";
import { isLessonProgram } from "./board/schema";
import {
  getOrCreateClientId,
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

const INITIAL_SNAPSHOT: RealtimeSnapshot = {
  status: "disconnected",
  audioPlaybackActive: false,
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
};

const PROJECTILE_RESULT = decodeLesson(projectileLessonSource);
if (!isLessonProgram(projectileLessonSource) || !PROJECTILE_RESULT.lesson || PROJECTILE_RESULT.warnings.length > 0) {
  throw new Error("The checked-in projectile lesson did not pass its shared contract.");
}
const PROJECTILE_LESSON = PROJECTILE_RESULT.lesson;

function App() {
  const clientRef = useRef<RealtimeClient>();
  const semanticHandlerRef = useRef<(event: RealtimeSemanticEvent) => void>();
  const [snapshot, setSnapshot] = useState(INITIAL_SNAPSHOT);
  const [copyState, setCopyState] = useState<"idle" | "copied" | "failed">(
    "idle",
  );
  const lessonSync = useFixedLessonSync({
    lesson: PROJECTILE_LESSON,
    clientRef,
    connectionStatus: snapshot.status,
    responseIdle: !snapshot.activeResponseId && !snapshot.audioPlaybackActive,
  });
  semanticHandlerRef.current = lessonSync.onSemanticEvent;

  useEffect(() => {
    const client = new RealtimeClient({
      apiBaseUrl: API_BASE_URL,
      clientId: getOrCreateClientId(),
      callbacks: {
        onSnapshot: setSnapshot,
        onSemanticEvent: (event) => semanticHandlerRef.current?.(event),
      },
    });
    clientRef.current = client;
    return () => {
      clientRef.current = undefined;
      void client.disconnect();
    };
  }, []);

  const isBusy = !["disconnected", "connected", "error"].includes(
    snapshot.status,
  );
  const canConnect = snapshot.status === "disconnected" || snapshot.status === "error";
  const canDisconnect =
    snapshot.status !== "disconnected" && snapshot.status !== "disconnecting";
  const recentTrace = useMemo(() => snapshot.trace.slice(-30).reverse(), [snapshot.trace]);

  const connect = () => {
    setCopyState("idle");
    void clientRef.current?.connect().catch(() => {
      // The client publishes a redacted, user-facing error in its snapshot.
    });
  };

  const disconnect = () => {
    void clientRef.current?.disconnect();
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
        }),
      );
      setCopyState("copied");
    } catch {
      setCopyState("failed");
    }
  };

  const setPerceivedStop = (markerId: string, value: PerceivedAudioStop) => {
    clientRef.current?.updatePerceivedAudioStop(markerId, value);
  };

  return (
    <main className="app-shell">
      <header className="hero">
        <div>
          <p className="eyebrow">M2 · Deterministic board</p>
          <h1>CHALK</h1>
          <p className="tagline">A tutor that draws while it talks—and stops when you do.</p>
        </div>
        <StatusPill status={snapshot.status} />
      </header>

      <section className="lesson-stage" aria-labelledby="lesson-title">
        <div className="lesson-heading">
          <div>
            <p className="eyebrow">Hardcoded feel gate · no board-model call</p>
            <h2 id="lesson-title">Projectile range, drawn with the voice</h2>
          </div>
          <div className="lesson-actions">
            <button
              className="primary"
              type="button"
              onClick={lessonSync.start}
              disabled={snapshot.status !== "connected" || !["IDLE", "DONE"].includes(lessonSync.state.phase)}
            >
              {lessonSync.state.phase === "DONE" ? "Run lesson again" : "Start lesson"}
            </button>
            <button
              className="secondary"
              type="button"
              onClick={lessonSync.resume}
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
          lesson={PROJECTILE_LESSON}
          currentStepIndex={lessonSync.state.currentStepIndex}
          currentStepProgress={lessonSync.state.currentStepProgress}
          phase={lessonSync.state.phase}
        />
        <div className="sync-strip" aria-label="Fixed synchronization status">
          <span><strong>{lessonSync.state.phase}</strong> fixed sync</span>
          <div className="sync-track" aria-hidden="true">
            <span style={{ width: `${lessonSync.state.currentStepProgress * 100}%` }} />
          </div>
          <span>{Math.round(lessonSync.state.currentStepProgress * 100)}% current step</span>
          <span><strong>{lessonSync.state.completedRuns} / 3</strong> completed runs</span>
          {lessonSync.state.ignoredEvents > 0 ? <span>{lessonSync.state.ignoredEvents} stale/invalid events ignored</span> : null}
        </div>
        {snapshot.status !== "connected" ? (
          <p className="lesson-hint">Connect the microphone below, then start the lesson. Routine board rendering is local; only narration uses the mini Realtime model.</p>
        ) : lessonSync.state.phase === "TEACHING" ? (
          <p className="lesson-hint lesson-hint-live">Interrupt while a stroke is moving. The ink should remain exactly where it stopped.</p>
        ) : lessonSync.state.phase === "QA" ? (
          <p className="lesson-hint lesson-hint-frozen">Ink frozen. Ask your question, then use “Resume frozen step” when ready.</p>
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
                : "Chalk is listening"
              : "Connect the voice loop"}
          </h2>
          <p>
            {snapshot.status === "connected"
              ? "Speak naturally. Interrupt while the orb is moving to test barge-in."
              : "The browser will ask for microphone access after the backend mints a short-lived session credential."}
          </p>
          <div className="button-row">
            <button className="primary" type="button" onClick={connect} disabled={!canConnect || isBusy}>
              {isBusy ? "Connecting…" : "Connect microphone"}
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

export default App;
