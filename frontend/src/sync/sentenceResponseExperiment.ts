export type SentenceResponseMode = "single_response" | "per_sentence";

export interface SentenceResponsePlan {
  schema: "chalk.sentence-response-plan.v1";
  experimentId: string;
  mode: SentenceResponseMode;
  segments: readonly string[];
  responseCallCeiling: number;
}

export interface SentenceResponseSummary {
  schema: "chalk.sentence-response-evidence.v1";
  experimentId: string;
  mode: SentenceResponseMode;
  plannedResponses: number;
  requestedResponses: number;
  completedResponses: number;
  failedResponses: number;
  interrupted: boolean;
  totalLatencyMs?: number;
  interSentenceGapMs: readonly number[];
}

interface SegmentEvidence {
  requestedAtMs?: number;
  activityAtMs?: number;
  generationDoneAtMs?: number;
  playbackStoppedAtMs?: number;
  failed?: boolean;
}

const MAX_SCRIPT_CHARACTERS = 240;
const MAX_SENTENCE_RESPONSES = 5;

/** Build a fixed-call comparison plan without making or authorizing any call. */
export function prepareSentenceResponsePlan(
  experimentId: string,
  script: string,
  mode: SentenceResponseMode,
): SentenceResponsePlan {
  if (!/^[a-z][a-z0-9-]{2,47}$/u.test(experimentId)) {
    throw new Error("Sentence experiment ID is outside its closed contract.");
  }
  const normalized = script.replace(/\s+/gu, " ").trim();
  if (normalized.length < 2 || normalized.length > MAX_SCRIPT_CHARACTERS) {
    throw new Error("Sentence experiment script is outside its character budget.");
  }
  const sentences = splitSentences(normalized);
  if (mode === "per_sentence" && (sentences.length < 2 || sentences.length > MAX_SENTENCE_RESPONSES)) {
    throw new Error("Per-sentence comparison requires two to five complete sentences.");
  }
  const segments = mode === "single_response" ? [normalized] : sentences;
  return {
    schema: "chalk.sentence-response-plan.v1",
    experimentId,
    mode,
    segments,
    responseCallCeiling: segments.length,
  };
}

/**
 * Content-free evidence collector for the owner-approved live comparison. It
 * enforces serial responses and records only timing/count metadata.
 */
export class SentenceResponseEvidenceCollector {
  private readonly evidence: SegmentEvidence[];
  private interrupted = false;

  constructor(private readonly plan: SentenceResponsePlan) {
    this.evidence = plan.segments.map(() => ({}));
  }

  request(index: number, atMs: number): boolean {
    const current = this.evidence[index];
    if (
      this.interrupted ||
      !current ||
      current.requestedAtMs !== undefined ||
      !finiteTime(atMs)
    ) {
      return false;
    }
    if (index > 0) {
      const previous = this.evidence[index - 1];
      // The comparison is deliberately no-retry and first-failure terminal.
      // A failed segment is evidence, never permission to spend the next call.
      if (!settled(previous) || previous.failed || previous.playbackStoppedAtMs === undefined) {
        return false;
      }
      if (atMs < previous.playbackStoppedAtMs) return false;
    }
    current.requestedAtMs = atMs;
    return true;
  }

  activity(index: number, atMs: number): boolean {
    const current = this.evidence[index];
    if (
      current?.requestedAtMs === undefined ||
      current.activityAtMs !== undefined ||
      !finiteTime(atMs) ||
      atMs < current.requestedAtMs
    ) {
      return false;
    }
    current.activityAtMs = atMs;
    return true;
  }

  generationDone(index: number, atMs: number): boolean {
    const current = this.evidence[index];
    if (
      current?.requestedAtMs === undefined ||
      current.generationDoneAtMs !== undefined ||
      !finiteTime(atMs) ||
      atMs < current.requestedAtMs
    ) {
      return false;
    }
    current.generationDoneAtMs = atMs;
    return true;
  }

  playbackStopped(index: number, atMs: number): boolean {
    const current = this.evidence[index];
    if (
      current?.requestedAtMs === undefined ||
      current.playbackStoppedAtMs !== undefined ||
      !finiteTime(atMs) ||
      atMs < current.requestedAtMs
    ) {
      return false;
    }
    current.playbackStoppedAtMs = atMs;
    return true;
  }

  fail(index: number): boolean {
    const current = this.evidence[index];
    if (
      current?.requestedAtMs === undefined ||
      settled(current) ||
      this.evidence.slice(0, index).some((item) => item.failed)
    ) {
      return false;
    }
    current.failed = true;
    return true;
  }

  interrupt(): void {
    this.interrupted = true;
  }

  summary(): SentenceResponseSummary {
    const requested = this.evidence.filter((item) => item.requestedAtMs !== undefined);
    const completed = this.evidence.filter(
      (item) => item.generationDoneAtMs !== undefined && item.playbackStoppedAtMs !== undefined,
    );
    const gaps: number[] = [];
    for (let index = 1; index < this.evidence.length; index += 1) {
      const previousStop = this.evidence[index - 1].playbackStoppedAtMs;
      const activity = this.evidence[index].activityAtMs;
      if (previousStop !== undefined && activity !== undefined) gaps.push(activity - previousStop);
    }
    const firstRequest = this.evidence[0]?.requestedAtMs;
    const finalStop = this.evidence.at(-1)?.playbackStoppedAtMs;
    return {
      schema: "chalk.sentence-response-evidence.v1",
      experimentId: this.plan.experimentId,
      mode: this.plan.mode,
      plannedResponses: this.evidence.length,
      requestedResponses: requested.length,
      completedResponses: completed.length,
      failedResponses: this.evidence.filter((item) => item.failed).length,
      interrupted: this.interrupted,
      ...(firstRequest !== undefined && finalStop !== undefined
        ? { totalLatencyMs: finalStop - firstRequest }
        : {}),
      interSentenceGapMs: gaps,
    };
  }
}

function splitSentences(script: string): string[] {
  return script
    .split(/(?<=[.!?])\s+(?=[A-Z0-9])/u)
    .map((sentence) => sentence.trim())
    .filter(Boolean);
}

function settled(evidence: SegmentEvidence): boolean {
  return Boolean(
    evidence.failed ||
      (evidence.generationDoneAtMs !== undefined && evidence.playbackStoppedAtMs !== undefined),
  );
}

function finiteTime(value: number): boolean {
  return Number.isFinite(value) && value >= 0;
}
