export interface AcceptedInkHeader {
  requestId: string;
  stepId: string;
  opId: string;
  strokeCount: number;
  pointBudget: number;
}

export interface InkDelta {
  request_id: string;
  step_id: string;
  op_id: string;
  stroke_index: number;
  sequence: number;
  points: [number, number][];
  complete: boolean;
}

export interface ProvisionalInk {
  stepId: string;
  opId: string;
  strokes: readonly (readonly [number, number][])[];
  completeStrokes: readonly boolean[];
}

export type InkDeltaResult =
  | "accepted"
  | "stale_request"
  | "unknown_op"
  | "out_of_order"
  | "invalid_delta"
  | "closed_stroke";

interface MutableStroke {
  nextSequence: number;
  points: [number, number][];
  complete: boolean;
}

interface MutableInk {
  header: AcceptedInkHeader;
  strokes: MutableStroke[];
}

const MAX_STROKES = 6;
const MAX_POINTS = 160;

/**
 * Experimental, append-only store for already validated pen prefixes. It is
 * deliberately independent from lesson assembly: callers must register an
 * accepted operation header before any delta can become visible.
 */
export class PartialInkStore {
  private activeRequestId?: string;
  private readonly ops = new Map<string, MutableInk>();

  beginRequest(requestId: string): void {
    this.activeRequestId = requestId;
    this.ops.clear();
  }

  registerHeader(header: AcceptedInkHeader): boolean {
    if (
      header.requestId !== this.activeRequestId ||
      !validId(header.stepId) ||
      !validId(header.opId) ||
      !Number.isInteger(header.strokeCount) ||
      header.strokeCount < 1 ||
      header.strokeCount > MAX_STROKES ||
      !Number.isInteger(header.pointBudget) ||
      header.pointBudget < 2 ||
      header.pointBudget > MAX_POINTS
    ) return false;
    const key = inkKey(header.stepId, header.opId);
    if (this.ops.has(key)) return false;
    this.ops.set(key, {
      header: { ...header },
      strokes: Array.from({ length: header.strokeCount }, () => ({
        nextSequence: 0,
        points: [],
        complete: false,
      })),
    });
    return true;
  }

  accept(delta: InkDelta): InkDeltaResult {
    if (delta.request_id !== this.activeRequestId) return "stale_request";
    const ink = this.ops.get(inkKey(delta.step_id, delta.op_id));
    if (!ink) return "unknown_op";
    const stroke = ink.strokes[delta.stroke_index];
    if (!stroke) return "invalid_delta";
    if (stroke.complete) return "closed_stroke";
    if (delta.sequence !== stroke.nextSequence) return "out_of_order";
    if (!validPoints(delta.points)) return "invalid_delta";
    const totalPoints = ink.strokes.reduce((sum, item) => sum + item.points.length, 0);
    if (totalPoints + delta.points.length > ink.header.pointBudget) return "invalid_delta";

    stroke.points.push(...delta.points.map(([x, y]) => [x, y] as [number, number]));
    stroke.nextSequence += 1;
    stroke.complete = delta.complete;
    return "accepted";
  }

  snapshot(stepId: string, opId: string): ProvisionalInk | undefined {
    const ink = this.ops.get(inkKey(stepId, opId));
    if (!ink) return undefined;
    return {
      stepId,
      opId,
      strokes: ink.strokes.map((stroke) => stroke.points.map(([x, y]) => [x, y] as const)),
      completeStrokes: ink.strokes.map((stroke) => stroke.complete),
    };
  }

  discard(stepId: string, opId: string): void {
    this.ops.delete(inkKey(stepId, opId));
  }

  cancelRequest(requestId: string): void {
    if (requestId !== this.activeRequestId) return;
    this.activeRequestId = undefined;
    this.ops.clear();
  }
}

function validId(value: string): boolean {
  return /^[a-z][a-z0-9_-]{0,15}$/u.test(value);
}

function validPoints(points: readonly (readonly number[])[]): points is [number, number][] {
  return points.length >= 1 && points.length <= 20 && points.every((point) =>
    point.length === 2 && point.every((coordinate) =>
      Number.isFinite(coordinate) && coordinate >= 0 && coordinate <= 1,
    ),
  );
}

function inkKey(stepId: string, opId: string): string {
  return `${stepId}\u0000${opId}`;
}
