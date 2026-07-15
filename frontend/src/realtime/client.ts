import {
  createFunctionCallOutput,
  createResponseAfterTool,
  createSessionRequest,
  createSessionUpdate,
  extractFunctionCalls,
  getResponseId,
  getResponseStatus,
  getResponseUsage,
  parseServerEvent,
  parseSessionCredential,
  REALTIME_CALLS_URL,
  SESSION_TOKEN_BUDGET,
  SERVER_EVENTS,
} from "./protocol";
import { routeToolCall } from "./toolRouter";
import {
  createLocalTraceEntry,
  eventToTraceEntry,
  sanitizeTraceIdentifier,
} from "./trace";
import type {
  ConnectionStatus,
  InterruptionMarker,
  PerceivedAudioStop,
  RealtimeClientCallbacks,
  RealtimeSnapshot,
  ServerEvent,
  SessionCredential,
  TokenUsageSummary,
  TraceEntry,
} from "./types";

const MAX_TRACE_ENTRIES = 500;
const MAX_INTERRUPTION_MARKERS = 50;
const MAX_SEEN_CALL_IDS = 256;
const SESSION_READY_TIMEOUT_MS = 15_000;
const ICE_GATHER_TIMEOUT_MS = 5_000;

const EMPTY_TOKEN_USAGE: TokenUsageSummary = {
  total_tokens: 0,
  input_tokens: 0,
  output_tokens: 0,
  cached_input_tokens: 0,
  input_audio_tokens: 0,
  output_audio_tokens: 0,
};

export interface RealtimeClientOptions {
  apiBaseUrl: string;
  clientId: string;
  callbacks: RealtimeClientCallbacks;
  fetchImpl?: typeof fetch;
  now?: () => number;
}

interface PendingToolRoundTrip {
  successfulEchoes: number;
  responseId?: string;
}

export class RealtimeClient {
  private readonly apiBaseUrl: string;
  private readonly clientId: string;
  private readonly callbacks: RealtimeClientCallbacks;
  private readonly fetchImpl: typeof fetch;
  private readonly now: () => number;
  private startedAt: number;

  private status: ConnectionStatus = "disconnected";
  private sessionCredential?: SessionCredential;
  private observedSessionModel?: string;
  private observedSessionVoice?: string;
  private activeResponseId?: string;
  private playbackResponseId?: string;
  private lastError?: string;
  private toolRoundTrips = 0;
  private pendingToolRoundTrip?: PendingToolRoundTrip;
  private trace: TraceEntry[] = [];
  private interruptions: InterruptionMarker[] = [];
  private seenCallIds = new Set<string>();
  private seenUsageResponseIds = new Set<string>();
  private interruptedResponseIds = new Map<string, string>();
  private tokenUsage: TokenUsageSummary = { ...EMPTY_TOKEN_USAGE };

  private peer?: RTCPeerConnection;
  private dataChannel?: RTCDataChannel;
  private microphoneStream?: MediaStream;
  private remoteAudio?: HTMLAudioElement;
  private requestAbort?: AbortController;
  private attempt = 0;
  private sessionCreated = false;
  private sessionUpdated = false;
  private dataChannelOpen = false;
  private sessionUpdateSent = false;
  private readyResolve?: () => void;
  private readyReject?: (error: Error) => void;

  constructor(options: RealtimeClientOptions) {
    this.apiBaseUrl = options.apiBaseUrl.replace(/\/$/, "");
    this.clientId = options.clientId;
    this.callbacks = options.callbacks;
    // Some browsers require native fetch to retain the Window receiver. Store
    // a bound function so invoking it through this client cannot change `this`.
    this.fetchImpl = options.fetchImpl ?? globalThis.fetch.bind(globalThis);
    this.now = options.now ?? (() => performance.now());
    this.startedAt = this.now();
    this.emitSnapshot();
  }

