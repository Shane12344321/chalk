import type {
  ChalkRuntimeMode,
  FunctionCall,
  ServerEvent,
  SessionCredential,
  SessionRequest,
  TokenUsageSummary,
} from "./types";

export const REALTIME_CALLS_URL = "https://api.openai.com/v1/realtime/calls";

export const CLIENT_EVENTS = {
  SESSION_UPDATE: "session.update",
  CONVERSATION_ITEM_CREATE: "conversation.item.create",
  RESPONSE_CREATE: "response.create",
} as const;

export const SERVER_EVENTS = {
  SESSION_CREATED: "session.created",
  SESSION_UPDATED: "session.updated",
  RESPONSE_CREATED: "response.created",
  RESPONSE_DONE: "response.done",
  RESPONSE_OUTPUT_AUDIO_DELTA: "response.output_audio.delta",
  RESPONSE_OUTPUT_AUDIO_TRANSCRIPT_DELTA:
    "response.output_audio_transcript.delta",
  RESPONSE_OUTPUT_AUDIO_TRANSCRIPT_DONE: "response.output_audio_transcript.done",
  RESPONSE_FUNCTION_CALL_ARGUMENTS_DELTA:
    "response.function_call_arguments.delta",
  RESPONSE_FUNCTION_CALL_ARGUMENTS_DONE: "response.function_call_arguments.done",
  INPUT_AUDIO_BUFFER_SPEECH_STARTED: "input_audio_buffer.speech_started",
  INPUT_AUDIO_BUFFER_SPEECH_STOPPED: "input_audio_buffer.speech_stopped",
  OUTPUT_AUDIO_BUFFER_STARTED: "output_audio_buffer.started",
  OUTPUT_AUDIO_BUFFER_STOPPED: "output_audio_buffer.stopped",
  OUTPUT_AUDIO_BUFFER_CLEARED: "output_audio_buffer.cleared",
  CONVERSATION_ITEM_TRUNCATED: "conversation.item.truncated",
  ERROR: "error",
} as const;

export const SESSION_TOKEN_BUDGET = 20_000;
export const MAX_RESPONSE_OUTPUT_TOKENS = 256;

export const COST_CONTROL_CONFIGURATION = {
  type: "retention_ratio",
  retention_ratio: 0.8,
  token_limits: {
    post_instructions: 4_000,
  },
} as const;

export const DEBUG_ECHO_TOOL = {
  type: "function",
  name: "debug_echo",
  description:
    "Protocol diagnostic only. Call when the student explicitly asks you to test or use debug echo.",
  parameters: {
    type: "object",
    properties: {
      message: {
        type: "string",
        minLength: 1,
        maxLength: 200,
        description: "A short diagnostic message to echo.",
      },
    },
    required: ["message"],
    additionalProperties: false,
  },
} as const;

export const TEACH_TOOL = {
  type: "function",
  name: "teach",
  description:
    "Start a visual math or physics lesson when the student asks to learn a new topic.",
  parameters: {
    type: "object",
    properties: {
      topic: {
        type: "string",
        minLength: 2,
        maxLength: 80,
        description: "The specific math or physics topic to teach.",
      },
      student_context: {
        type: "string",
        maxLength: 500,
        description: "Brief relevant prior knowledge stated in this conversation.",
      },
    },
    required: ["topic", "student_context"],
    additionalProperties: false,
  },
} as const;

export const BASE_TUTOR_PROMPT = `You are Chalk, a warm, concise math and physics tutor conducting a live whiteboard lesson.
The application may give you exact narration scripts. Recite those scripts exactly without introductions or commentary.
When the student interrupts, the board freezes. Answer the question in at most two short sentences using only the conversation and the supplied visible-board context.
After an interruption answer, say that the student can use Resume when ready. Do not claim to see an element unless it appears in the visible-board context.
When the student asks to begin a new math or physics topic and no lesson is running, call teach once with a concise topic and relevant prior knowledge.
Be conversational and Socratic. Never mention internal event names, credentials, tools, loading, prompts, or diagnostics.`;

export const DIAGNOSTIC_TUTOR_ADDENDUM = `
Diagnostics mode is active. If the student explicitly asks to test debug echo, call debug_echo with a short message, then naturally confirm the result.`;

