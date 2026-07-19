import { describe, expect, it, vi } from "vitest";
import { captureTldrawBoardImage } from "./tldrawCapture";

describe("captureTldrawBoardImage", () => {
  it("exports only fully committed CHALK shapes over the board crop", async () => {
    const toImage = vi.fn().mockResolvedValue({
      blob: new Blob(["png"], { type: "image/png" }),
      width: 800,
      height: 450,
    });
    const result = await captureTldrawBoardImage({
      getCurrentPageShapes: () => [
        { id: "shape:done", type: "chalk-board-element", props: { progress: 1 } },
        { id: "shape:partial", type: "chalk-board-element", props: { progress: 0.5 } },
        { id: "shape:chrome", type: "note", props: {} },
      ] as never,
      toImage,
    } as never);

    expect(result).toMatchObject({ width: 800, height: 450 });
    expect(toImage).toHaveBeenCalledTimes(1);
    const [shapes, options] = toImage.mock.calls[0];
    expect(shapes).toHaveLength(1);
    expect(shapes[0].id).toBe("shape:done");
    expect(options).toMatchObject({ format: "png", scale: 0.5, padding: 0 });
  });

  it("does not capture an empty or provisional-only board", async () => {
    const toImage = vi.fn();
    const result = await captureTldrawBoardImage({
      getCurrentPageShapes: () => [
        { id: "shape:partial", type: "chalk-board-element", props: { progress: 0.5 } },
      ] as never,
      toImage,
    } as never);
    expect(result).toBeUndefined();
    expect(toImage).not.toHaveBeenCalled();
  });
});
