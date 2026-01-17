
import getStroke, { StrokeOptions } from "perfect-freehand";
import { FontSize } from "./types";

export const FONT_SIZE_MAP: Record<FontSize, number> = {
    Small: 16,
    Medium: 24,
    Large: 32,
};

export function getFontSize(size: FontSize, scale: number): number {
    return FONT_SIZE_MAP[size] * scale;
}

export function getLineHeight(fontSize: number): number {
    return fontSize * 1.2;
}

// --- Freehand Logic ---
export function generateFreeDrawPath(
    points: { x: number; y: number }[],
    strokeWidth: number
): string {
    const inputPoints = points.map((pt) => [pt.x, pt.y]);
    if (!inputPoints.length) return "";

    const options: StrokeOptions = {
        simulatePressure: true,
        size: strokeWidth * 4.25,
        thinning: 0.6,
        smoothing: 0.5,
        streamline: 0.5,
        easing: (t) => Math.sin((t * Math.PI) / 2),
        last: true,
    };

    const strokePoints = getStroke(inputPoints, options);
    return getSvgPathFromStroke(strokePoints);
}

function getMidpoint(pointA: number[], pointB: number[]): number[] {
    return [(pointA[0] + pointB[0]) / 2, (pointA[1] + pointB[1]) / 2];
}

function getSvgPathFromStroke(points: number[][]): string {
    if (!points.length) return "";
    const max = points.length - 1;
    return points
        .reduce(
            (acc, point, i, arr) => {
                if (i === max) {
                    acc.push(point, getMidpoint(point, arr[0]), "L", arr[0], "Z");
                } else {
                    acc.push(point, getMidpoint(point, arr[i + 1]));
                }
                return acc;
            },
            ["M", points[0], "Q"] as any[]
        )
        .join(" ")
        .replace(/(\s?[A-Z]?,?-?[0-9]*\.[0-9]{0,2})(([0-9]|e|-)*)/g, "$1");
}

export const roundRect = (
    ctx: CanvasRenderingContext2D,
    x: number,
    y: number,
    width: number,
    height: number,
    radius: number
) => {
    ctx.beginPath();
    ctx.roundRect(x, y, width, height, radius);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();
};

// --- Geometry Helpers for Selection ---
import { Point } from "./types";

export function distance(p1: Point, p2: Point): number {
    return Math.sqrt((p2.x - p1.x) ** 2 + (p2.y - p1.y) ** 2);
}

export function isPointInRectangle(px: number, py: number, x: number, y: number, width: number, height: number): boolean {
    return px >= x && px <= x + width && py >= y && py <= y + height;
}

export function distanceToSegment(p: Point, v: Point, w: Point): number {
    const l2 = (w.x - v.x) ** 2 + (w.y - v.y) ** 2;
    if (l2 === 0) return distance(p, v);

    let t = ((p.x - v.x) * (w.x - v.x) + (p.y - v.y) * (w.y - v.y)) / l2;
    t = Math.max(0, Math.min(1, t));

    return distance(p, {
        x: v.x + t * (w.x - v.x),
        y: v.y + t * (w.y - v.y)
    });
}
