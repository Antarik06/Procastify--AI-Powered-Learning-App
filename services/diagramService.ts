import { GoogleGenAI, Type } from "@google/genai";
import { v4 as uuidv4 } from "uuid";
import { Shape, ShapeBase } from "../components/canvas/types";
const getAI = () => {
  const apiKey = (import.meta.env as any).VITE_GEMINI_API_KEY || (process.env as any).VITE_GEMINI_API_KEY;

  if (!apiKey) {
    console.error(" Gemini API key missing. Did you set VITE_GEMINI_API_KEY in your .env?");
  }

  return new GoogleGenAI({ apiKey });
};

const MODEL_TEXT = 'gemini-3-flash-preview';

interface DiagramNode {
  id: string;
  text: string;
  type: 'rectangle' | 'diamond' | 'ellipse' | 'text';
  x: number;
  y: number;
  width: number;
  height: number;
}

interface DiagramConnection {
  id: string;
  fromNode: string;
  toNode: string;
  label?: string;
}

interface DiagramSpec {
  nodes: DiagramNode[];
  connections: DiagramConnection[];
}

const cleanJSON = (text: string | undefined): string => {
  if (!text) return "";
  let cleaned = text.replace(/^```json\s*/, '').replace(/^```\s*/, '').replace(/```$/, '').trim();
  return cleaned;
};

const safeJSONParse = <T>(text: string, fallback: T): T => {
  try {
    const cleaned = cleanJSON(text);
    if (!cleaned) return fallback;
    return JSON.parse(cleaned);
  } catch (e) {
    console.warn("JSON Parse failed", e);
    return fallback;
  }
};

export const generateDiagramFromText = async (selectedText: string): Promise<DiagramSpec | null> => {
  const ai = getAI();

  if (!selectedText || selectedText.trim().length === 0) {
    console.error("[diagramService] Empty text provided");
    return null;
  }

  const prompt = `
You are an expert diagram generator. Convert the following text into a structured diagram specification.

Text to convert:
${selectedText}

Guidelines:
1. Identify key concepts, entities, or steps (minimum 2, maximum 8)
2. For each concept, determine the best shape type:
   - "rectangle" = standard process step, entity, or concept
   - "diamond" = decision point, conditional, or branching logic
   - "ellipse" = start/end point or external system
   - "text" = simple label or short text
3. Identify relationships between concepts (arrows)
4. Detect patterns like:
   - Sequential steps (flowchart)
   - Hierarchical relationships (org chart)
   - Conditional logic (decision tree)
   - Entity relationships (ER diagram)
   - Comparisons or contrasts

5. **IMPORTANT - Layout Guidelines:**
   - Space shapes at least 200 pixels apart horizontally
   - Space shapes at least 150 pixels apart vertically
   - Use a top-to-bottom flow for sequential steps
   - Place decision branches side-by-side (left/right)
   - Center-align connected elements

Return a JSON object with:
- nodes: array of objects with {id, text, type, x, y, width, height}
  - x and y are relative positions (0-1000 range)
  - width and height are approximate dimensions (80-150 for width, 50-100 for height)
  - Ensure nodes are spaced apart
- connections: array of objects with {id, fromNode, toNode, label?}
  - Only include meaningful connections

Example for a simple process:
{
  "nodes": [
    {"id": "1", "text": "Start", "type": "ellipse", "x": 100, "y": 50, "width": 100, "height": 50},
    {"id": "2", "text": "Process Step", "type": "rectangle", "x": 50, "y": 200, "width": 120, "height": 60},
    {"id": "3", "text": "End", "type": "ellipse", "x": 100, "y": 350, "width": 100, "height": 50}
  ],
  "connections": [
    {"id": "c1", "fromNode": "1", "toNode": "2"},
    {"id": "c2", "fromNode": "2", "toNode": "3"}
  ]
}

Keep text concise (under 20 characters per node).
Return only valid JSON, no markdown formatting.
`;

  try {
    const response = await ai.models.generateContent({
      model: MODEL_TEXT,
      contents: [{ text: prompt }],
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            nodes: {
              type: Type.ARRAY,
              items: {
                type: Type.OBJECT,
                properties: {
                  id: { type: Type.STRING },
                  text: { type: Type.STRING },
                  type: { type: Type.STRING, enum: ['rectangle', 'diamond', 'ellipse', 'text'] },
                  x: { type: Type.NUMBER },
                  y: { type: Type.NUMBER },
                  width: { type: Type.NUMBER },
                  height: { type: Type.NUMBER }
                }
              }
            },
            connections: {
              type: Type.ARRAY,
              items: {
                type: Type.OBJECT,
                properties: {
                  id: { type: Type.STRING },
                  fromNode: { type: Type.STRING },
                  toNode: { type: Type.STRING },
                  label: { type: Type.STRING }
                }
              }
            }
          }
        }
      }
    });

    if (!response || !response.text) {
      console.error("[diagramService] Empty response from AI");
      return null;
    }

    const spec = safeJSONParse<DiagramSpec>(response.text, null);
    
    if (!spec) {
      console.error("[diagramService] Failed to parse diagram spec");
      return null;
    }

    // Validate the spec
    if (!spec.nodes || spec.nodes.length === 0) {
      console.error("[diagramService] No nodes in generated spec");
      return null;
    }

    // Ensure all nodes have required fields
    const validNodes = spec.nodes.filter(node => 
      node.id && node.text && node.type && 
      typeof node.x === 'number' && 
      typeof node.y === 'number' && 
      typeof node.width === 'number' && 
      typeof node.height === 'number'
    );

    if (validNodes.length === 0) {
      console.error("[diagramService] No valid nodes in spec");
      return null;
    }

    // Validate connections reference existing nodes
    const validConnections = (spec.connections || []).filter(conn => 
      conn.id && 
      conn.fromNode && 
      conn.toNode &&
      validNodes.some(n => n.id === conn.fromNode) &&
      validNodes.some(n => n.id === conn.toNode)
    );

    const validatedSpec: DiagramSpec = {
      nodes: validNodes,
      connections: validConnections
    };

    console.log("[diagramService] Generated and validated spec with", validNodes.length, "nodes and", validConnections.length, "connections");
    return validatedSpec;

  } catch (error) {
    console.error("[diagramService] Diagram generation error:", error);
    return null;
  }
};

export const convertSpecToShapes = (spec: DiagramSpec, offsetX: number = 100, offsetY: number = 100): Shape[] => {
  // First pass: Validate and adjust layout to prevent overlaps
  const nodeMap = new Map<string, { x: number; y: number; width: number; height: number; originalIndex: number }>();
  const MIN_SPACING_X = 200;
  const MIN_SPACING_Y = 150;

  // Track occupied regions
  const occupiedRegions: Array<{ x: number; y: number; width: number; height: number }> = [];

  spec.nodes.forEach((node, index) => {
    let finalX = node.x;
    let finalY = node.y;
    const nodeWidth = Math.max(node.width, 80);
    const nodeHeight = Math.max(node.height, 50);

    // Check for overlaps with existing nodes
    let hasOverlap = true;
    let attemptCount = 0;
    const maxAttempts = 5;

    while (hasOverlap && attemptCount < maxAttempts) {
      hasOverlap = false;

      for (const region of occupiedRegions) {
        // Check if current position overlaps
        if (
          finalX < region.x + region.width + MIN_SPACING_X &&
          finalX + nodeWidth + MIN_SPACING_X > region.x &&
          finalY < region.y + region.height + MIN_SPACING_Y &&
          finalY + nodeHeight + MIN_SPACING_Y > region.y
        ) {
          hasOverlap = true;
          // Move right or down
          if (attemptCount < 3) {
            finalX += MIN_SPACING_X + 50;
          } else {
            finalY += MIN_SPACING_Y + 50;
          }
          break;
        }
      }
      attemptCount++;
    }

    occupiedRegions.push({ x: finalX, y: finalY, width: nodeWidth, height: nodeHeight });
    nodeMap.set(node.id, { x: finalX, y: finalY, width: nodeWidth, height: nodeHeight, originalIndex: index });
  });

  const shapes: Shape[] = [];
  const nodeIdToShapeId: Record<string, string> = {};

  // Create shapes from validated nodes
  spec.nodes.forEach((node) => {
    const shapeId = uuidv4();
    nodeIdToShapeId[node.id] = shapeId;

    const nodeLayout = nodeMap.get(node.id);
    if (!nodeLayout) return;

    const x = nodeLayout.x + offsetX;
    const y = nodeLayout.y + offsetY;
    const width = nodeLayout.width;
    const height = nodeLayout.height;

    const base = {
      id: shapeId,
      x,
      y,
      strokeWidth: 2 as const,
      strokeFill: "#ffffff",
      strokeEdge: "round" as const,
      strokeStyle: "solid" as const,
      roughStyle: 0 as const,
    };

    let shape: Shape;

    switch (node.type) {
      case 'rectangle':
        shape = {
          ...base,
          type: 'rectangle',
          width,
          height,
          bgFill: '#3b82f6',
          rounded: 'sharp',
          fillStyle: 'hachure'
        };
        break;
      case 'diamond':
        shape = {
          ...base,
          type: 'diamond',
          width,
          height,
          bgFill: '#8b5cf6',
          rounded: 'sharp',
          fillStyle: 'hachure'
        };
        break;
      case 'ellipse':
        shape = {
          ...base,
          type: 'ellipse',
          radX: width / 2,
          radY: height / 2,
          bgFill: '#10b981',
          fillStyle: 'hachure'
        };
        break;
      case 'text':
      default:
        shape = {
          id: shapeId,
          type: 'text',
          x,
          y,
          width,
          height,
          text: node.text,
          lines: [node.text],
          fontSize: 'Medium' as const,
          fontFamily: 'normal' as const,
          textAlign: 'center' as const,
          strokeFill: "#ffffff",
          strokeWidth: 1,
        };
        break;
    }

    shapes.push(shape);

    // Add text label inside shapes (except for text shapes)
    if (node.type !== 'text' && node.text && node.text.length > 0) {
      const textShape: Shape = {
        id: uuidv4(),
        type: 'text',
        x: x + width / 2,
        y: y + height / 2 - 10,
        width: 0,
        height: 0,
        text: node.text,
        lines: [node.text],
        fontSize: 'Small' as const,
        fontFamily: 'normal' as const,
        textAlign: 'center' as const,
        strokeFill: "#ffffff",
        strokeWidth: 1,
      };
      shapes.push(textShape);
    }
  });

  // Create arrows between shapes
  spec.connections.forEach((conn) => {
    const fromShapeId = nodeIdToShapeId[conn.fromNode];
    const toShapeId = nodeIdToShapeId[conn.toNode];

    if (!fromShapeId || !toShapeId) return;

    const fromShape = shapes.find(s => s.id === fromShapeId);
    const toShape = shapes.find(s => s.id === toShapeId);

    if (!fromShape || !toShape) return;

    // Calculate connection points - use type casting to handle Shape union types
    const getConnectionPoint = (shape: Shape, isSource: boolean): { x: number; y: number } => {
      const shapeAny = shape as any;
      if (shape.type === 'rectangle' || shape.type === 'diamond') {
        return {
          x: shapeAny.x + shapeAny.width / 2,
          y: isSource ? shapeAny.y + shapeAny.height : shapeAny.y
        };
      } else if (shape.type === 'ellipse') {
        return {
          x: shapeAny.x + (shapeAny.radX || 0),
          y: shapeAny.y + (shapeAny.radY || 0)
        };
      } else {
        return { x: shapeAny.x, y: shapeAny.y };
      }
    };

    const fromPoint = getConnectionPoint(fromShape, true);
    const toPoint = getConnectionPoint(toShape, false);

    const arrowShape: Shape = {
      id: uuidv4(),
      type: 'arrow',
      x: fromPoint.x,
      y: fromPoint.y,
      toX: toPoint.x,
      toY: toPoint.y,
      strokeWidth: 2,
      strokeFill: "#a0aec0",
      strokeStyle: "solid",
      roughStyle: 0,
    };

    shapes.push(arrowShape);

    // Add connection label if present
    if (conn.label && conn.label.length > 0) {
      const midX = (fromPoint.x + toPoint.x) / 2;
      const midY = (fromPoint.y + toPoint.y) / 2;

      const labelShape: Shape = {
        id: uuidv4(),
        type: 'text',
        x: midX,
        y: midY - 15,
        width: 0,
        height: 0,
        text: conn.label,
        lines: [conn.label],
        fontSize: 'Small' as const,
        fontFamily: 'normal' as const,
        textAlign: 'center' as const,
        strokeFill: "#a0aec0",
        strokeWidth: 1,
      };

      shapes.push(labelShape);
    }
  });

  console.log("[diagramService] Generated shapes:", shapes.length, shapes);
  return shapes;
};

export const generateSimpleLayout = (
  nodeCount: number,
  startX: number = 100,
  startY: number = 100,
  spacingX: number = 150,
  spacingY: number = 100
): { x: number; y: number; width: number; height: number }[] => {
  const layout: { x: number; y: number; width: number; height: number }[] = [];

  const cols = Math.ceil(Math.sqrt(nodeCount));
  const rows = Math.ceil(nodeCount / cols);

  for (let i = 0; i < nodeCount; i++) {
    const col = i % cols;
    const row = Math.floor(i / cols);

    layout.push({
      x: startX + col * spacingX,
      y: startY + row * spacingY,
      width: 120,
      height: 60
    });
  }

  return layout;
};
