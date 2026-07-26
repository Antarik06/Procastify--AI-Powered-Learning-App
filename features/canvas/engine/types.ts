
export type ToolType =
    | "selection"
    | "grab"
    | "rectangle"
    | "diamond"
    | "ellipse"
    | "line"
    | "arrow"
    | "free-draw"
    | "eraser"
    | "text";

export type StrokeStyle = "solid" | "dashed" | "dotted";
export type RoughStyle = 0 | 1 | 2; // 0: Solid, 1: Sketchy, 2: Very Sketchy
export type FillStyle = "hachure" | "solid" | "zigzag" | "cross-hatch" | "dots";
export type StrokeWidth = 1 | 2 | 3 | 4 | 5;
export type StrokeType = "straight" | "curved";
export type StrokeEdge = "sharp" | "round";
export type FontFamily = "hand-drawn" | "normal" | "code";
export type FontSize = "Small" | "Medium" | "Large" | "Extra Large";
export type TextAlign = "left" | "center" | "right";

export const LOCALSTORAGE_CANVAS_KEY = "single_user_canvas_shapes"; // Kept for local dev fallback check

export interface Point {
    x: number;
    y: number;
}

export interface Bounds {
    x: number;
    y: number;
    width: number;
    height: number;
}

export interface MultiSelectionState {
    selectedShapes: Shape[];
    bounds?: Bounds;
    isDragging: boolean;
}

export interface ZoomState {
    scale: number;
    minScale: number;
    maxScale: number;
}

export interface ShapeBase {
    id: string;
    x: number;
    y: number;
    strokeWidth: StrokeWidth;
    strokeFill: string;
    strokeEdge?: StrokeEdge; // Added optional to base
}

export type Shape =
    | (ShapeBase & {
        type: "rectangle" | "diamond";
        width: number;
        height: number;
        bgFill: string;
        rounded: StrokeEdge;
        strokeStyle: StrokeStyle;
        roughStyle: RoughStyle;
        fillStyle: FillStyle;
    })
    | (ShapeBase & {
        type: "ellipse";
        radX: number;
        radY: number;
        bgFill: string;
        strokeStyle: StrokeStyle;
        roughStyle: RoughStyle;
        fillStyle: FillStyle;
    })
    | (ShapeBase & {
        type: "line" | "arrow";
        toX: number;
        toY: number;
        strokeStyle: StrokeStyle;
        roughStyle: RoughStyle;
        strokeType?: StrokeType;
    })
    | {
        id: string;
        type: "free-draw";
        points: Point[];
        strokeFill: string;
        bgFill: string; // Used for roughjs context
        strokeWidth: StrokeWidth;
        strokeStyle: StrokeStyle;
        fillStyle: FillStyle;
    }
    | {
        id: string;
        type: "text";
        x: number;
        y: number;
        width: number;
        height: number;
        text: string;
        lines: string[]; // Support for multi-line text
        fontSize: FontSize;
        fontFamily: FontFamily;
        textAlign: TextAlign;
        strokeFill: string;
        strokeWidth: StrokeWidth;
        strokeEdge?: StrokeEdge;
        bgFill?: string;
        lineHeight?: number; // Line spacing multiplier
    };