  async connect(): Promise<void> {
    if (this.status !== "disconnected" && this.status !== "error") {
      return;
    }

    await this.cleanupResources();
    const attempt = ++this.attempt;
    this.resetForConnectionAttempt();

    try {
      this.setStatus("minting-session");
      const request = createSessionRequest(this.clientId);
      const abortController = new AbortController();
      this.requestAbort = abortController;
      const response = await this.fetchImpl(`${this.apiBaseUrl}/session`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(request),
        signal: abortController.signal,
        cache: "no-store",
      });

      if (!response.ok) {
        throw new Error(`Session service failed with HTTP ${response.status}.`);
      }
      const credential = parseSessionCredential(await response.json(), request.request_id);
      this.assertCurrentAttempt(attempt);
      this.sessionCredential = credential;
      this.observedSessionModel = credential.model;
      this.observedSessionVoice = credential.voice;

      this.setStatus("requesting-microphone");
      const microphoneStream = await navigator.mediaDevices.getUserMedia({
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true,
        },
      });
      if (attempt !== this.attempt) {
        stopMediaStream(microphoneStream);
        throw new DOMException("Connection attempt superseded.", "AbortError");
      }
      for (const track of microphoneStream.getAudioTracks()) {
        track.enabled = false;
      }
      this.microphoneStream = microphoneStream;

      this.setStatus("negotiating-webrtc");
      const peer = new RTCPeerConnection();
      this.peer = peer;
      this.installPeerHandlers(peer, attempt);
      for (const track of microphoneStream.getAudioTracks()) {
        peer.addTrack(track, microphoneStream);
      }

      const dataChannel = peer.createDataChannel("oai-events");
      this.dataChannel = dataChannel;
      this.installDataChannelHandlers(dataChannel, attempt);

      const offer = await peer.createOffer();
      await peer.setLocalDescription(offer);
      await waitForIceGathering(peer, ICE_GATHER_TIMEOUT_MS);
      this.assertCurrentAttempt(attempt);

      const localSdp = peer.localDescription?.sdp;
      if (!localSdp) {
        throw new Error("The browser did not produce a WebRTC offer.");
      }

