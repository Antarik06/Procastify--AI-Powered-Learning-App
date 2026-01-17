import { Shape, Bounds, Point } from './types';
import { distanceToSegment, isPointInRectangle, distance } from './utils';

export class SelectionController {
    private ctx: CanvasRenderingContext2D;
    private canvas: HTMLCanvasElement;
    private selectedShape: Shape | null = null;

    // Interaction State
    private isDragging: boolean = false;
    private isResizing: boolean = false;
    private dragStart: Point = { x: 0, y: 0 };
    private initialShapeState: Shape | null = null;
    private resizeHandle: string | null = null;

    constructor(ctx: CanvasRenderingContext2D, canvas: HTMLCanvasElement) {
        this.ctx = ctx;
        this.canvas = canvas;
    }

    public setSelectedShape(shape: Shape | null) {
        this.selectedShape = shape;
    }

    public getSelectedShape(): Shape | null {
        return this.selectedShape;
    }

    public isDraggingShape(): boolean {
        return this.isDragging;
    }

    public isResizingShape(): boolean {
        return this.isResizing;
    }

    public getShapeBounds(shape: Shape): Bounds {
        if (shape.type === 'rectangle' || shape.type === 'diamond') {
            const x = shape.width >= 0 ? shape.x : shape.x + shape.width;
            const y = shape.height >= 0 ? shape.y : shape.y + shape.height;
            return { x, y, width: Math.abs(shape.width), height: Math.abs(shape.height) };
        } else if (shape.type === 'ellipse') {
            return {
                x: shape.x - shape.radX,
                y: shape.y - shape.radY,
                width: shape.radX * 2,
                height: shape.radY * 2
            };
        } else if (shape.type === 'line' || shape.type === 'arrow') {
            const minX = Math.min(shape.x, shape.toX);
            const maxX = Math.max(shape.x, shape.toX);
            const minY = Math.min(shape.y, shape.toY);
            const maxY = Math.max(shape.y, shape.toY);
            return { x: minX, y: minY, width: maxX - minX, height: maxY - minY };
        } else if (shape.type === 'free-draw') {
            if (shape.points.length === 0) return { x: 0, y: 0, width: 0, height: 0 };
            let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
            shape.points.forEach(p => {
                minX = Math.min(minX, p.x);
                minY = Math.min(minY, p.y);
                maxX = Math.max(maxX, p.x);
                maxY = Math.max(maxY, p.y);
            });
            return { x: minX, y: minY, width: maxX - minX, height: maxY - minY };
        } else if (shape.type === 'text') {
            // Approximation
            return { x: shape.x, y: shape.y, width: 100, height: 20 };
        }
        return { x: 0, y: 0, width: 0, height: 0 };
    }

    public isPointInShape(x: number, y: number, shape: Shape): boolean {
        const threshold = 10;
        if (shape.type === 'rectangle' || shape.type === 'diamond') {
            const b = this.getShapeBounds(shape);
            return isPointInRectangle(x, y, b.x, b.y, b.width, b.height);
        } else if (shape.type === 'ellipse') {
            const dx = x - shape.x;
            const dy = y - shape.y;
            return (dx * dx) / (shape.radX * shape.radX) + (dy * dy) / (shape.radY * shape.radY) <= 1;
        } else if (shape.type === 'line' || shape.type === 'arrow') {
            return distanceToSegment({ x, y }, { x: shape.x, y: shape.y }, { x: shape.toX, y: shape.toY }) < threshold;
        } else if (shape.type === 'free-draw') {
            for (let i = 0; i < shape.points.length - 1; i++) {
                if (distanceToSegment({ x, y }, shape.points[i], shape.points[i + 1]) < threshold) return true;
            }
            return false;
        } else if (shape.type === 'text') {
            const b = this.getShapeBounds(shape);
            return isPointInRectangle(x, y, b.x, b.y, b.width, b.height);
        }
        return false;
    }