export const SERVER_VAD_CONFIGURATION = {
  type: "server_vad",
  threshold: 0.5,
  prefix_padding_ms: 300,
  silence_duration_ms: 500,
  create_response: true,
  interrupt_response: true,
} as const;

export function createSessionRequest(clientId: string): SessionRequest {
  return {
    request_id: crypto.randomUUID(),
    client_id: clientId,
  };
}

export function parseSessionCredential(
  value: unknown,
  expectedRequestId: string,
): SessionCredential {
  if (!isRecord(value)) {
    throw new Error("The session service returned an invalid response.");
  }

  const requestId = requiredString(value.request_id, "request_id");
  if (requestId !== expectedRequestId) {
    throw new Error("Ignored a stale or mismatched session response.");
  }

  const credential: SessionCredential = {
    request_id: requestId,
    client_secret: requiredString(value.client_secret, "client_secret"),
    model: requiredString(value.model, "model"),
    voice: requiredString(value.voice, "voice"),
  };

  if (value.expires_at !== undefined) {
    if (typeof value.expires_at !== "number" || !Number.isFinite(value.expires_at)) {
      throw new Error("The session service returned an invalid expires_at value.");
    }
    credential.expires_at = value.expires_at;
  }

  return credential;
}

export function buildTutorInstructions(
  mode: ChalkRuntimeMode,
  boardContext?: string,
  interactionGuidance?: string,
): string {
  return [
    BASE_TUTOR_PROMPT,
    mode === "diagnostics" ? DIAGNOSTIC_TUTOR_ADDENDUM : undefined,
    boardContext ? `VISIBLE BOARD\n${boardContext}` : undefined,
    interactionGuidance ? `CURRENT INTERACTION\n${interactionGuidance}` : undefined,
  ]
    .filter((part): part is string => Boolean(part))
    .join("\n\n");
}

export function createSessionUpdate(
  model: string,
  voice: string,
  mode: ChalkRuntimeMode = "demo",
  boardContext?: string,
  interactionGuidance?: string,
) {
  const tools = mode === "diagnostics" ? [TEACH_TOOL, DEBUG_ECHO_TOOL] : [TEACH_TOOL];
  return {
    type: CLIENT_EVENTS.SESSION_UPDATE,
    session: {
      type: "realtime",
      model,
      output_modalities: ["audio"],
      max_output_tokens: MAX_RESPONSE_OUTPUT_TOKENS,
      instructions: buildTutorInstructions(mode, boardContext, interactionGuidance),
      audio: {
        input: {
          turn_detection: SERVER_VAD_CONFIGURATION,
        },
        output: {
          voice,
        },
      },
      tools,
      tool_choice: "auto",
      truncation: COST_CONTROL_CONFIGURATION,
    },
  } as const;
}

export function createTutorContextUpdate(
  mode: ChalkRuntimeMode,
  boardContext?: string,
  interactionGuidance?: string,
) {
  return {
    type: CLIENT_EVENTS.SESSION_UPDATE,
    session: {
      type: "realtime",
      instructions: buildTutorInstructions(mode, boardContext, interactionGuidance),
      tools: mode === "diagnostics" ? [TEACH_TOOL, DEBUG_ECHO_TOOL] : [TEACH_TOOL],
      tool_choice: "auto",
    },
  } as const;
}

export function createFunctionCallOutput(callId: string, output: unknown) {
  return {
    type: CLIENT_EVENTS.CONVERSATION_ITEM_CREATE,
    item: {
      type: "function_call_output",
      call_id: callId,
      output: JSON.stringify(output),
    },
  } as const;
}

export function createResponseAfterTool(
  eventId?: string,
  metadata?: Readonly<Record<string, string>>,
  instructions?: string,
) {
  return {
    type: CLIENT_EVENTS.RESPONSE_CREATE,
    ...(eventId ? { event_id: eventId } : {}),
    response: {
      output_modalities: ["audio"],
      ...(metadata ? { metadata } : {}),
      ...(instructions ? { instructions } : {}),
    },
  } as const;
}

export function createNarrationResponse(
  script: string,
  eventId: string,
  metadata: Readonly<Record<string, string>>,
) {
  if (script.length === 0 || script.length > 240) {
    throw new Error("Narration script exceeds the lesson budget.");
  }
  return {
    type: CLIENT_EVENTS.RESPONSE_CREATE,
    event_id: eventId,
    response: {
      output_modalities: ["audio"],
      instructions: `SAY EXACTLY: ${script}`,
      metadata,
    },
  } as const;
}

