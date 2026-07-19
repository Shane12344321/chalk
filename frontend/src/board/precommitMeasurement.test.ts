import { describe, expect, it } from "vitest";
import {
  createBrowserMeasurementRuntime,
  PrecommitMeasurementCache,
  type MeasurementRuntime,
} from "./precommitMeasurement";

function runtime(overrides: Partial<MeasurementRuntime> = {}): MeasurementRuntime {
  return {
    now: () => 0,
    handwritingFontReady: () => true,
    measureHandwriting: () => ({ width: 240, height: 70 }),
    measureEquation: () => ({ width: 320, height: 84 }),
    ...overrides,
  };
}

describe("PrecommitMeasurementCache", () => {
  it("checks the exact production handwriting fallback stack after fonts settle", () => {
    let query = "";
    const documentValue = {
      fonts: {
        status: "loaded",
        check: (value: string) => {
          query = value;
          return true;
        },
      },
    } as unknown as Document;
    const browserRuntime = createBrowserMeasurementRuntime(documentValue);
    expect(browserRuntime.handwritingFontReady()).toBe(true);
    expect(query).toContain('"Chalkboard SE", "Comic Sans MS", "Bradley Hand", cursive');

    (documentValue.fonts as unknown as { status: string }).status = "loading";
    expect(browserRuntime.handwritingFontReady()).toBe(false);
  });

  it("measures text and equations once and reuses normalized cache entries", () => {
    let textCalls = 0;
    const cache = new PrecommitMeasurementCache(runtime({
      measureHandwriting: () => {
        textCalls += 1;
        return { width: 240, height: 70 };
      },
    }));
    const first = cache.measure([
      { id: "t1", kind: "text", content: "  slope   at a point ", maxWidth: 400 },
      { id: "eq1", kind: "equation", content: "f'(x)=2x", maxWidth: 500 },
    ]);
    const second = cache.measure([
      { id: "t2", kind: "text", content: "slope at a point", maxWidth: 400 },
    ]);

    expect(first.unavailableIds).toEqual([]);
    expect(first.measurements.get("t1")).toMatchObject({ width: 240, height: 70, evidence: "measured" });
    expect(first.measurements.get("eq1")).toMatchObject({ width: 320, height: 84, evidence: "measured" });
    expect(second.measurements.get("t2")).toMatchObject({ width: 240, evidence: "measured" });
    expect(textCalls).toBe(1);
  });

  it("falls back deterministically and reports unavailable fonts", () => {
    const cache = new PrecommitMeasurementCache(runtime({
      handwritingFontReady: () => false,
    }));
    const result = cache.measure([
      { id: "t1", kind: "text", content: "A deliberately long explanation", maxWidth: 260 },
    ]);

    expect(result.unavailableIds).toEqual(["t1"]);
    expect(result.measurements.get("t1")?.evidence).toBe("estimated");
    expect(result.measurements.get("t1")?.width).toBeLessThanOrEqual(260);
    expect(cache.lookup({
      id: "t1",
      kind: "text",
      content: "A deliberately long explanation",
      maxWidth: 260,
    })?.evidence).toBe("estimated");
  });

  it("bounds measurement time and estimates all remaining roots", () => {
    let clock = 0;
    const cache = new PrecommitMeasurementCache(runtime({
      now: () => {
        clock += 6;
        return clock;
      },
    }), 10);
    const result = cache.measure([
      { id: "t1", kind: "text", content: "first", maxWidth: 300 },
      { id: "t2", kind: "text", content: "second", maxWidth: 300 },
      { id: "eq1", kind: "equation", content: "x^2", maxWidth: 300 },
    ]);

    expect(result.timedOut).toBe(true);
    expect(result.unavailableIds).toContain("t2");
    expect(result.unavailableIds).toContain("eq1");
  });

  it("rejects invalid runtime measurements without propagating NaN", () => {
    const cache = new PrecommitMeasurementCache(runtime({
      measureEquation: () => ({ width: Number.NaN, height: 10 }),
    }));
    const result = cache.measure([
      { id: "eq1", kind: "equation", content: "x=1", maxWidth: 300 },
    ]);

    expect(result.measurements.get("eq1")).toEqual({
      id: "eq1",
      width: 220,
      height: 92,
      evidence: "estimated",
    });
    expect(result.unavailableIds).toEqual(["eq1"]);
  });

  it("contains a measurement runtime failure to the affected root", () => {
    const cache = new PrecommitMeasurementCache(runtime({
      measureEquation: () => { throw new Error("synthetic DOM failure"); },
    }));
    const result = cache.measure([
      { id: "eq1", kind: "equation", content: "x=1", maxWidth: 300 },
    ]);

    expect(result.measurements.get("eq1")?.evidence).toBe("estimated");
    expect(result.unavailableIds).toEqual(["eq1"]);
  });

  it("pins a fallback for one lesson so later font readiness cannot move committed ink", () => {
    let ready = false;
    const cache = new PrecommitMeasurementCache(runtime({
      handwritingFontReady: () => ready,
      measureHandwriting: () => ({ width: 290, height: 80 }),
    }));
    const root = { id: "t1", kind: "text" as const, content: "Pinned", maxWidth: 400 };
    const fallback = cache.measure([root]).measurements.get("t1");
    ready = true;
    const sameLesson = cache.measure([root]).measurements.get("t1");

    expect(fallback?.evidence).toBe("estimated");
    expect(sameLesson).toEqual(fallback);

    cache.beginLesson();
    const nextLesson = cache.measure([root]).measurements.get("t1");
    expect(nextLesson).toMatchObject({ evidence: "measured", width: 290, height: 80 });
  });
});
