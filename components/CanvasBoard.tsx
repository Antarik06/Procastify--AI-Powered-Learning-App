
"use client";

import React, { useEffect, useRef, useState, forwardRef, useImperativeHandle } from "react";
import { CanvasEngine } from "./canvas/CanvasEngine";
import { ToolType, Shape, StrokeWidth, StrokeStyle, RoughStyle, FillStyle, FontSize } from "./canvas/types";
import { MousePointer, Hand, Square, Circle, Minus, Pencil, Eraser, Type, Diamond, MoveRight, ZoomIn, ZoomOut, RotateCcw } from "lucide-react";

interface CanvasBoardProps {
    canvasId?: string;
    readOnly?: boolean;
    elements?: Shape[];
    onShapesAdded?: (shapes: Shape[]) => void;
}

export interface CanvasBoardRef {
    addShapes: (shapes: Shape[]) => void;
    clear: () => void;
}


const CanvasBoard = forwardRef<CanvasBoardRef, CanvasBoardProps>(({ canvasId, readOnly = false, elements, onShapesAdded }: CanvasBoardProps, ref) => {
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const [engine, setEngine] = useState<CanvasEngine | null>(null);
    const [activeTool, setActiveTool] = useState<ToolType>("selection");
    const [color, setColor] = useState("#ffffff");
    const [loading, setLoading] = useState(true);

    // New style states
    const [strokeWidth, setStrokeWidth] = useState<StrokeWidth>(2);
    const [strokeStyle, setStrokeStyle] = useState<StrokeStyle>("solid");
    const [roughStyle, setRoughStyle] = useState<RoughStyle>(0);
    const [fillStyle, setFillStyle] = useState<FillStyle>("solid");
    const [fontSize, setFontSize] = useState<FontSize>("Medium");
    const [zoomInfo, setZoomInfo] = useState({
        scale: 1,
        canZoomIn: true,
        canZoomOut: false
    });



    useEffect(() => {
        if (!canvasRef.current) return;
        // If we have elements (Read Only / Stateless), we don't strictly need canvasId
        // but CanvasEngine might expect it. If not provided, we can pass a dummy or skip persistence.

        // Loading State
        setLoading(true);

        const canvas = canvasRef.current;
        const parent = canvas.parentElement;

        // Initialize Engine
        let engineInstance = engine;
        if (!engineInstance) {
            engineInstance = new CanvasEngine(canvas, canvasId, readOnly);
            setEngine(engineInstance);
        }

        // If elements are provided (Stateless/Read-Only mode), load them directly
        if (elements && engineInstance) {
            engineInstance.loadElements(elements);
        }

        const updateSize = () => {
            if (parent) {
                const rect = parent.getBoundingClientRect();
                const dpr = window.devicePixelRatio || 1;

                // Set Display Size (CSS)
                canvas.style.width = `${rect.width}px`;
                canvas.style.height = `${rect.height}px`;

                // Set Buffer Size (Physical Pixels)
                canvas.width = Math.floor(rect.width * dpr);
                canvas.height = Math.floor(rect.height * dpr);

                // Update Engine with new scale/size info if needed
                if (engineInstance) {
                    engineInstance.resize();
                }
            }
        };

        // Initial Size
        updateSize();
        setLoading(false);

        // Resize Observer for robust layout tracking
        const resizeObserver = new ResizeObserver(() => {
            updateSize();
        });

        if (parent) {
            resizeObserver.observe(parent);
        }

        // Also listen to window resize for DPR changes (e.g. moving across screens)
        window.addEventListener("resize", updateSize);

        return () => {
            resizeObserver.disconnect();
            window.removeEventListener("resize", updateSize);
            // We don't destroy the engine here on simple re-renders to preserve state 
            // but if canvasId changes, the effect re-runs. 
            // In a real app we might want to be careful about double-init.
            // For now, we trust the dependency array. 
            if (engineInstance) engineInstance.destroy();
        };
    }, [canvasId]);

    const selectTool = (tool: ToolType) => {
        setActiveTool(tool);
        if (engine) engine.setTool(tool);
    };

    const changeColor = (e: React.ChangeEvent<HTMLInputElement>) => {
        setColor(e.target.value);
        if (engine) engine.strokeFill = e.target.value;
    };

    const changeStrokeWidth = (width: StrokeWidth) => {
        setStrokeWidth(width);
        if (engine) engine.setStrokeWidth(width);
    };

    const changeStrokeStyle = (style: StrokeStyle) => {
        setStrokeStyle(style);
        if (engine) engine.setStrokeStyle(style);
    };

    const changeRoughStyle = (style: RoughStyle) => {
        setRoughStyle(style);
        if (engine) engine.setRoughStyle(style);
    };

    const changeFontSize = (size: FontSize) => {
        setFontSize(size);
        if (engine) engine.fontSize = size;
    };

    const updateZoomInfo = () => {
        if (engine) {
            setZoomInfo(engine.getZoomInfo());
        }
    };

    const zoomIn = () => {
        if (engine) {
            engine.zoomIn();
            updateZoomInfo();
        }
    };

    const zoomOut = () => {
        if (engine) {
            engine.zoomOut();
            updateZoomInfo();
        }
    };

    const resetZoom = () => {
        if (engine) {
            engine.resetZoom();
            updateZoomInfo();
        }
    };

    const clearCanvas = () => {
        if (engine && !readOnly) engine.clear();
    };

    return (
        <div className="relative w-full h-full overflow-hidden bg-zinc-950 flex flex-col">
            {/* Main Toolbar */}
            {!readOnly && (
                <div className="absolute top-4 left-1/2 transform -translate-x-1/2 bg-zinc-900 shadow-xl rounded-lg p-3 flex gap-2 z-10 border border-zinc-800 max-w-5xl">
                    <div className="flex gap-2 items-center">
                        {/* Selection Tools */}
                        <ToolButton icon={<MousePointer size={18} />} active={activeTool === "selection"} onClick={() => selectTool("selection")} title="Select (V)" />
                        <ToolButton icon={<Hand size={18} />} active={activeTool === "grab"} onClick={() => selectTool("grab")} title="Pan (Space)" />
                        
                        <div className="w-px bg-zinc-700 mx-1 h-6"></div>
                        
                        {/* Shape Tools */}
                        <ToolButton icon={<Square size={18} />} active={activeTool === "rectangle"} onClick={() => selectTool("rectangle")} title="Rectangle (R)" />
                        <ToolButton icon={<Diamond size={18} />} active={activeTool === "diamond"} onClick={() => selectTool("diamond")} title="Diamond (D)" />
                        <ToolButton icon={<Circle size={18} />} active={activeTool === "ellipse"} onClick={() => selectTool("ellipse")} title="Ellipse (E)" />
                        <ToolButton icon={<Minus size={18} />} active={activeTool === "line"} onClick={() => selectTool("line")} title="Line (L)" />
                        <ToolButton icon={<MoveRight size={18} />} active={activeTool === "arrow"} onClick={() => selectTool("arrow")} title="Arrow (A)" />
                        
                        <div className="w-px bg-zinc-700 mx-1 h-6"></div>
                        
                        {/* Draw Tools */}
                        <ToolButton icon={<Pencil size={18} />} active={activeTool === "free-draw"} onClick={() => selectTool("free-draw")} title="Free Draw (F)" />
                        <ToolButton icon={<Type size={18} />} active={activeTool === "text"} onClick={() => selectTool("text")} title="Text (T)" />
                        <ToolButton icon={<Eraser size={18} />} active={activeTool === "eraser"} onClick={() => selectTool("eraser")} title="Eraser (X)" />
                        
                        <div className="w-px bg-zinc-700 mx-1 h-6"></div>
                        
                        {/* Color */}
                        <input
                            type="color"
                            value={color}
                            onChange={changeColor}
                            className="w-8 h-8 cursor-pointer rounded border border-zinc-600 bg-transparent"
                            title="Color"
                        />
                        
                        <div className="w-px bg-zinc-700 mx-1 h-6"></div>
                        
                        {/* Stroke Width */}
                        <div className="flex gap-1">
                            {([1, 2, 3, 4, 5] as StrokeWidth[]).map(width => (
                                <StrokeWidthButton
                                    key={width}
                                    width={width}
                                    active={strokeWidth === width}
                                    onClick={() => changeStrokeWidth(width)}
                                />
                            ))}
                        </div>
                        
                        <div className="w-px bg-zinc-700 mx-1 h-6"></div>
                        
                        {/* Stroke Style */}
                        <div className="flex gap-1">
                            <StyleButton style="solid" active={strokeStyle === "solid"} onClick={() => changeStrokeStyle("solid")} />
                            <StyleButton style="dashed" active={strokeStyle === "dashed"} onClick={() => changeStrokeStyle("dashed")} />
                            <StyleButton style="dotted" active={strokeStyle === "dotted"} onClick={() => changeStrokeStyle("dotted")} />
                        </div>
                        
                        {/* Font Size (for text tool) */}
                        {activeTool === "text" && (
                            <>
                                <div className="w-px bg-zinc-700 mx-1 h-6"></div>
                                <select
                                    value={fontSize}
                                    onChange={(e) => changeFontSize(e.target.value as FontSize)}
                                    className="bg-zinc-800 text-zinc-200 text-xs px-2 py-1 rounded border border-zinc-600"
                                >
                                    <option value="Small">Small</option>
                                    <option value="Medium">Medium</option>
                                    <option value="Large">Large</option>
                                    <option value="Extra Large">XL</option>
                                </select>
                            </>
                        )}
                        
                        <div className="w-px bg-zinc-700 mx-1 h-6"></div>
                        
                        {/* Zoom Controls */}
                        <div className="flex gap-1">
                            <ToolButton 
                                icon={<ZoomOut size={18} />} 
                                active={false} 
                                onClick={zoomOut} 
                                title="Zoom Out (-)"
                                disabled={!zoomInfo.canZoomOut}
                            />
                            <button 
                                onClick={resetZoom}
                                className="text-xs px-2 py-1 text-zinc-400 hover:text-zinc-200 rounded"
                                title="Reset Zoom (0)"
                            >
                                {Math.round(zoomInfo.scale * 100)}%
                            </button>
                            <ToolButton 
                                icon={<ZoomIn size={18} />} 
                                active={false} 
                                onClick={zoomIn} 
                                title="Zoom In (+)"
                                disabled={!zoomInfo.canZoomIn}
                            />
                        </div>
                        
                        <div className="w-px bg-zinc-700 mx-1 h-6"></div>
                        
                        {/* Clear */}
                        <button 
                            onClick={clearCanvas} 
                            className="text-xs text-red-400 hover:text-red-300 px-2 py-1 rounded font-medium"
                        >
                            Clear
                        </button>
                    </div>
                </div>
            )}

            {loading && (
                <div className="absolute inset-0 flex items-center justify-center bg-zinc-950/80 z-20">
                    <span className="text-zinc-400 font-medium">Loading Canvas...</span>
                </div>
            )}

            {/* Canvas */}
            <canvas ref={canvasRef} className="block touch-none flex-1 cursor-crosshair" />
            <div className="collabydraw-textEditorContainer pointer-events-none absolute inset-0 overflow-hidden"></div>
        </div>
    );
});

