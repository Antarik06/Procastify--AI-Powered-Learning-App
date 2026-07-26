import { Shape, Bounds, Point, MultiSelectionState } from './types';
import { distanceToSegment, isPointInRectangle, distance } from './utils';

export class SelectionController {
    private ctx: CanvasRenderingContext2D;
    private canvas: HTMLCanvasElement;
    private selectedShape: Shape | null = null;
    private multiSelection: MultiSelectionState = {
        selectedShapes: [],
        isDragging: false
    };

    // Selection Rectangle for multi-select
    private selectionRect: {
        isSelecting: boolean;
        startX: number;
        startY: number;
        currentX: number;
        currentY: number;
    } = { isSelecting: false, startX: 0, startY: 0, currentX: 0, currentY: 0 };

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

    public getSelectedShapes(): Shape[] {
        return this.multiSelection.selectedShapes;
    }

    public hasMultipleSelected(): boolean {
        return this.multiSelection.selectedShapes.length > 1;
    }

    public addToSelection(shape: Shape) {
        if (!this.multiSelection.selectedShapes.includes(shape)) {
            this.multiSelection.selectedShapes.push(shape);
            this.updateMultiSelectionBounds();
        }
    }

    public removeFromSelection(shape: Shape) {
        this.multiSelection.selectedShapes = this.multiSelection.selectedShapes.filter(s => s.id !== shape.id);
        this.updateMultiSelectionBounds();
    }

    public clearSelection() {
        this.selectedShape = null;
        this.multiSelection.selectedShapes = [];
        this.multiSelection.bounds = undefined;
    }

    public selectMultiple(shapes: Shape[]) {
        this.multiSelection.selectedShapes = [...shapes];
        this.updateMultiSelectionBounds();
    }

    private updateMultiSelectionBounds() {
        if (this.multiSelection.selectedShapes.length === 0) {
            this.multiSelection.bounds = undefined;
            return;
        }

        let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
        
        this.multiSelection.selectedShapes.forEach(shape => {
            const bounds = this.getShapeBounds(shape);
            minX = Math.min(minX, bounds.x);
            minY = Math.min(minY, bounds.y);
            maxX = Math.max(maxX, bounds.x + bounds.width);
            maxY = Math.max(maxY, bounds.y + bounds.height);
        });

        this.multiSelection.bounds = {
            x: minX,
            y: minY,
            width: maxX - minX,
            height: maxY - minY
        };
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
        this.multiSelection.isDragging = false;
        this.initialShapeState = null;

        // Drop the drag scratch state so it isn't serialised with the shapes.
        this.multiSelection.selectedShapes.forEach(shape => {
            delete (shape as any).__initialPosition;
            delete (shape as any).__initialToPosition;
            delete (shape as any).__initialPoints;
        });
    }

    public startMultiDragging(x: number, y: number) {
        if (this.multiSelection.selectedShapes.length === 0) return;
        this.multiSelection.isDragging = true;
        this.dragStart = { x, y };
        // Store initial positions of all selected shapes
        this.multiSelection.selectedShapes.forEach(shape => {
            if (shape.type === "free-draw") {
                // Free-draw shapes have no x/y - snapshot the points instead, or the
                // drag would re-apply the delta to already-moved points each frame.
                (shape as any).__initialPoints = shape.points.map(p => ({ ...p }));
                (shape as any).__initialPosition = { x: 0, y: 0 };
                return;
            }

            (shape as any).__initialPosition = { x: shape.x, y: shape.y };
            if (shape.type === 'line' || shape.type === 'arrow') {
                (shape as any).__initialToPosition = { x: shape.toX, y: shape.toY };
            }
        });
    }

