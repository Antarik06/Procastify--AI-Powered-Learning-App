import { v4 as uuidv4 } from "uuid";
import rough from "roughjs/bin/rough";
import { RoughCanvas } from "roughjs/bin/canvas";
import {
    Shape, ToolType, LOCALSTORAGE_CANVAS_KEY,
    StrokeWidth, StrokeStyle, RoughStyle, FillStyle, FontFamily, FontSize
} from "./types";
import { SelectionController } from "./SelectionController";
import { generateFreeDrawPath, getFontSize } from "./utils";

export class CanvasEngine {
    private canvas: HTMLCanvasElement;
    private ctx: CanvasRenderingContext2D;
    private roughCanvas: RoughCanvas;
    private shapes: Shape[] = [];
    private selectionController: SelectionController;
    private canvasId: string = "";

    // State
    private activeTool: ToolType = "selection";
    private isDrawing: boolean = false;
    private startX: number = 0;
    private startY: number = 0;

    // Pan & Zoom State
    private scale: number = 1;
    private panX: number = 0;
    private panY: number = 0;
    private isPanning: boolean = false;

    // Coordinate Tracking (Fixes Drift)
    private lastMouseX: number = 0;
    private lastMouseY: number = 0;
    private cachedCanvasRect: DOMRect | null = null;

    // Style State
    public strokeWidth: StrokeWidth = 2;
    public strokeFill: string = "#ffffff";
    public bgFill: string = "transparent";
    public strokeStyle: StrokeStyle = "solid";
    public roughStyle: RoughStyle = 0;
    public fillStyle: FillStyle = "solid";
    public fontFamily: FontFamily = "normal";
    public fontSize: FontSize = "Medium";

    constructor(canvas: HTMLCanvasElement, canvasId?: string) {
        this.canvas = canvas;
        this.ctx = canvas.getContext("2d")!;
        this.roughCanvas = rough.canvas(canvas);
        this.selectionController = new SelectionController(this.ctx, canvas);
        this.canvasId = canvasId || LOCALSTORAGE_CANVAS_KEY;

        this.init();
        this.setupEventListeners();
    }

    private init() {
        try {
            const key = this.canvasId.startsWith("procastify_canvas_") ? this.canvasId : `procastify_canvas_${this.canvasId}`;
            const stored = localStorage.getItem(key);
            if (stored) {
                this.shapes = JSON.parse(stored);
            }
        } catch (e) { console.error("Failed to load shapes"); }
        this.render();
    }

    private save() {
        const key = this.canvasId.startsWith("procastify_canvas_") ? this.canvasId : `procastify_canvas_${this.canvasId}`;
        localStorage.setItem(key, JSON.stringify(this.shapes));
    }

    // --- API ---
    public setTool(tool: ToolType) {
        this.activeTool = tool;
        this.isDrawing = false;
        this.isPanning = false;
        this.selectionController.setSelectedShape(null);
        this.canvas.style.cursor = tool === "grab" ? "grab" : "crosshair";
        this.render();
    }

    public setScale(scale: number) {
        this.scale = scale;
        this.render();
    }

    public clear() {
        this.shapes = [];
        this.save();
        this.render();
    }

    public resize() {
        this.cachedCanvasRect = null; // Invalidate cache
        this.render();
    }

