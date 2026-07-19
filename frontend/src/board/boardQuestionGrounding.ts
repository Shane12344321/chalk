import { toAnnotationVisibleElements, type VisibleBoardElement } from "./manifest";

export type BoardQuestionGroundingMode = "structured" | "structured-image";

export interface GroundedBoardQuestion {
  mode: "structured" | "structured-image";
  text: string;
  image?: { type: "input_image"; image_url: string; detail: "low" };
}

const MAX_QUESTION_CHARS = 400;
const MAX_IMAGE_DATA_URL_CHARS = 4 * 1024 * 1024 * 1.4;

export function configuredBoardQuestionGrounding(value: unknown): BoardQuestionGroundingMode {
  return value === "structured-image" ? "structured-image" : "structured";
}

/**
 * Builds evaluation input only. It does not send an API request and defaults to
 * structured truth. A malformed/unavailable image fails closed to structured.
 */
export function buildGroundedBoardQuestion(options: {
  mode: BoardQuestionGroundingMode;
  question: string;
  elements: readonly VisibleBoardElement[];
  imageDataUrl?: string;
}): GroundedBoardQuestion {
  const visibleElements = options.elements.slice(-30).map((element, index) => ({
    ...toAnnotationVisibleElements([element])[0],
    summary: compact(element.summary, 120),
    order: index,
  }));
  const text = JSON.stringify({
    question: compact(options.question, MAX_QUESTION_CHARS),
    coordinate_system: "normalized board coordinates, origin top-left, y-down",
    authority: "visible_elements IDs, kinds, bounds, and summaries are authoritative",
    visible_elements: visibleElements,
  });
  if (options.mode !== "structured-image" || !validImageDataUrl(options.imageDataUrl)) {
    return { mode: "structured", text };
  }
  return {
    mode: "structured-image",
    text,
    image: { type: "input_image", image_url: options.imageDataUrl, detail: "low" },
  };
}

/** Never expose the in-memory image while producing diagnostic evidence. */
export function groundingEvidence(value: GroundedBoardQuestion): {
  mode: GroundedBoardQuestion["mode"];
  structuredChars: number;
  imagePresent: boolean;
} {
  return {
    mode: value.mode,
    structuredChars: value.text.length,
    imagePresent: value.image !== undefined,
  };
}

function validImageDataUrl(value: string | undefined): value is string {
  return value !== undefined &&
    value.length <= MAX_IMAGE_DATA_URL_CHARS &&
    /^data:image\/(?:png|jpeg|webp);base64,[a-zA-Z0-9+/]+=*$/u.test(value);
}

function compact(value: string, maximum: number): string {
  const normalized = value.replace(/\s+/gu, " ").trim();
  return normalized.length <= maximum
    ? normalized
    : `${normalized.slice(0, maximum - 1).trimEnd()}…`;
}
