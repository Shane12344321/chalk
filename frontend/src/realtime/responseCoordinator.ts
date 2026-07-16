import type { NarrationContext } from "./types";

export type ResponsePurpose =
  | "lesson_narration"
  | "checkpoint_prompt"
  | "checkpoint_feedback"
  | "student_qa"
  | "diagnostic_tool";

export interface CoordinatedResponse {
  purpose: ResponsePurpose;
  context?: NarrationContext;
  clientEventId?: string;
  responseId?: string;
  successfulEchoes: number;
  activitySeen: boolean;
  generationDone: boolean;
  playbackStopped: boolean;
}

interface RegisterResponseOptions {
  purpose: ResponsePurpose;
  context?: NarrationContext;
  clientEventId?: string;
  successfulEchoes?: number;
}

const MAX_COORDINATED_RESPONSES = 32;

export class ResponseCoordinator {
  private readonly pendingManual = new Map<string, CoordinatedResponse>();
  private readonly byResponseId = new Map<string, CoordinatedResponse>();
  private pendingAutomatic?: CoordinatedResponse;

  registerManual(options: RegisterResponseOptions & { clientEventId: string }): void {
    if (this.pendingManual.has(options.clientEventId)) {
      throw new Error("Response event ID is already registered.");
    }
    this.ensureCapacity();
    this.pendingManual.set(options.clientEventId, createRecord(options));
  }

  armAutomatic(options: Omit<RegisterResponseOptions, "clientEventId">): void {
    if (this.pendingAutomatic) {
      if (sameRegistration(this.pendingAutomatic, options)) return;
      throw new Error("An automatic response purpose is already armed.");
    }
    this.ensureCapacity();
    this.pendingAutomatic = createRecord(options);
  }

  cancelAutomatic(
    purpose: ResponsePurpose,
    context: NarrationContext,
  ): boolean {
    if (
      !this.pendingAutomatic ||
      !sameRegistration(this.pendingAutomatic, { purpose, context })
    ) {
      return false;
    }
    this.pendingAutomatic = undefined;
    return true;
  }

  bindCreated(
    responseId: string,
    metadata?: Readonly<Record<string, string>>,
  ): CoordinatedResponse | undefined {
    if (this.byResponseId.has(responseId)) return this.byResponseId.get(responseId);
    const manual = this.findManual(metadata);
    const record = manual ?? this.pendingAutomatic;
    if (!record) return undefined;
    if (manual?.clientEventId) this.pendingManual.delete(manual.clientEventId);
    if (record === this.pendingAutomatic) this.pendingAutomatic = undefined;
    record.responseId = responseId;
    this.byResponseId.set(responseId, record);
    return record;
  }

  get(responseId: string | undefined): CoordinatedResponse | undefined {
    return responseId ? this.byResponseId.get(responseId) : undefined;
  }

  hasPurpose(purpose: ResponsePurpose): boolean {
    if (this.pendingAutomatic?.purpose === purpose) return true;
    for (const record of this.pendingManual.values()) {
      if (record.purpose === purpose) return true;
    }
    for (const record of this.byResponseId.values()) {
      if (record.purpose === purpose) return true;
    }
    return false;
  }

  markActivity(responseId: string): CoordinatedResponse | undefined {
    const record = this.byResponseId.get(responseId);
    if (record) record.activitySeen = true;
    return record;
  }

  markGenerationDone(responseId: string): CoordinatedResponse | undefined {
    const record = this.byResponseId.get(responseId);
    if (record) record.generationDone = true;
    return record;
  }

  markPlaybackStopped(responseId: string): CoordinatedResponse | undefined {
    const record = this.byResponseId.get(responseId);
    if (record) record.playbackStopped = true;
    return record;
  }

  failByClientEventId(clientEventId: string): CoordinatedResponse | undefined {
    const record = this.pendingManual.get(clientEventId);
    if (record) this.pendingManual.delete(clientEventId);
    return record;
  }

  releaseIfSettled(responseId: string): void {
    const record = this.byResponseId.get(responseId);
    if (record?.generationDone && record.playbackStopped) {
      this.byResponseId.delete(responseId);
    }
  }

  release(responseId: string): void {
    this.byResponseId.delete(responseId);
  }

  reset(): void {
    this.pendingManual.clear();
    this.byResponseId.clear();
    this.pendingAutomatic = undefined;
  }

  private findManual(
    metadata?: Readonly<Record<string, string>>,
  ): CoordinatedResponse | undefined {
    if (!metadata) return undefined;
    for (const record of this.pendingManual.values()) {
      if (metadataMatches(record, metadata)) return record;
    }
    return undefined;
  }

  private ensureCapacity(): void {
    if (
      this.pendingManual.size +
        this.byResponseId.size +
        (this.pendingAutomatic ? 1 : 0) >=
      MAX_COORDINATED_RESPONSES
    ) {
      throw new Error("Response coordination capacity reached.");
    }
  }
}

function createRecord(options: RegisterResponseOptions): CoordinatedResponse {
  return {
    purpose: options.purpose,
    ...(options.context ? { context: { ...options.context } } : {}),
    ...(options.clientEventId ? { clientEventId: options.clientEventId } : {}),
    successfulEchoes: options.successfulEchoes ?? 0,
    activitySeen: false,
    generationDone: false,
    playbackStopped: false,
  };
}

function sameRegistration(
  record: CoordinatedResponse,
  options: Omit<RegisterResponseOptions, "clientEventId">,
): boolean {
  return (
    record.purpose === options.purpose &&
    record.context?.requestId === options.context?.requestId &&
    record.context?.stepId === options.context?.stepId &&
    record.context?.cycle === options.context?.cycle
  );
}

function metadataMatches(
  record: CoordinatedResponse,
  metadata: Readonly<Record<string, string>>,
): boolean {
  if (metadata.chalk_kind !== record.purpose) return false;
  if (!record.context) return true;
  return (
    metadata.chalk_request_id === record.context.requestId &&
    metadata.chalk_step_id === record.context.stepId &&
    metadata.chalk_cycle === String(record.context.cycle)
  );
}
