import type { AnnotationProgram } from "./annotation.generated";
import { annotationSchemaErrors, isAnnotationProgram } from "./schema";

const MAX_RESPONSE_BYTES = 32 * 1024;

export interface AnnotationRequest {
  requestId: string;
  manifestVersion: number;
  question: string;
  boardManifest: string;
  visibleElementIds: string[];
}

export interface AnnotationResult {
  program: AnnotationProgram;
  repairs: number;
  boardModel?: string;
  promptSha256?: string;
}

export class AnnotationClient {
  private active?: { requestId: string; controller: AbortController };

  constructor(
    private readonly apiBaseUrl: string,
    private readonly clientId: string,
    private readonly fetchImpl: typeof fetch = globalThis.fetch.bind(globalThis),
  ) {}

  start(request: AnnotationRequest): Promise<AnnotationResult> {
    this.cancel();
    const controller = new AbortController();
    this.active = { requestId: request.requestId, controller };
    return requestAnnotation({
      apiBaseUrl: this.apiBaseUrl,
      clientId: this.clientId,
      request,
      signal: controller.signal,
      fetchImpl: this.fetchImpl,
    })
      .then((result) => {
        if (this.active?.requestId !== request.requestId) {
          throw new DOMException("Stale annotation result.", "AbortError");
        }
        return result;
      })
      .finally(() => {
        if (this.active?.requestId === request.requestId) this.active = undefined;
      });
  }

  cancel(): void {
    this.active?.controller.abort();
    this.active = undefined;
  }
}

export async function requestAnnotation(options: {
  apiBaseUrl: string;
  clientId: string;
  request: AnnotationRequest;
  signal?: AbortSignal;
  fetchImpl?: typeof fetch;
}): Promise<AnnotationResult> {
  const fetchImpl = options.fetchImpl ?? globalThis.fetch.bind(globalThis);
  const response = await fetchImpl(`${options.apiBaseUrl.replace(/\/$/u, "")}/annotate`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      request_id: options.request.requestId,
      client_id: options.clientId,
      question: options.request.question,
      manifest_version: options.request.manifestVersion,
      board_manifest: options.request.boardManifest,
      visible_element_ids: options.request.visibleElementIds,
    }),
    signal: options.signal,
    cache: "no-store",
  });
  if (!response.ok) throw new Error(`Annotation service failed with HTTP ${response.status}.`);
  if (!response.headers.get("content-type")?.toLowerCase().startsWith("application/json")) {
    throw new Error("Annotation service returned an unexpected content type.");
  }
  const contentLength = response.headers.get("content-length");
  if (contentLength && Number(contentLength) > MAX_RESPONSE_BYTES) {
    throw new Error("Annotation response exceeded its byte budget.");
  }
  const text = await response.text();
  if (new TextEncoder().encode(text).byteLength > MAX_RESPONSE_BYTES) {
    throw new Error("Annotation response exceeded its byte budget.");
  }
  let value: unknown;
  try {
    value = JSON.parse(text);
  } catch {
    throw new Error("Annotation service returned invalid JSON.");
  }
  if (!isAnnotationProgram(value)) {
    throw new Error(`Annotation schema rejected the response: ${annotationSchemaErrors()[0] ?? "invalid"}`);
  }
  if (
    value.request_id !== options.request.requestId ||
    value.manifest_version !== options.request.manifestVersion
  ) {
    throw new Error("Annotation response is stale or mismatched.");
  }
  const allowedTargets = new Set(options.request.visibleElementIds);
  const annotationIds = new Set<string>();
  for (const op of value.ops) {
    if (!allowedTargets.has(op.target_id)) {
      throw new Error("Annotation response targeted an element outside the visible snapshot.");
    }
    if (allowedTargets.has(op.id) || annotationIds.has(op.id)) {
      throw new Error("Annotation response reused an existing element ID.");
    }
    annotationIds.add(op.id);
  }
  const repairs = Number(response.headers.get("x-chalk-annotation-repairs") ?? "0");
  if (!Number.isInteger(repairs) || repairs < 0 || repairs > 2) {
    throw new Error("Annotation response contained invalid repair metadata.");
  }
  return {
    program: value,
    repairs,
    ...(response.headers.get("x-chalk-board-model")
      ? { boardModel: response.headers.get("x-chalk-board-model")! }
      : {}),
    ...(response.headers.get("x-chalk-annotation-prompt-sha256")
      ? { promptSha256: response.headers.get("x-chalk-annotation-prompt-sha256")! }
      : {}),
  };
}
