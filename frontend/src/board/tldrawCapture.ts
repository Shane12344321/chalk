import { Box, type Editor, type TLShape } from "tldraw";
import { BOARD_HEIGHT, BOARD_WIDTH } from "./layout";
import { CHALK_SHAPE_TYPE } from "./tldrawShape";

export interface BoardImageCapture {
  blob: Blob;
  width: number;
  height: number;
}

const MAX_CAPTURE_BYTES = 4 * 1024 * 1024;

/**
 * Exports only fully committed CHALK shapes over the logical board bounds, so
 * application chrome, controls, the voice orb, and provisional ink are absent.
 */
export async function captureTldrawBoardImage(
  editor: Pick<Editor, "getCurrentPageShapes" | "toImage">,
): Promise<BoardImageCapture | undefined> {
  const shapes = editor.getCurrentPageShapes().filter(isCommittedChalkShape);
  if (shapes.length === 0) return undefined;
  const result = await editor.toImage(shapes, {
    bounds: new Box(0, 0, BOARD_WIDTH, BOARD_HEIGHT),
    format: "png",
    background: true,
    padding: 0,
    pixelRatio: 1,
    scale: 0.5,
    darkMode: false,
  });
  if (
    result.width > BOARD_WIDTH ||
    result.height > BOARD_HEIGHT ||
    result.blob.type !== "image/png" ||
    result.blob.size <= 0 ||
    result.blob.size > MAX_CAPTURE_BYTES
  ) throw new Error("Board image capture exceeded its safe bounds.");
  return result;
}

function isCommittedChalkShape(shape: TLShape): boolean {
  if (shape.type !== CHALK_SHAPE_TYPE) return false;
  const progress = (shape.props as { progress?: unknown }).progress;
  return typeof progress === "number" && progress >= 0.999;
}
