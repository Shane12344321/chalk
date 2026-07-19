import { lazy, Suspense } from "react";
import { Board, type BoardProps } from "./Board";
import { configuredBoardRenderer } from "./boardRendererConfig";

const TldrawBoard = lazy(() => import("./TldrawBoard"));

export function BoardSurface(props: BoardProps) {
  const renderer = configuredBoardRenderer(import.meta.env.VITE_BOARD_RENDERER);
  if (renderer === "rough-svg") return <Board {...props} />;
  return (
    <Suspense fallback={<Board {...props} />}>
      <TldrawBoard {...props} />
    </Suspense>
  );
}