    public updateMultiDragging(x: number, y: number) {
        if (!this.multiSelection.isDragging) return;
        
        const dx = x - this.dragStart.x;
        const dy = y - this.dragStart.y;

        this.multiSelection.selectedShapes.forEach(shape => {
            const initial = (shape as any).__initialPosition;
            if (!initial) return;

            if (shape.type === "free-draw") {
                const initialPoints = (shape as any).__initialPoints || shape.points;
                shape.points = initialPoints.map((p: Point) => ({ x: p.x + dx, y: p.y + dy }));
            } else {
                shape.x = initial.x + dx;
                shape.y = initial.y + dy;

                if (shape.type === 'line' || shape.type === 'arrow') {
                    const initialTo = (shape as any).__initialToPosition;
                    if (initialTo) {
                        shape.toX = initialTo.x + dx;
                        shape.toY = initialTo.y + dy;
                    }
                }
            }
        });

        this.updateMultiSelectionBounds();
    }

    public startSelectionRect(x: number, y: number) {
        this.selectionRect.isSelecting = true;
        this.selectionRect.startX = x;
        this.selectionRect.startY = y;
        this.selectionRect.currentX = x;
        this.selectionRect.currentY = y;
    }

    public updateSelectionRect(x: number, y: number) {
        if (!this.selectionRect.isSelecting) return;
        this.selectionRect.currentX = x;
        this.selectionRect.currentY = y;
    }

    public finishSelectionRect(shapes: Shape[]): Shape[] {
        if (!this.selectionRect.isSelecting) return [];
        
        const rect = this.getSelectionRectBounds();
        const selectedShapes = shapes.filter(shape => this.isShapeInRect(shape, rect));
        
        this.selectionRect.isSelecting = false;
        return selectedShapes;
    }

    private getSelectionRectBounds() {
        const { startX, startY, currentX, currentY } = this.selectionRect;
        return {
            x: Math.min(startX, currentX),
            y: Math.min(startY, currentY),
            width: Math.abs(currentX - startX),
            height: Math.abs(currentY - startY)
        };
    }

    private isShapeInRect(shape: Shape, rect: Bounds): boolean {
        const shapeBounds = this.getShapeBounds(shape);
        return !(shapeBounds.x + shapeBounds.width < rect.x ||
                shapeBounds.x > rect.x + rect.width ||
                shapeBounds.y + shapeBounds.height < rect.y ||
                shapeBounds.y > rect.y + rect.height);
    }