      const sdpResponse = await this.fetchImpl(REALTIME_CALLS_URL, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${credential.client_secret}`,
          "Content-Type": "application/sdp",
        },
        body: localSdp,
        signal: abortController.signal,
      });
      if (!sdpResponse.ok) {
        throw new Error(`Realtime handshake failed with HTTP ${sdpResponse.status}.`);
      }

      const answerSdp = await sdpResponse.text();
      this.assertCurrentAttempt(attempt);
      await peer.setRemoteDescription({ type: "answer", sdp: answerSdp });
      await this.waitUntilSessionUpdated(attempt);
      this.assertCurrentAttempt(attempt);
      for (const track of microphoneStream.getAudioTracks()) {
        track.enabled = true;
      }
      this.setStatus("connected");
    } catch (error) {
      if (attempt !== this.attempt) {
        return;
      }
      const failureAttempt = ++this.attempt;
      await this.cleanupResources();
      if (failureAttempt !== this.attempt) return;
      this.sessionCredential = undefined;
      this.observedSessionModel = undefined;
      this.observedSessionVoice = undefined;
      this.activeResponseId = undefined;
      const message = userFacingError(error);
      this.lastError = message;
      this.addLocalTrace("connection.failed", { code: errorCode(error) });
      this.setStatus("error");
      throw error;
    }
  }

  async disconnect(): Promise<void> {
    if (this.status === "disconnected") {
      return;
    }
    ++this.attempt;
    this.setStatus("disconnecting");
    await this.cleanupResources();
    this.sessionCredential = undefined;
    this.activeResponseId = undefined;
    this.setStatus("disconnected");
  }

  updatePerceivedAudioStop(markerId: string, value: PerceivedAudioStop): void {
    this.interruptions = this.interruptions.map((marker) =>
      marker.id === markerId ? { ...marker, perceived_audio_stop: value } : marker,
    );
    this.emitSnapshot();
  }

  getSnapshot(): RealtimeSnapshot {
    return {
      status: this.status,
      sessionModel: this.observedSessionModel,
      sessionVoice: this.observedSessionVoice,
      activeResponseId: this.activeResponseId,
      audioPlaybackActive:
        this.activeResponseId !== undefined &&
        this.activeResponseId === this.playbackResponseId,
      lastError: this.lastError,
      trace: this.trace.map((entry) => ({ ...entry })),
      interruptions: this.interruptions.map((marker) => ({ ...marker })),
      consecutiveSuccessfulInterruptions: countConsecutiveSuccesses(
        this.interruptions,
      ),
      toolRoundTrips: this.toolRoundTrips,
      tokenUsage: { ...this.tokenUsage },
      tokenBudget: SESSION_TOKEN_BUDGET,
    };
  }

  private installPeerHandlers(peer: RTCPeerConnection, attempt: number): void {
    const remoteAudio = new Audio();
    remoteAudio.autoplay = true;
    this.remoteAudio = remoteAudio;

    peer.addEventListener("track", (event) => {
      if (attempt !== this.attempt) return;
      remoteAudio.srcObject = event.streams[0] ?? new MediaStream([event.track]);
      void remoteAudio.play().catch(() => {
        this.addLocalTrace("audio.playback_blocked", { code: "autoplay" });
      });
    });

    peer.addEventListener("connectionstatechange", () => {
      if (attempt !== this.attempt) return;
      this.addLocalTrace("webrtc.connection_state", {
        status: peer.connectionState,
      });
      if (peer.connectionState === "failed") {
        void this.transitionToTerminalError(
          attempt,
          "The WebRTC connection failed. Disconnect and retry.",
          "peer_failed",
        );
      }
    });
  }

  private installDataChannelHandlers(
    dataChannel: RTCDataChannel,
    attempt: number,
  ): void {
    dataChannel.addEventListener("open", () => {
      if (attempt !== this.attempt) return;
      this.dataChannelOpen = true;
      this.addLocalTrace("data_channel.open");
      this.maybeConfigureSession();
    });

    dataChannel.addEventListener("close", () => {
      if (attempt !== this.attempt) return;
      this.dataChannelOpen = false;
      this.addLocalTrace("data_channel.closed");
      void this.transitionToTerminalError(
        attempt,
        "The Realtime data channel closed. Disconnect and retry.",
        "data_channel_closed",
      );
    });

    dataChannel.addEventListener("message", (message) => {
      if (attempt !== this.attempt) return;
      const event = parseServerEvent(message.data);
      if (!event) {
        this.addLocalTrace("server_event.rejected", { code: "invalid_json" });
        return;
      }
      this.handleServerEvent(event);
    });
  }

  private handleServerEvent(event: ServerEvent): void {
    this.addServerTrace(event);

    if (event.type === SERVER_EVENTS.SESSION_CREATED) {
      this.sessionCreated = true;
      this.maybeConfigureSession();
      return;
    }

    if (event.type === SERVER_EVENTS.SESSION_UPDATED) {
      this.sessionUpdated = true;
      this.readyResolve?.();
      this.readyResolve = undefined;
      this.readyReject = undefined;
      return;
    }

    if (event.type === SERVER_EVENTS.RESPONSE_CREATED) {
      this.activeResponseId = getResponseId(event);
      if (this.pendingToolRoundTrip && !this.pendingToolRoundTrip.responseId) {
        this.pendingToolRoundTrip.responseId = this.activeResponseId;
      }
      this.emitSnapshot();
      return;
    }

    if (event.type === SERVER_EVENTS.OUTPUT_AUDIO_BUFFER_STARTED) {
      const responseId = getResponseId(event);
      if (responseId) {
        this.playbackResponseId = responseId;
        this.activeResponseId = responseId;
        this.emitSnapshot();
      }
      return;
    }

    if (
      event.type === SERVER_EVENTS.OUTPUT_AUDIO_BUFFER_STOPPED ||
      event.type === SERVER_EVENTS.OUTPUT_AUDIO_BUFFER_CLEARED
    ) {
      const responseId = getResponseId(event) ?? this.playbackResponseId;
      if (event.type === SERVER_EVENTS.OUTPUT_AUDIO_BUFFER_CLEARED && responseId) {
        this.settleInterruption(responseId, "cleared");
      } else if (
        event.type === SERVER_EVENTS.OUTPUT_AUDIO_BUFFER_STOPPED &&
        responseId
      ) {
        this.settleInterruption(responseId, "stopped");
      }
      if (responseId && responseId === this.activeResponseId) {
        this.activeResponseId = undefined;
      }
      if (!responseId || responseId === this.playbackResponseId) {
        this.playbackResponseId = undefined;
      }
      this.emitSnapshot();
      return;
    }

    if (event.type === SERVER_EVENTS.INPUT_AUDIO_BUFFER_SPEECH_STARTED) {
      this.markInterruption();
      return;
    }

    if (
      event.type === SERVER_EVENTS.RESPONSE_OUTPUT_AUDIO_DELTA ||
      event.type === SERVER_EVENTS.RESPONSE_OUTPUT_AUDIO_TRANSCRIPT_DELTA
    ) {
      const responseId = getResponseId(event);
      this.markPossibleStaleOutput(responseId);
      this.confirmToolRoundTripFromOutput(responseId);
      return;
    }

    if (event.type === SERVER_EVENTS.RESPONSE_DONE) {
      const responseId = getResponseId(event);
      if (
        responseId &&
        responseId === this.activeResponseId &&
        responseId !== this.playbackResponseId
      ) {
        this.activeResponseId = undefined;
      }
      if (responseId) {
        const responseStatus = getResponseStatus(event);
        const completedWhilePlaybackTracked =
          responseStatus === "completed" &&
          responseId === this.playbackResponseId;
        if (!completedWhilePlaybackTracked) {
          this.settleInterruption(responseId, responseStatus);
        }
        this.failPendingToolRoundTripWithoutOutput(responseId);
      }
      const tokenBudgetReached = this.recordTokenUsage(event);
      if (tokenBudgetReached) {
        this.lastError = `Session token budget reached (${SESSION_TOKEN_BUDGET.toLocaleString()}). Reconnect to start a fresh session.`;
        this.addLocalTrace("session.token_budget_reached", {
          status: "disconnected",
        });
        void this.disconnect();
        return;
      }
      if (getResponseStatus(event) === "completed") {
        this.handleFunctionCalls(event);
      }
      this.emitSnapshot();
      return;
    }

    if (event.type === SERVER_EVENTS.ERROR) {
      this.lastError = "The Realtime service reported an error. See the redacted trace code.";
      this.emitSnapshot();
    }
  }

  private maybeConfigureSession(): void {
    if (
      !this.dataChannelOpen ||
      !this.sessionCreated ||
      this.sessionUpdateSent ||
      !this.sessionCredential
    ) {
      return;
    }

    this.sessionUpdateSent = true;
    this.setStatus("configuring-session");
    this.sendEvent(
      createSessionUpdate(
        this.sessionCredential.model,
        this.sessionCredential.voice,
      ),
    );
  }

  private markInterruption(): void {
    if (
      !this.activeResponseId ||
      this.activeResponseId !== this.playbackResponseId
    ) {
      return;
    }

    const detectedAt = this.now();
    const responseId = this.activeResponseId;
    this.activeResponseId = undefined;
    const handlerStoppedAt = this.now();
    const marker: InterruptionMarker = {
      id: crypto.randomUUID(),
      at_ms: round(detectedAt - this.startedAt),
      response_id: sanitizeTraceIdentifier(responseId),
      local_handler_stop_latency_ms: round(
        Math.max(0, handlerStoppedAt - detectedAt),
      ),
      perceived_audio_stop: "not-recorded",
      settlement: "pending",
      stale_output_events: 0,
    };
    this.interruptions = [...this.interruptions, marker].slice(
      -MAX_INTERRUPTION_MARKERS,
    );
    this.interruptedResponseIds.set(responseId, marker.id);
    const retainedMarkerIds = new Set(this.interruptions.map((item) => item.id));
    for (const [rawResponseId, markerId] of this.interruptedResponseIds) {
      if (!retainedMarkerIds.has(markerId)) {
        this.interruptedResponseIds.delete(rawResponseId);
      }
    }
    this.addLocalTrace("handler_state.response_deactivated", {
      response_id: responseId,
    });
    this.emitSnapshot();
  }

  private markPossibleStaleOutput(responseId: string | undefined): void {
    if (!responseId) return;
    const markerId = this.interruptedResponseIds.get(responseId);
    if (!markerId) return;
    this.interruptions = this.interruptions.map((marker) =>
      marker.id === markerId
        ? {
            ...marker,
            settlement: "failure",
            stale_output_events: marker.stale_output_events + 1,
          }
        : marker,
    );
    this.addLocalTrace("interruption.possible_stale_output", {
      response_id: responseId,
    });
    this.emitSnapshot();
  }

  private settleInterruption(responseId: string, status: string | undefined): void {
    const markerId = this.interruptedResponseIds.get(responseId);
    if (!markerId) return;
    const pendingMarker = this.interruptions.find(
      (marker) => marker.id === markerId && marker.settlement === "pending",
    );
    if (!pendingMarker) return;
    const now = this.now();
    this.interruptions = this.interruptions.map((marker) => {
      if (marker.id !== markerId || marker.settlement !== "pending") return marker;
      const settlement =
        (status === "cancelled" ||
          status === "incomplete" ||
          status === "cleared") &&
        marker.stale_output_events === 0
          ? "success"
          : "failure";
      return {
        ...marker,
        settlement,
        settled_after_ms: round(Math.max(0, now - this.startedAt - marker.at_ms)),
      };
    });
    // Keep the response-to-marker association until the bounded marker itself
    // is pruned. A late delta after a buffer-clear acknowledgement must still
    // invalidate an apparent success.
    this.addLocalTrace("interruption.settled", {
      response_id: responseId,
      status: this.interruptions.find((marker) => marker.id === markerId)?.settlement,
    });
  }

  private handleFunctionCalls(event: ServerEvent): void {
    const calls = extractFunctionCalls(event).filter((call) => {
      return this.rememberCallId(call.callId);
    });
    if (calls.length === 0) return;

    let successfulEchoes = 0;
    try {
      for (const call of calls) {
        const result = routeToolCall(call);
        this.sendEvent(createFunctionCallOutput(call.callId, result));
        this.addLocalTrace("tool.output_sent", {
          call_id: call.callId,
          status: result.ok ? "ok" : result.reason,
        });
        if (result.ok) successfulEchoes += 1;
      }
      this.sendEvent(createResponseAfterTool());
    } catch (error) {
      this.addLocalTrace("tool.output_failed", { code: errorCode(error) });
      return;
    }
    if (successfulEchoes > 0) {
      this.pendingToolRoundTrip = { successfulEchoes };
    }
    this.emitSnapshot();
  }

  private confirmToolRoundTripFromOutput(responseId: string | undefined): void {
    if (
      !responseId ||
      !this.pendingToolRoundTrip?.responseId ||
      responseId !== this.pendingToolRoundTrip.responseId
    ) {
      return;
    }
    this.toolRoundTrips += this.pendingToolRoundTrip.successfulEchoes;
    this.addLocalTrace("tool.round_trip_confirmed", {
      response_id: responseId,
      status: "output_observed",
    });
    this.pendingToolRoundTrip = undefined;
    this.emitSnapshot();
  }

  private failPendingToolRoundTripWithoutOutput(responseId: string): void {
    if (responseId !== this.pendingToolRoundTrip?.responseId) return;
    this.addLocalTrace("tool.round_trip_unconfirmed", {
      response_id: responseId,
      status: "no_output",
    });
    this.pendingToolRoundTrip = undefined;
    this.emitSnapshot();
  }

  private rememberCallId(callId: string): boolean {
    if (this.seenCallIds.has(callId)) return false;
    if (this.seenCallIds.size >= MAX_SEEN_CALL_IDS) {
      const oldest = this.seenCallIds.values().next().value as string | undefined;
      if (oldest) this.seenCallIds.delete(oldest);
    }
    this.seenCallIds.add(callId);
    return true;
  }

  private recordTokenUsage(event: ServerEvent): boolean {
    const responseId = getResponseId(event);
    const usage = getResponseUsage(event);
    if (!responseId || !usage || this.seenUsageResponseIds.has(responseId)) {
      return false;
    }
    rememberBounded(this.seenUsageResponseIds, responseId, MAX_SEEN_CALL_IDS);
    this.tokenUsage = {
      total_tokens: this.tokenUsage.total_tokens + usage.total_tokens,
      input_tokens: this.tokenUsage.input_tokens + usage.input_tokens,
      output_tokens: this.tokenUsage.output_tokens + usage.output_tokens,
      cached_input_tokens:
        this.tokenUsage.cached_input_tokens + usage.cached_input_tokens,
      input_audio_tokens:
        this.tokenUsage.input_audio_tokens + usage.input_audio_tokens,
      output_audio_tokens:
        this.tokenUsage.output_audio_tokens + usage.output_audio_tokens,
    };
    return this.tokenUsage.total_tokens >= SESSION_TOKEN_BUDGET;
  }

  private sendEvent(event: { type: string; [key: string]: unknown }): void {
    if (!this.dataChannel || this.dataChannel.readyState !== "open") {
      throw new Error("The Realtime data channel is not open.");
    }
    this.dataChannel.send(JSON.stringify(event));
    this.trace = appendBounded(
      this.trace,
      eventToTraceEntry(
        event,
        "client",
        this.nextSequence(),
        this.now() - this.startedAt,
      ),
    );
    this.emitSnapshot();
  }

  private addServerTrace(event: ServerEvent): void {
    this.trace = appendBounded(
      this.trace,
      eventToTraceEntry(
        event,
        "server",
        this.nextSequence(),
        this.now() - this.startedAt,
      ),
    );
    this.emitSnapshot();
  }

  private addLocalTrace(
    type: string,
    metadata: Pick<TraceEntry, "response_id" | "call_id" | "status" | "code"> = {},
  ): void {
    this.trace = appendBounded(
      this.trace,
      createLocalTraceEntry(
        type,
        this.nextSequence(),
        this.now() - this.startedAt,
        metadata,
      ),
    );
    this.emitSnapshot();
  }

  private nextSequence(): number {
    return (this.trace.at(-1)?.sequence ?? 0) + 1;
  }

  private setStatus(status: ConnectionStatus): void {
    this.status = status;
    this.emitSnapshot();
  }

  private emitSnapshot(): void {
    this.callbacks.onSnapshot(this.getSnapshot());
  }

  private waitUntilSessionUpdated(attempt: number): Promise<void> {
    if (this.sessionUpdated) return Promise.resolve();
    return new Promise((resolve, reject) => {
      this.readyResolve = resolve;
      this.readyReject = reject;
      window.setTimeout(() => {
        if (attempt === this.attempt && this.readyResolve) {
          this.readyResolve = undefined;
          this.readyReject = undefined;
          reject(new Error("Timed out waiting for session.updated."));
        }
      }, SESSION_READY_TIMEOUT_MS);
    });
  }

  private assertCurrentAttempt(attempt: number): void {
    if (attempt !== this.attempt) {
      throw new DOMException("Connection attempt superseded.", "AbortError");
    }
  }

  private resetForConnectionAttempt(): void {
    this.startedAt = this.now();
    this.sessionCredential = undefined;
    this.observedSessionModel = undefined;
    this.observedSessionVoice = undefined;
    this.activeResponseId = undefined;
    this.playbackResponseId = undefined;
    this.lastError = undefined;
    this.toolRoundTrips = 0;
    this.pendingToolRoundTrip = undefined;
    this.trace = [];
    this.interruptions = [];
    this.seenCallIds.clear();
    this.seenUsageResponseIds.clear();
    this.interruptedResponseIds.clear();
    this.tokenUsage = { ...EMPTY_TOKEN_USAGE };
    this.sessionCreated = false;
    this.sessionUpdated = false;
    this.dataChannelOpen = false;
    this.sessionUpdateSent = false;
  }

  private async transitionToTerminalError(
    attempt: number,
    message: string,
    code: string,
  ): Promise<void> {
    if (attempt !== this.attempt) return;
    const terminalAttempt = ++this.attempt;
    await this.cleanupResources();
    if (terminalAttempt !== this.attempt) return;
    this.sessionCredential = undefined;
    this.observedSessionModel = undefined;
    this.observedSessionVoice = undefined;
    this.activeResponseId = undefined;
    this.playbackResponseId = undefined;
    this.lastError = message;
    this.addLocalTrace("connection.terminal_error", { code });
    this.setStatus("error");
  }

  private async cleanupResources(): Promise<void> {
    this.requestAbort?.abort();
    this.requestAbort = undefined;
    this.readyReject?.(new Error("Connection closed before session.updated."));
    this.readyResolve = undefined;
    this.readyReject = undefined;

    this.dataChannel?.close();
    this.dataChannel = undefined;
    this.peer?.close();
    this.peer = undefined;
    if (this.microphoneStream) stopMediaStream(this.microphoneStream);
    this.microphoneStream = undefined;
    if (this.remoteAudio) {
      this.remoteAudio.pause();
      this.remoteAudio.srcObject = null;
    }
    this.remoteAudio = undefined;
    this.dataChannelOpen = false;
    this.sessionCreated = false;
    this.sessionUpdated = false;
    this.sessionUpdateSent = false;
    this.pendingToolRoundTrip = undefined;
    this.playbackResponseId = undefined;
  }
}

function waitForIceGathering(
  peer: RTCPeerConnection,
  timeoutMs: number,
): Promise<void> {
  if (peer.iceGatheringState === "complete") return Promise.resolve();
  return new Promise((resolve) => {
    let settled = false;
    const finish = () => {
      if (settled) return;
      settled = true;
      peer.removeEventListener("icegatheringstatechange", onChange);
      resolve();
    };
    const onChange = () => {
      if (peer.iceGatheringState === "complete") finish();
    };
    peer.addEventListener("icegatheringstatechange", onChange);
    window.setTimeout(finish, timeoutMs);
  });
}

function countConsecutiveSuccesses(markers: InterruptionMarker[]): number {
  let count = 0;
  for (let index = markers.length - 1; index >= 0; index -= 1) {
    const settlement = markers[index].settlement;
    if (settlement === "pending" || settlement === "failure") break;
    count += 1;
  }
  return count;
}

function appendBounded<T>(items: T[], item: T): T[] {
  const next = [...items, item];
  return next.length > MAX_TRACE_ENTRIES
    ? next.slice(next.length - MAX_TRACE_ENTRIES)
    : next;
}

function stopMediaStream(stream: MediaStream): void {
  for (const track of stream.getTracks()) track.stop();
}

function rememberBounded(
  values: Set<string>,
  value: string,
  maximum: number,
): void {
  if (values.size >= maximum) {
    const oldest = values.values().next().value as string | undefined;
    if (oldest) values.delete(oldest);
  }
  values.add(value);
}

function userFacingError(error: unknown): string {
  if (error instanceof DOMException && error.name === "NotAllowedError") {
    return "Microphone permission was denied. Allow access and retry.";
  }
  if (error instanceof Error && error.message) return error.message;
  return "Could not start the Realtime session.";
}

function errorCode(error: unknown): string {
  if (error instanceof DOMException) return error.name;
  if (error instanceof Error) return error.name || "Error";
  return "unknown";
}

function round(value: number): number {
  return Math.round(value * 10) / 10;
}