    // --- Coordinate System ---
    private getWorldPos(e: MouseEvent | TouchEvent) {
        const rect = this.cachedCanvasRect || this.canvas.getBoundingClientRect();

        const clientX = 'touches' in e ? (e as TouchEvent).touches[0].clientX : (e as MouseEvent).clientX;
        const clientY = 'touches' in e ? (e as TouchEvent).touches[0].clientY : (e as MouseEvent).clientY;

        // 1. Get position relative to the viewport-aligned canvas element (CSS pixels)
        const x_css = clientX - rect.left;
        const y_css = clientY - rect.top;

        // 2. Map CSS pixels to Canvas Buffer pixels (Physical pixels)
        // If the canvas is sized correctly (width = rect.width * dpr), this ratio will be approximately `dpr`.
        // However, we calculate it dynamically to be robust against any layout mismatches (e.g. fractional CSS sizes).
        const scaleX = this.canvas.width / rect.width;
        const scaleY = this.canvas.height / rect.height;

        const x_buffer = x_css * scaleX;
        const y_buffer = y_css * scaleY;

        // 3. Convert Buffer pixels back to "Logical World Coordinates"
        // Our rendering system applies a base transform of `scale(dpr, dpr)`.
        // So a shape at Logical(100,100) is drawn at Buffer(100*dpr, 100*dpr).
        // Therefore, to get Logical coordinates from Buffer coordinates, we divide by DPR.
        // NOTE: We use the *current* DPR or derive it from the scale factor to be safe.
        // Since `scaleX` ≈ `dpr`, `x_buffer / scaleX` gives us `x_css`.
        // So `getWorldPos` essentially just needs to return `x_css` relative to the Pan/Zoom transform.
        // Wait, if we just use `x_css`, we assume 1:1 mapping between Pointer and Logical World.
        // This IS true if `render` scales by DPR.

        // HOWEVER, if the user mentioned "deviation increases on resize", it suggests `scaleX` wasn't matching up.
        // By relying on `rect` and `clientX`, `x_css` is practically perfect for "where the cursor looks like it is".

        // So:
        // WorldX = (CssX - PanX) / ZoomScale
        // WorldY = (CssY - PanY) / ZoomScale

        return {
            x: (x_css - this.panX) / this.scale,
            y: (y_css - this.panY) / this.scale
        };
    }

    // --- Rendering ---
    private render() {
        const dpr = window.devicePixelRatio || 1;

        // Reset transform to identity (standard validation step)
        this.ctx.setTransform(1, 0, 0, 1, 0, 0);
        this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);

        // Apply transforms:
        // 1. Scale by DPR to map Logical Coords -> Buffer Coords
        // 2. Translate by Pan
        // 3. Scale by Zoom
        // Order strictly: Transform = DPR_Matrix * Translate_Matrix * Scale_Matrix ?? 
        // Actually `ctx.setTransform(a, b, c, d, e, f)` replaces the matrix.

        // We want final coord `x_final = (x_logical * zoom + pan) * dpr` ? 
        // NO. Usually standard high-DPI handling is `ctx.scale(dpr, dpr)` then draw normally.
        // So `x_final = (x_logical * zoom + pan) * dpr` is correct if we apply dpr last? 
        // Or `x_final = (x_logical * dpr * zoom) + (pan * dpr)`.

        // Let's use standard composition:
        // ctx.setTransform(dpr, 0, 0, dpr, 0, 0); // Base high-DPI scale
        // ctx.translate(this.panX, this.panY);
        // ctx.scale(this.scale, this.scale);

        // Compressing into one setTransform for performance/clarity:
        // Horizontal scaling: dpr * scale
        // Horizontal translation: dpr * panX
        this.ctx.setTransform(
            dpr * this.scale, 0,
            0, dpr * this.scale,
            dpr * this.panX, dpr * this.panY
        );

        this.shapes.forEach(shape => this.drawShape(shape));