    public getResizeHandleAtPoint(x: number, y: number, bounds: Bounds): string | null {
        const threshold = 8;
        
        // Corner handles
        if (distance({ x, y }, { x: bounds.x, y: bounds.y }) < threshold) return 'nw';
        if (distance({ x, y }, { x: bounds.x + bounds.width, y: bounds.y }) < threshold) return 'ne';
        if (distance({ x, y }, { x: bounds.x, y: bounds.y + bounds.height }) < threshold) return 'sw';
        if (distance({ x, y }, { x: bounds.x + bounds.width, y: bounds.y + bounds.height }) < threshold) return 'se';
        
        // Edge handles
        if (Math.abs(x - bounds.x) < threshold && y >= bounds.y && y <= bounds.y + bounds.height) return 'w';
        if (Math.abs(x - (bounds.x + bounds.width)) < threshold && y >= bounds.y && y <= bounds.y + bounds.height) return 'e';
        if (Math.abs(y - bounds.y) < threshold && x >= bounds.x && x <= bounds.x + bounds.width) return 'n';
        if (Math.abs(y - (bounds.y + bounds.height)) < threshold && x >= bounds.x && x <= bounds.x + bounds.width) return 's';
        
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
        const initial = this.initialShapeState as any;
        const dx = x - this.dragStart.x;
        const dy = y - this.dragStart.y;

        if (s.type === 'rectangle' || s.type === 'diamond') {
            switch (this.resizeHandle) {
                case 'nw':
                    s.x = initial.x + dx;
                    s.y = initial.y + dy;
                    s.width = initial.width - dx;
                    s.height = initial.height - dy;
                    break;
                case 'ne':
                    s.y = initial.y + dy;
                    s.width = initial.width + dx;
                    s.height = initial.height - dy;
                    break;
                case 'sw':
                    s.x = initial.x + dx;
                    s.width = initial.width - dx;
                    s.height = initial.height + dy;
                    break;
                case 'se':
                    s.width = initial.width + dx;
                    s.height = initial.height + dy;
                    break;
                case 'n':
                    s.y = initial.y + dy;
                    s.height = initial.height - dy;
                    break;
                case 's':
                    s.height = initial.height + dy;
                    break;
                case 'w':
                    s.x = initial.x + dx;
                    s.width = initial.width - dx;
                    break;
                case 'e':
                    s.width = initial.width + dx;
                    break;
            }
        } else if (s.type === 'ellipse') {
            const centerX = initial.x;
            const centerY = initial.y;
            
            switch (this.resizeHandle) {
                case 'se':
                case 'ne':
                    s.radX = Math.abs(x - centerX);
                    s.radY = Math.abs(y - centerY);
                    break;
                case 'e':
                    s.radX = Math.abs(x - centerX);
                    break;
                case 's':
                    s.radY = Math.abs(y - centerY);
                    break;
            }
        } else if (s.type === 'text') {
            // Text resizing affects font size
            if (this.resizeHandle === 'se') {
                s.width = Math.max(50, initial.width + dx);
                s.height = Math.max(20, initial.height + dy);
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
        this.ctx.strokeStyle = '#3b82f6';
        this.ctx.lineWidth = 1;
        this.ctx.setLineDash([]);
        
        const handleSize = 6;
        
        // Corner handles
        const corners = [
            { x: bounds.x - 5, y: bounds.y - 5 }, // nw
            { x: bounds.x + bounds.width + 5, y: bounds.y - 5 }, // ne
            { x: bounds.x - 5, y: bounds.y + bounds.height + 5 }, // sw
            { x: bounds.x + bounds.width + 5, y: bounds.y + bounds.height + 5 }, // se
        ];

        // Edge handles
        const edges = [
            { x: bounds.x + bounds.width / 2, y: bounds.y - 5 }, // n
            { x: bounds.x + bounds.width / 2, y: bounds.y + bounds.height + 5 }, // s
            { x: bounds.x - 5, y: bounds.y + bounds.height / 2 }, // w
            { x: bounds.x + bounds.width + 5, y: bounds.y + bounds.height / 2 }, // e
        ];

        [...corners, ...edges].forEach(handle => {
            this.ctx.beginPath();
            this.ctx.rect(handle.x - handleSize/2, handle.y - handleSize/2, handleSize, handleSize);
            this.ctx.fill();
            this.ctx.stroke();
        });

        this.ctx.restore();
    }

    public drawMultiSelection() {
        if (this.multiSelection.bounds) {
            this.ctx.save();
            this.ctx.strokeStyle = '#8b5cf6';
            this.ctx.lineWidth = 2;
            this.ctx.setLineDash([8, 4]);
            const bounds = this.multiSelection.bounds;
            this.ctx.strokeRect(bounds.x - 8, bounds.y - 8, bounds.width + 16, bounds.height + 16);
            this.ctx.restore();
        }
    }

    public drawSelectionRect() {
        if (!this.selectionRect.isSelecting) return;
        
        this.ctx.save();
        this.ctx.strokeStyle = '#6b7280';
        this.ctx.fillStyle = 'rgba(107, 114, 128, 0.1)';
        this.ctx.lineWidth = 1;
        this.ctx.setLineDash([3, 3]);
        
        const rect = this.getSelectionRectBounds();
        this.ctx.fillRect(rect.x, rect.y, rect.width, rect.height);
        this.ctx.strokeRect(rect.x, rect.y, rect.width, rect.height);
        this.ctx.restore();
    }

    public isSelectingRect() {
        return this.selectionRect.isSelecting;
    }
}
