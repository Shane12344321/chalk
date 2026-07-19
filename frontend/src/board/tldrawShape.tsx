import {
  BaseBoxShapeUtil,
  Rectangle2d,
  SVGContainer,
  T,
  type Geometry2d,
  type RecordProps,
  type TLShape,
} from "tldraw";
import { BoardGeometryLayer } from "./Board";
import type { BoardGeometry } from "./geometry";

export const CHALK_SHAPE_TYPE = "chalk-board-element" as const;

declare module "@tldraw/tlschema" {
  interface TLGlobalShapePropsMap {
    [CHALK_SHAPE_TYPE]: {
      w: number;
      h: number;
      elementId: string;
      progress: number;
    };
  }
}

export type ChalkBoardShape = TLShape<typeof CHALK_SHAPE_TYPE>;

const geometryRegistry = new Map<string, BoardGeometry>();

export function registerTldrawGeometry(geometries: readonly BoardGeometry[]): void {
  geometryRegistry.clear();
  for (const geometry of geometries) geometryRegistry.set(geometry.id, geometry);
}

export class ChalkBoardShapeUtil extends BaseBoxShapeUtil<ChalkBoardShape> {
  static override type = CHALK_SHAPE_TYPE;
  static override props: RecordProps<ChalkBoardShape> = {
    w: T.number,
    h: T.number,
    elementId: T.string,
    progress: T.number,
  };

  override getDefaultProps(): ChalkBoardShape["props"] {
    return { w: 1, h: 1, elementId: "missing", progress: 0 };
  }

  override getGeometry(shape: ChalkBoardShape): Geometry2d {
    return new Rectangle2d({
      width: shape.props.w,
      height: shape.props.h,
      isFilled: false,
    });
  }

  override component(shape: ChalkBoardShape) {
    const geometry = geometryRegistry.get(shape.props.elementId);
    if (!geometry || shape.props.progress <= 0) return null;
    return (
      <SVGContainer style={{ overflow: "visible" }}>
        <g transform={`translate(${-geometry.box.x} ${-geometry.box.y})`}>
          <BoardGeometryLayer geometry={geometry} progress={shape.props.progress} />
        </g>
      </SVGContainer>
    );
  }

  override getIndicatorPath() {
    return undefined;
  }

  override canBind() {
    return false;
  }

  override canEdit() {
    return false;
  }

  override canResize() {
    return false;
  }
}