        if (this.activeTool === "selection" && this.selectionController.getSelectedShape()) {
            const bounds = this.selectionController.getShapeBounds(this.selectionController.getSelectedShape()!);
            this.selectionController.drawSelectionBox(bounds);
        }
    }

    private drawShape(shape: Shape) {
        const options = {
            stroke: shape.strokeFill,
            strokeWidth: shape.strokeWidth,
            roughness: 0,
            bowing: 0,
            fill: 'bgFill' in shape ? shape.bgFill : undefined,
            fillStyle: 'solid',
            strokeLineDash: 'strokeStyle' in shape && shape.strokeStyle === 'dashed' ? [5, 5] : undefined
        };

        switch (shape.type) {
            case "rectangle":
                this.roughCanvas.rectangle(shape.x, shape.y, shape.width, shape.height, options);
                break;
            case "ellipse":
                this.roughCanvas.ellipse(shape.x, shape.y, shape.radX * 2, shape.radY * 2, options);
                break;
            case "diamond":
                this.roughCanvas.polygon([
                    [shape.x, shape.y - shape.height / 2],
                    [shape.x + shape.width / 2, shape.y],
                    [shape.x, shape.y + shape.height / 2],
                    [shape.x - shape.width / 2, shape.y]
                ], options);
                break;
            case "line":
                this.roughCanvas.line(shape.x, shape.y, shape.toX, shape.toY, options);
                break;
            case "arrow":
                this.roughCanvas.line(shape.x, shape.y, shape.toX, shape.toY, options);
                const angle = Math.atan2(shape.toY - shape.y, shape.toX - shape.x);
                const headLen = 15;
                const x1 = shape.toX - headLen * Math.cos(angle - Math.PI / 6);
                const y1 = shape.toY - headLen * Math.sin(angle - Math.PI / 6);
                const x2 = shape.toX - headLen * Math.cos(angle + Math.PI / 6);
                const y2 = shape.toY - headLen * Math.sin(angle + Math.PI / 6);
                this.roughCanvas.line(shape.toX, shape.toY, x1, y1, options);
                this.roughCanvas.line(shape.toX, shape.toY, x2, y2, options);
                break;
            case "free-draw":
                const path = generateFreeDrawPath(shape.points, shape.strokeWidth);
                this.ctx.save();
                this.ctx.fillStyle = shape.strokeFill;
                this.ctx.fill(new Path2D(path));
                this.ctx.restore();
                break;
            case "text":
                this.ctx.font = `${getFontSize(shape.fontSize, 1)}px sans-serif`;
                this.ctx.fillStyle = shape.strokeFill;
                this.ctx.textAlign = shape.textAlign;
                this.ctx.textBaseline = "top";
                this.ctx.fillText(shape.text, shape.x, shape.y);
                break;
        }
    }

    // --- Input Handling ---

    private handleMouseDown = (e: MouseEvent) => {
        this.cachedCanvasRect = this.canvas.getBoundingClientRect();
        this.lastMouseX = e.clientX;
        this.lastMouseY = e.clientY;

        // PANNING
        if (this.activeTool === "grab") {
            this.isPanning = true;
            this.canvas.style.cursor = "grabbing";
            return;
        }

        const { x, y } = this.getWorldPos(e);
        this.startX = x;
        this.startY = y;

        // ERASER
        if (this.activeTool === "eraser") {
            this.shapes = this.shapes.filter(s => !this.selectionController.isPointInShape(x, y, s));
            this.save();
            this.render();
            return;
        }

        // SELECTION
        if (this.activeTool === "selection") {
            const selected = this.selectionController.getSelectedShape();
            if (selected) {
                const bounds = this.selectionController.getShapeBounds(selected);
                const handle = this.selectionController.getResizeHandleAtPoint(x, y, bounds);
                if (handle) {
                    this.selectionController.startResizing(x, y);
                    return;
                }
                if (this.selectionController.isPointInShape(x, y, selected)) {
                    this.selectionController.startDragging(x, y);
                    return;
                }
            }

            const clickedShape = this.shapes.slice().reverse().find(s => this.selectionController.isPointInShape(x, y, s));
            this.selectionController.setSelectedShape(clickedShape || null);
            if (clickedShape) this.selectionController.startDragging(x, y);
            this.render();
            return;
        }

        // TEXT
        if (this.activeTool === "text") {
            this.handleTextEntry(e.clientX, e.clientY, x, y);
            return;
        }

        // DRAWING
        this.isDrawing = true;

        const id = uuidv4();
        const base = { id, x, y, strokeWidth: this.strokeWidth, strokeFill: this.strokeFill };

        if (this.activeTool === "free-draw") {
            this.shapes.push({ ...base, type: "free-draw", points: [{ x, y }], bgFill: this.bgFill, strokeStyle: this.strokeStyle, fillStyle: this.fillStyle });
        } else if (this.activeTool === "rectangle") {
            this.shapes.push({ ...base, type: "rectangle", width: 0, height: 0, bgFill: this.bgFill, rounded: "sharp", strokeStyle: this.strokeStyle, roughStyle: this.roughStyle, fillStyle: this.fillStyle });
        } else if (this.activeTool === "ellipse") {
            this.shapes.push({ ...base, type: "ellipse", radX: 0, radY: 0, bgFill: this.bgFill, strokeStyle: this.strokeStyle, roughStyle: this.roughStyle, fillStyle: this.fillStyle });
        } else if (this.activeTool === "line") {
            this.shapes.push({ ...base, type: "line", toX: x, toY: y, strokeStyle: this.strokeStyle, roughStyle: this.roughStyle });
        } else if (this.activeTool === "arrow") {
            this.shapes.push({ ...base, type: "arrow", toX: x, toY: y, strokeStyle: this.strokeStyle, roughStyle: this.roughStyle });
        } else if (this.activeTool === "diamond") {
            this.shapes.push({ ...base, type: "diamond", width: 0, height: 0, bgFill: this.bgFill, rounded: "sharp", strokeStyle: this.strokeStyle, roughStyle: this.roughStyle, fillStyle: this.fillStyle });
        }
    };

    private handleMouseMove = (e: MouseEvent) => {
        const deltaX = e.clientX - this.lastMouseX;
        const deltaY = e.clientY - this.lastMouseY;
        this.lastMouseX = e.clientX;
        this.lastMouseY = e.clientY;

        // PANNING
        if (this.isPanning && this.activeTool === "grab") {
            this.panX += deltaX;
            this.panY += deltaY;
            this.render();
            return;
        }

        // SELECTION
        if (this.activeTool === "selection") {
            const { x, y } = this.getWorldPos(e);
            if (this.selectionController.isDraggingShape()) {
                this.selectionController.updateDragging(x, y);
                this.render();
            } else if (this.selectionController.isResizingShape()) {
                this.selectionController.updateResizing(x, y);
                this.render();
            }
            return;
        }

        // Guard
        if (!this.isDrawing) return;
        if (["selection", "grab", "eraser", "text"].includes(this.activeTool)) return;

        // DRAWING
        const { x, y } = this.getWorldPos(e);
        const currentShape = this.shapes[this.shapes.length - 1];
        if (!currentShape) return;

        if (currentShape.type === "free-draw") {
            currentShape.points.push({ x, y });
        } else if (currentShape.type === "rectangle" || currentShape.type === "diamond") {
            currentShape.width = x - this.startX;
            currentShape.height = y - this.startY;
        } else if (currentShape.type === "ellipse") {
            currentShape.radX = Math.abs(x - this.startX) / 2;
            currentShape.radY = Math.abs(y - this.startY) / 2;
            currentShape.x = this.startX + (x - this.startX) / 2;
            currentShape.y = this.startY + (y - this.startY) / 2;
        } else if (currentShape.type === "line" || currentShape.type === "arrow") {
            currentShape.toX = x;
            currentShape.toY = y;
        }

        this.render();
    };

    private handleMouseUp = () => {
        this.cachedCanvasRect = null;

        if (this.isPanning) {
            this.isPanning = false;
            this.canvas.style.cursor = "grab";
            return;
        }

        this.isDrawing = false;
        this.selectionController.stopDragging();
        this.selectionController.stopResizing();
        this.save();
        this.render();
    };

    private handleTextEntry(clientX: number, clientY: number, worldX: number, worldY: number) {
        const container = document.querySelector(".collabydraw-textEditorContainer");
        if (!container) return;

        const textarea = document.createElement("textarea");
        Object.assign(textarea.style, {
            position: "fixed",
            left: `${clientX}px`,
            top: `${clientY}px`,
            background: "transparent",
            border: "none",
            outline: "none",
            color: this.strokeFill,
            font: `${getFontSize(this.fontSize, this.scale)}px sans-serif`,
            zIndex: "100",
            margin: "0",
            padding: "0",
            resize: "none"
        });

        container.appendChild(textarea);
        setTimeout(() => textarea.focus(), 10);

        const handleBlur = () => {
            if (textarea.value.trim()) {
                this.shapes.push({
                    id: uuidv4(),
                    type: "text",
                    x: worldX,
                    y: worldY,
                    width: 0,
                    height: 0,
                    text: textarea.value,
                    strokeWidth: 2,
                    strokeFill: this.strokeFill,
                    fontSize: this.fontSize,
                    fontFamily: this.fontFamily,
                    textAlign: "left"
                });
                this.save();
                this.render();
            }
            textarea.remove();
        };

        textarea.addEventListener("blur", handleBlur);
        textarea.addEventListener("keydown", (e) => {
            if (e.key === "Enter" && !e.shiftKey) {
                e.preventDefault();
                textarea.blur();
            }
        });
    }

    private setupEventListeners() {
        this.canvas.addEventListener("mousedown", this.handleMouseDown);
        window.addEventListener("mousemove", this.handleMouseMove);
        window.addEventListener("mouseup", this.handleMouseUp);
    }

    public destroy() {
        this.canvas.removeEventListener("mousedown", this.handleMouseDown);
        window.removeEventListener("mousemove", this.handleMouseMove);
        window.removeEventListener("mouseup", this.handleMouseUp);
    }
}
