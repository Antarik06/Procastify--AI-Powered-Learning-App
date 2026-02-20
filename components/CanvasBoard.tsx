
"use client";

import React, { useEffect, useRef, useState, forwardRef, useImperativeHandle } from "react";
import { CanvasEngine } from "./canvas/CanvasEngine";
import { ToolType, Shape, StrokeWidth, StrokeStyle, RoughStyle, FillStyle, FontSize } from "./canvas/types";
import { CanvasLayoutMode } from "../types";
import { CanvasLayoutService } from "../services/canvasLayoutService";
import { TopNavBar, SidebarToolBar } from "./CanvasToolbars";
import { LayoutSwitcher, LayoutSwitcherFAB } from "./LayoutSwitcher";
import styles from "./canvas.module.css";

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

    // Layout state
    const [layoutMode, setLayoutMode] = useState<CanvasLayoutMode>("topbar");
    const [sidebarWidth, setSidebarWidth] = useState(280);

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
        if (preferences.sidebarWidth) {
            setSidebarWidth(preferences.sidebarWidth);
        }

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

    const handleLayoutChange = (newLayout: CanvasLayoutMode) => {
        setLayoutMode(newLayout);
        CanvasLayoutService.setLayoutMode(newLayout);
    };

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

    // Compute container class
    let containerClass = `${styles.canvasContainer}`;
    if (layoutMode === 'topbar' && !readOnly) {
        containerClass += ` ${styles.canvasContainerWithTopBar}`;
    } else if (layoutMode === 'sidebar-left' && !readOnly) {
        containerClass += ` ${styles.canvasContainerWithLeftSidebar}`;
    } else if (layoutMode === 'sidebar-right' && !readOnly) {
        containerClass += ` ${styles.canvasContainerWithRightSidebar}`;
    }

    return (
        <div className={containerClass}>
            {/* Layout Switcher - Always visible in non-readonly mode */}
            {!readOnly && (
                <div className="absolute top-4 right-4 z-10">
                    <LayoutSwitcher 
                        currentLayout={layoutMode} 
                        onLayoutChange={handleLayoutChange}
                    />
                </div>
            )}

            {/* Top Navigation Bar */}
            {!readOnly && layoutMode === 'topbar' && (
                <TopNavBar
                    activeTool={activeTool}
                    color={color}
                    strokeWidth={strokeWidth}
                    strokeStyle={strokeStyle}
                    fontSize={fontSize}
                    zoomScale={zoomInfo.scale}
                    canZoomIn={zoomInfo.canZoomIn}
                    canZoomOut={zoomInfo.canZoomOut}
                    onSelectTool={selectTool}
                    onColorChange={changeColor}
                    onStrokeWidthChange={changeStrokeWidth}
                    onStrokeStyleChange={changeStrokeStyle}
                    onFontSizeChange={changeFontSize}
                    onZoomIn={zoomIn}
                    onZoomOut={zoomOut}
                    onResetZoom={resetZoom}
                    onClear={clearCanvas}
                />
            )}

            {/* Left Sidebar */}
            {!readOnly && layoutMode === 'sidebar-left' && (
                <div className={`${styles.sidebarToolbar} ${styles.sidebarToolbarLeft}`}>
                    <SidebarToolBar
                        side="left"
                        width={sidebarWidth}
                        activeTool={activeTool}
                        color={color}
                        strokeWidth={strokeWidth}
                        strokeStyle={strokeStyle}
                        fontSize={fontSize}
                        zoomScale={zoomInfo.scale}
                        canZoomIn={zoomInfo.canZoomIn}
                        canZoomOut={zoomInfo.canZoomOut}
                        onSelectTool={selectTool}
                        onColorChange={changeColor}
                        onStrokeWidthChange={changeStrokeWidth}
                        onStrokeStyleChange={changeStrokeStyle}
                        onFontSizeChange={changeFontSize}
                        onZoomIn={zoomIn}
                        onZoomOut={zoomOut}
                        onResetZoom={resetZoom}
                        onClear={clearCanvas}
                    />
                </div>
            )}

            {/* Right Sidebar */}
            {!readOnly && layoutMode === 'sidebar-right' && (
                <div className={`${styles.sidebarToolbar} ${styles.sidebarToolbarRight}`}>
                    <SidebarToolBar
                        side="right"
                        width={sidebarWidth}
                        activeTool={activeTool}
                        color={color}
                        strokeWidth={strokeWidth}
                        strokeStyle={strokeStyle}
                        fontSize={fontSize}
                        zoomScale={zoomInfo.scale}
                        canZoomIn={zoomInfo.canZoomIn}
                        canZoomOut={zoomInfo.canZoomOut}
                        onSelectTool={selectTool}
                        onColorChange={changeColor}
                        onStrokeWidthChange={changeStrokeWidth}
                        onStrokeStyleChange={changeStrokeStyle}
                        onFontSizeChange={changeFontSize}
                        onZoomIn={zoomIn}
                        onZoomOut={zoomOut}
                        onResetZoom={resetZoom}
                        onClear={clearCanvas}
                    />
                </div>
            )}

            {/* Minimal Mode FAB */}
            {!readOnly && layoutMode === 'minimal' && (
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