    public startDragging(x: number, y: number) {
        if (!this.selectedShape) return;
        this.isDragging = true;
        this.dragStart = { x, y };
        this.initialShapeState = JSON.parse(JSON.stringify(this.selectedShape));
    }

    public updateDragging(x: number, y: number) {
        if (!this.isDragging || !this.selectedShape || !this.initialShapeState) return;

        const dx = x - this.dragStart.x;
        const dy = y - this.dragStart.y;

        const s = this.selectedShape;
        const init = this.initialShapeState;

        if (s.type === "free-draw" && init.type === "free-draw") {
            // Free draw dragging logic (move all points)
            s.points = init.points.map((p: Point) => ({ x: p.x + dx, y: p.y + dy }));
        } else if (s.type !== "free-draw" && init.type !== "free-draw") {
            // Standard shape logic
            s.x = init.x + dx;
            s.y = init.y + dy;

            if (s.type === 'line' || s.type === 'arrow') {
                const initLine = init as any;
                s.toX = initLine.toX + dx;
                s.toY = initLine.toY + dy;
            }
        }
    }

    public stopDragging() {
        this.isDragging = false;
        this.initialShapeState = null;
    }

    public getResizeHandleAtPoint(x: number, y: number, bounds: Bounds): string | null {
        const threshold = 10;
        if (distance({ x, y }, { x: bounds.x, y: bounds.y }) < threshold) return 'tl';
        if (distance({ x, y }, { x: bounds.x + bounds.width, y: bounds.y }) < threshold) return 'tr';
        if (distance({ x, y }, { x: bounds.x, y: bounds.y + bounds.height }) < threshold) return 'bl';
        if (distance({ x, y }, { x: bounds.x + bounds.width, y: bounds.y + bounds.height }) < threshold) return 'br';
        return null;
    }

    public startResizing(x: number, y: number) {
        if (!this.selectedShape) return;
        const bounds = this.getShapeBounds(this.selectedShape);
        this.resizeHandle = this.getResizeHandleAtPoint(x, y, bounds);
        if (this.resizeHandle) {
            this.isResizing = true;
            this.dragStart = { x, y };
            this.initialShapeState = JSON.parse(JSON.stringify(this.selectedShape));
        }
    }

    public updateResizing(x: number, y: number) {
        if (!this.isResizing || !this.selectedShape || !this.initialShapeState || !this.resizeHandle) return;

        const s = this.selectedShape;

        if (s.type === 'rectangle' || s.type === 'diamond') {
            const dx = x - this.dragStart.x;
            const dy = y - this.dragStart.y;

            if (this.resizeHandle === 'br') {
                s.width = (this.initialShapeState as any).width + dx;
                s.height = (this.initialShapeState as any).height + dy;
            }
        }
    }

    public stopResizing() {
        this.isResizing = false;
        this.resizeHandle = null;
        this.initialShapeState = null;
    }

    public drawSelectionBox(bounds: Bounds) {
        this.ctx.save();
        this.ctx.strokeStyle = '#3b82f6';
        this.ctx.lineWidth = 1;
        this.ctx.setLineDash([5, 5]);
        this.ctx.strokeRect(bounds.x - 5, bounds.y - 5, bounds.width + 10, bounds.height + 10);

        this.ctx.fillStyle = '#ffffff';
        this.ctx.setLineDash([]);
        const handles = [
            { x: bounds.x - 5, y: bounds.y - 5 },
            { x: bounds.x + bounds.width + 5, y: bounds.y - 5 },
            { x: bounds.x - 5, y: bounds.y + bounds.height + 5 },
            { x: bounds.x + bounds.width + 5, y: bounds.y + bounds.height + 5 },
        ];

        handles.forEach(h => {
            this.ctx.beginPath();
            this.ctx.arc(h.x, h.y, 4, 0, Math.PI * 2);
            this.ctx.fill();
            this.ctx.stroke();
        });

        this.ctx.restore();
    }
}