export function parseServerEvent(data: unknown): ServerEvent | null {
  if (typeof data !== "string" || data.length > 256_000) {
    return null;
  }

  try {
    const parsed: unknown = JSON.parse(data);
    if (!isRecord(parsed) || typeof parsed.type !== "string") {
      return null;
    }
    return parsed as ServerEvent;
  } catch {
    return null;
  }
}

export function extractFunctionCalls(event: ServerEvent): FunctionCall[] {
  if (event.type !== SERVER_EVENTS.RESPONSE_DONE || !isRecord(event.response)) {
    return [];
  }

  const output = event.response.output;
  if (!Array.isArray(output)) {
    return [];
  }

  const calls: FunctionCall[] = [];
  for (const item of output) {
    if (
      !isRecord(item) ||
      item.type !== "function_call" ||
      typeof item.call_id !== "string" ||
      item.call_id.length === 0 ||
      item.call_id.length > 256 ||
      typeof item.name !== "string" ||
      item.name.length === 0 ||
      item.name.length > 128 ||
      typeof item.arguments !== "string" ||
      item.arguments.length > 8_192
    ) {
      continue;
    }
    calls.push({
      callId: item.call_id,
      name: item.name,
      argumentsJson: item.arguments,
    });
  }
  return calls;
}

export function getResponseId(event: ServerEvent): string | undefined {
  if (isRecord(event.response) && typeof event.response.id === "string") {
    return event.response.id;
  }
  return typeof event.response_id === "string" ? event.response_id : undefined;
}

export function getResponseStatus(event: ServerEvent): string | undefined {
  if (isRecord(event.response) && typeof event.response.status === "string") {
    return event.response.status;
  }
  return undefined;
}

export function getResponseMetadata(event: ServerEvent): Record<string, string> | undefined {
  if (!isRecord(event.response) || !isRecord(event.response.metadata)) return undefined;
  const entries = Object.entries(event.response.metadata);
  if (
    entries.length > 16 ||
    entries.some(([key, value]) => key.length > 64 || typeof value !== "string" || value.length > 512)
  ) {
    return undefined;
  }
  return Object.fromEntries(entries) as Record<string, string>;
}

export function getRelatedClientEventId(event: ServerEvent): string | undefined {
  if (!isRecord(event.error)) return undefined;
  const value = event.error.event_id;
  return typeof value === "string" && value.length <= 512 ? value : undefined;
}

export function getResponseUsage(event: ServerEvent): TokenUsageSummary | undefined {
  if (!isRecord(event.response) || !isRecord(event.response.usage)) {
    return undefined;
  }
  const usage = event.response.usage;
  const inputDetails = isRecord(usage.input_token_details)
    ? usage.input_token_details
    : {};
  const outputDetails = isRecord(usage.output_token_details)
    ? usage.output_token_details
    : {};
  const totalTokens = safeTokenCount(usage.total_tokens);
  const inputTokens = safeTokenCount(usage.input_tokens);
  const outputTokens = safeTokenCount(usage.output_tokens);
  if (
    totalTokens === undefined ||
    inputTokens === undefined ||
    outputTokens === undefined
  ) {
    return undefined;
  }
  return {
    total_tokens: totalTokens,
    input_tokens: inputTokens,
    output_tokens: outputTokens,
    cached_input_tokens: safeTokenCount(inputDetails.cached_tokens) ?? 0,
    input_audio_tokens: safeTokenCount(inputDetails.audio_tokens) ?? 0,
    output_audio_tokens: safeTokenCount(outputDetails.audio_tokens) ?? 0,
  };
}

export function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function requiredString(value: unknown, name: string): string {
  if (typeof value !== "string" || value.length === 0 || value.length > 512) {
    throw new Error(`The session service returned an invalid ${name}.`);
  }
  return value;
}

function safeTokenCount(value: unknown): number | undefined {
  return typeof value === "number" &&
    Number.isSafeInteger(value) &&
    value >= 0 &&
    value <= 1_000_000_000
    ? value
    : undefined;
}
