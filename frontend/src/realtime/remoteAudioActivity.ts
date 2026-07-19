export interface AudioActivityTransition {
  active: boolean;
  observedAtMs: number;
  rms: number;
}

export interface AudioActivityEvidence {
  active: boolean;
  transitions: number;
  samples: number;
  maxSampleCostMs: number;
}

export interface RemoteAudioActivityMonitor {
  snapshot(): AudioActivityEvidence;
  stop(): void;
}

export type RemoteAudioActivityMonitorFactory = (
  stream: MediaStream,
  onTransition: (event: AudioActivityTransition) => void,
) => RemoteAudioActivityMonitor;

export interface AudioActivityDetectorOptions {
  activityThresholdRms?: number;
  activeFrames?: number;
  silentFrames?: number;
}

/** Fixed Phase-6A production detector identity; evidence rejects mixed values. */
export const REMOTE_AUDIO_ACTIVITY_CONFIGURATION = {
  policyRevision: "rms-hysteresis-v1",
  activityThresholdRms: 0.012,
  activeFrames: 2,
  silentFrames: 5,
  fftSize: 1_024,
  falsePauseMinMs: 80,
} as const;

/**
 * Hysteretic detector used by the Phase-6 evaluation path. It identifies only
 * broad remote-audio activity and silence; it deliberately exposes no word,
 * sentence, phoneme, transcript, or audio payload.
 */
export class AudioActivityDetector {
  private readonly threshold: number;
  private readonly activeFrames: number;
  private readonly silentFrames: number;
  private above = 0;
  private below = 0;
  private active = false;

  constructor(options: AudioActivityDetectorOptions = {}) {
    this.threshold = bounded(
      options.activityThresholdRms ?? REMOTE_AUDIO_ACTIVITY_CONFIGURATION.activityThresholdRms,
      0.001,
      0.2,
    );
    this.activeFrames = integer(
      options.activeFrames ?? REMOTE_AUDIO_ACTIVITY_CONFIGURATION.activeFrames,
      1,
      20,
    );
    this.silentFrames = integer(
      options.silentFrames ?? REMOTE_AUDIO_ACTIVITY_CONFIGURATION.silentFrames,
      1,
      50,
    );
  }

  sample(rms: number): boolean | undefined {
    if (!Number.isFinite(rms) || rms < 0 || rms > 1) return undefined;
    if (rms >= this.threshold) {
      this.above += 1;
      this.below = 0;
      if (!this.active && this.above >= this.activeFrames) {
        this.active = true;
        return true;
      }
      return undefined;
    }
    this.below += 1;
    this.above = 0;
    if (this.active && this.below >= this.silentFrames) {
      this.active = false;
      return false;
    }
    return undefined;
  }

  isActive(): boolean {
    return this.active;
  }
}

export function createRemoteAudioActivityMonitor(
  stream: MediaStream,
  onTransition: (event: AudioActivityTransition) => void,
): RemoteAudioActivityMonitor {
  const AudioContextConstructor = window.AudioContext;
  if (!AudioContextConstructor) throw new Error("Web Audio is unavailable.");
  const context = new AudioContextConstructor({ latencyHint: "interactive" });
  const source = context.createMediaStreamSource(stream);
  const analyser = context.createAnalyser();
  analyser.fftSize = REMOTE_AUDIO_ACTIVITY_CONFIGURATION.fftSize;
  analyser.smoothingTimeConstant = 0;
  source.connect(analyser);
  const samples = new Float32Array(analyser.fftSize);
  const detector = new AudioActivityDetector();
  let stopped = false;
  let frame: number | undefined;
  let transitions = 0;
  let sampleCount = 0;
  let maximumSampleCost = 0;

  const tick = () => {
    if (stopped) return;
    const started = performance.now();
    analyser.getFloatTimeDomainData(samples);
    let sumSquares = 0;
    for (const value of samples) sumSquares += value * value;
    const rms = Math.sqrt(sumSquares / samples.length);
    sampleCount += 1;
    maximumSampleCost = Math.max(maximumSampleCost, performance.now() - started);
    const transition = detector.sample(rms);
    if (transition !== undefined) {
      transitions += 1;
      onTransition({
        active: transition,
        observedAtMs: performance.now(),
        rms: roundRms(rms),
      });
    }
    frame = window.requestAnimationFrame(tick);
  };

  void context.resume().catch(() => undefined);
  frame = window.requestAnimationFrame(tick);
  return {
    snapshot: () => ({
      active: detector.isActive(),
      transitions,
      samples: sampleCount,
      maxSampleCostMs: Math.round(maximumSampleCost * 1_000) / 1_000,
    }),
    stop: () => {
      if (stopped) return;
      stopped = true;
      if (frame !== undefined) window.cancelAnimationFrame(frame);
      analyser.disconnect();
      source.disconnect();
      void context.close().catch(() => undefined);
    },
  };
}

function bounded(value: number, minimum: number, maximum: number): number {
  if (!Number.isFinite(value) || value < minimum || value > maximum) {
    throw new Error("Audio-activity threshold is outside its bounded contract.");
  }
  return value;
}

function integer(value: number, minimum: number, maximum: number): number {
  if (!Number.isInteger(value) || value < minimum || value > maximum) {
    throw new Error("Audio-activity frame count is outside its bounded contract.");
  }
  return value;
}

function roundRms(value: number): number {
  return Math.round(value * 10_000) / 10_000;
}
