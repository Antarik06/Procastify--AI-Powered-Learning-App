
"use client";

import React, { useEffect, useRef, useState } from "react";
import { CanvasEngine } from "./canvas/CanvasEngine";
import { ToolType, Shape } from "./canvas/types";
import { MousePointer, Hand, Square, Circle, Minus, Pencil, Eraser, Type, Diamond, MoveRight } from "lucide-react";

interface CanvasBoardProps {
    canvasId: string;
    readOnly?: boolean;
}

export default function CanvasBoard({ canvasId, readOnly = false }: CanvasBoardProps) {
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const [engine, setEngine] = useState<CanvasEngine | null>(null);
    const [activeTool, setActiveTool] = useState<ToolType>("selection");
    const [color, setColor] = useState("#ffffff"); // Default White
    const [loading, setLoading] = useState(true);



    useEffect(() => {
        if (!canvasRef.current || !canvasId) return;

        // Loading State
        setLoading(true);

        const canvas = canvasRef.current;
        const parent = canvas.parentElement;

        // Initialize Engine
        let engineInstance = engine;
        if (!engineInstance) {
            engineInstance = new CanvasEngine(canvas, canvasId);
            setEngine(engineInstance);
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

    const clearCanvas = () => {
        if (engine && !readOnly) engine.clear();
    };

    return (
        <div className="relative w-full h-full overflow-hidden bg-zinc-950 flex flex-col">
            {/* Toolbar */}
            {!readOnly && (
                <div className="absolute top-4 left-1/2 transform -translate-x-1/2 bg-zinc-900 shadow-xl rounded-lg p-2 flex gap-2 z-10 border border-zinc-800">
                    <ToolButton icon={<MousePointer size={18} />} active={activeTool === "selection"} onClick={() => selectTool("selection")} title="Select" />
                    <ToolButton icon={<Hand size={18} />} active={activeTool === "grab"} onClick={() => selectTool("grab")} title="Pan (Hold Space)" />
                    <div className="w-px bg-zinc-700 mx-1"></div>
                    <ToolButton icon={<Square size={18} />} active={activeTool === "rectangle"} onClick={() => selectTool("rectangle")} title="Rectangle" />
                    <ToolButton icon={<Diamond size={18} />} active={activeTool === "diamond"} onClick={() => selectTool("diamond")} title="Diamond" />
                    <ToolButton icon={<Circle size={18} />} active={activeTool === "ellipse"} onClick={() => selectTool("ellipse")} title="Ellipse" />
                    <ToolButton icon={<Minus size={18} />} active={activeTool === "line"} onClick={() => selectTool("line")} title="Line" />
                    <ToolButton icon={<MoveRight size={18} />} active={activeTool === "arrow"} onClick={() => selectTool("arrow")} title="Arrow" />
                    <ToolButton icon={<Pencil size={18} />} active={activeTool === "free-draw"} onClick={() => selectTool("free-draw")} title="Free Draw" />
                    <ToolButton icon={<Type size={18} />} active={activeTool === "text"} onClick={() => selectTool("text")} title="Text" />
                    <div className="w-px bg-zinc-700 mx-1"></div>
                    <ToolButton icon={<Eraser size={18} />} active={activeTool === "eraser"} onClick={() => selectTool("eraser")} title="Eraser" />

                    <input
                        type="color"
                        value={color}
                        onChange={changeColor}
                        className="w-6 h-6 cursor-pointer rounded bg-transparent border-none ml-2"
                        title="Color"
                    />

                    <button onClick={clearCanvas} className="text-xs text-red-400 hover:text-red-300 px-2 rounded font-medium">Clear</button>
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
}

// Simple Helper Component
function ToolButton({ icon, active, onClick, title }: { icon: React.ReactNode, active: boolean, onClick: () => void, title?: string }) {
    return (
        <button
            onClick={onClick}
            title={title}
            className={`p-2 rounded-md transition-all ${active
                ? "bg-indigo-600 text-white"
                : "text-zinc-400 hover:bg-zinc-800 hover:text-zinc-200"
                }`}
        >
            {icon}
        </button>
    )
}
