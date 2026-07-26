
"use client";

import React, { useEffect, useRef, useState, forwardRef, useImperativeHandle } from "react";
import { CanvasEngine } from "./canvas/CanvasEngine";
import { ToolType, Shape, StrokeWidth, StrokeStyle, RoughStyle, FillStyle, FontSize } from "./canvas/types";
import { CanvasLayoutMode } from "../types";
import { CanvasLayoutService } from "../services/canvasLayoutService";
import { TopNavBar, ToolRail, CanvasActionBar } from "./CanvasToolbars";
import { LayoutSwitcher, LayoutSwitcherFAB } from "./LayoutSwitcher";
import styles from "./canvas.module.css";

/** Below this width a horizontal toolbar no longer fits, so we fall back to the rail. */
const NARROW_BREAKPOINT = 760;

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
    const containerRef = useRef<HTMLDivElement>(null);
    const [engine, setEngine] = useState<CanvasEngine | null>(null);
    const [activeTool, setActiveTool] = useState<ToolType>("selection");
    const [color, setColor] = useState("#ffffff");
    const [loading, setLoading] = useState(true);

    // Layout state
    const [layoutMode, setLayoutMode] = useState<CanvasLayoutMode>("topbar");
    // The pane can be narrower than the viewport (split view), so toolbars adapt
    // to the container rather than to a media query.
    const [isNarrow, setIsNarrow] = useState(false);

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

        // Load layout preferences
        const preferences = CanvasLayoutService.getLocalPreferences();
        setLayoutMode(preferences.layoutMode);

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

                setIsNarrow(rect.width > 0 && rect.width < NARROW_BREAKPOINT);

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

    const changeColor = (value: string) => {
        setColor(value);
        if (engine) engine.strokeFill = value;
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

    const handleLayoutChange = (newLayout: CanvasLayoutMode) => {
        setLayoutMode(newLayout);
        CanvasLayoutService.setLayoutMode(newLayout);
    };

    // Keyboard shortcuts (the ones advertised in the toolbar tooltips).
    useEffect(() => {
        if (readOnly || !engine) return;

        const shortcuts: Record<string, ToolType> = {
            v: "selection",
            h: "grab",
            r: "rectangle",
            d: "diamond",
            o: "ellipse",
            l: "line",
            a: "arrow",
            p: "free-draw",
            t: "text",
            e: "eraser",
        };

        const handleKeyDown = (e: KeyboardEvent) => {
            if (e.ctrlKey || e.metaKey || e.altKey) return;

            const target = e.target as HTMLElement | null;
            if (
                target &&
                (target.isContentEditable ||
                    ["INPUT", "TEXTAREA", "SELECT"].includes(target.tagName))
            ) {
                return;
            }

            // Only react while the pointer is over this canvas, so shortcuts don't
            // fire while the user is working in the document pane next to it.
            if (!containerRef.current?.matches(":hover")) return;

            const key = e.key.toLowerCase();
            if (shortcuts[key]) {
                e.preventDefault();
                selectTool(shortcuts[key]);
                return;
            }

            if (key === "+" || key === "=") {
                e.preventDefault();
                zoomIn();
            } else if (key === "-" || key === "_") {
                e.preventDefault();
                zoomOut();
            } else if (key === "0") {
                e.preventDefault();
                resetZoom();
            }
        };

        window.addEventListener("keydown", handleKeyDown);
        return () => window.removeEventListener("keydown", handleKeyDown);
    }, [engine, readOnly]);

    // Expose methods via ref
    useImperativeHandle(ref, () => ({
        addShapes: (shapes: Shape[]) => {
            if (engine) {
                engine.addShapes(shapes);
            }
        },
        clear: () => {
            clearCanvas();
        }
    }), [engine, readOnly]);

    // Toolbars float above the canvas, so the drawing surface always fills the
    // container. A narrow pane (e.g. split view) always uses the vertical rail.
    const effectiveLayout: CanvasLayoutMode =
        layoutMode === 'topbar' && isNarrow ? 'sidebar-left' : layoutMode;
    const railSide = effectiveLayout === 'sidebar-right' ? 'right' : 'left';

    const toolBarProps = {
        activeTool,
        color,
        strokeWidth,
        strokeStyle,
        fontSize,
        zoomScale: zoomInfo.scale,
        canZoomIn: zoomInfo.canZoomIn,
        canZoomOut: zoomInfo.canZoomOut,
        onSelectTool: selectTool,
        onColorChange: changeColor,
        onStrokeWidthChange: changeStrokeWidth,
        onStrokeStyleChange: changeStrokeStyle,
        onFontSizeChange: changeFontSize,
        onZoomIn: zoomIn,
        onZoomOut: zoomOut,
        onResetZoom: resetZoom,
        onClear: clearCanvas,
    };

    return (
        <div ref={containerRef} className={styles.canvasContainer}>
            {/* Layout Switcher */}
            {!readOnly && effectiveLayout !== 'minimal' && (
                <div className="absolute top-3 right-3 z-30">
                    <LayoutSwitcher
                        currentLayout={layoutMode}
                        onLayoutChange={handleLayoutChange}
                        compact={isNarrow}
                    />
                </div>
            )}

            {/* Tools */}
            {!readOnly && effectiveLayout === 'topbar' && <TopNavBar {...toolBarProps} />}

            {!readOnly &&
                (effectiveLayout === 'sidebar-left' || effectiveLayout === 'sidebar-right') && (
                    <ToolRail side={railSide} {...toolBarProps} />
                )}

            {/* Zoom + canvas actions (hidden in minimal mode) */}
            {!readOnly && effectiveLayout !== 'minimal' && (
                <CanvasActionBar
                    zoomScale={zoomInfo.scale}
                    canZoomIn={zoomInfo.canZoomIn}
                    canZoomOut={zoomInfo.canZoomOut}
                    onZoomIn={zoomIn}
                    onZoomOut={zoomOut}
                    onResetZoom={resetZoom}
                    onClear={clearCanvas}
                    align={railSide === 'left' ? 'right' : 'left'}
                />
            )}

            {/* Minimal Mode FAB */}
            {!readOnly && effectiveLayout === 'minimal' && (
                <LayoutSwitcherFAB
                    currentLayout={layoutMode}
                    onLayoutChange={handleLayoutChange}
                />
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

export default CanvasBoard;