// Helper Components
function ToolButton({ 
    icon, 
    active, 
    onClick, 
    title, 
    disabled = false 
}: { 
    icon: React.ReactNode, 
    active: boolean, 
    onClick: () => void, 
    title?: string,
    disabled?: boolean
}) {
    return (
        <button
            onClick={onClick}
            title={title}
            disabled={disabled}
            className={`p-2 rounded-md transition-all ${
                active
                    ? "bg-indigo-600 text-white"
                    : disabled 
                    ? "text-zinc-600 cursor-not-allowed"
                    : "text-zinc-400 hover:bg-zinc-800 hover:text-zinc-200"
            }`}
        >
            {icon}
        </button>
    )
}

function StrokeWidthButton({ 
    width, 
    active, 
    onClick 
}: { 
    width: StrokeWidth, 
    active: boolean, 
    onClick: () => void 
}) {
    return (
        <button
            onClick={onClick}
            title={`Stroke Width: ${width}px`}
            className={`p-2 rounded-md transition-all flex items-center justify-center ${
                active
                    ? "bg-indigo-600 text-white"
                    : "text-zinc-400 hover:bg-zinc-800 hover:text-zinc-200"
            }`}
        >
            <div
                className="bg-current rounded-full"
                style={{
                    width: `${Math.min(width * 2, 8)}px`,
                    height: `${Math.min(width * 2, 8)}px`
                }}
            />
        </button>
    )
}

function StyleButton({ 
    style, 
    active, 
    onClick 
}: { 
    style: StrokeStyle, 
    active: boolean, 
    onClick: () => void 
}) {
    const getLinePattern = () => {
        switch (style) {
            case "solid": return "────";
            case "dashed": return "- - -";
            case "dotted": return "· · ·";
            default: return "────";
        }
    };

    return (
        <button
            onClick={onClick}
            title={`Stroke Style: ${style}`}
            className={`px-2 py-1 rounded-md transition-all text-xs font-mono ${
                active
                    ? "bg-indigo-600 text-white"
                    : "text-zinc-400 hover:bg-zinc-800 hover:text-zinc-200"
            }`}
        >
            {getLinePattern()}
        </button>
    )
}

export default CanvasBoard;