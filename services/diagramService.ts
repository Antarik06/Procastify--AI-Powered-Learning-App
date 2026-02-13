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

  const prompt = `
You are an expert diagram generator. Convert the following text into a structured diagram specification.

Text to convert:
${selectedText}

Guidelines:
1. Identify key concepts, entities, or steps
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
  - width and height are approximate dimensions
- connections: array of objects with {id, fromNode, toNode, label?}

Example format:
{
  "nodes": [
    {"id": "1", "text": "Start", "type": "ellipse", "x": 50, "y": 50, "width": 80, "height": 40},
    {"id": "2", "text": "Process", "type": "rectangle", "x": 50, "y": 150, "width": 100, "height": 50}
  ],
  "connections": [
    {"id": "c1", "fromNode": "1", "toNode": "2"}
  ]
}

Keep text concise (under 30 characters per node if possible).
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
      console.error("Empty response from AI");
      return null;
    }

    const spec = safeJSONParse<DiagramSpec>(response.text, null);
    return spec;

  } catch (error) {
    console.error("Diagram generation error:", error);
    return null;
  }
};

export const convertSpecToShapes = (spec: DiagramSpec, offsetX: number = 100, offsetY: number = 100): Shape[] => {
  const shapes: Shape[] = [];
  const nodeIdMap: Record<string, string> = {};

  spec.nodes.forEach((node, index) => {
    const shapeId = uuidv4();
    nodeIdMap[node.id] = shapeId;

    const base = {
      id: shapeId,
      x: node.x + offsetX,
      y: node.y + offsetY,
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
          width: node.width,
          height: node.height,
          bgFill: '#3b82f6',
          rounded: 'sharp',
          fillStyle: 'hachure'
        };
        break;
      case 'diamond':
        shape = {
          ...base,
          type: 'diamond',
          width: node.width,
          height: node.height,
          bgFill: '#8b5cf6',
          rounded: 'sharp',
          fillStyle: 'hachure'
        };
        break;
      case 'ellipse':
        shape = {
          ...base,
          type: 'ellipse',
          radX: node.width / 2,
          radY: node.height / 2,
          bgFill: '#10b981',
          fillStyle: 'hachure'
        };
        break;
      case 'text':
      default:
        shape = {
          id: shapeId,
          type: 'text',
          x: node.x + offsetX,
          y: node.y + offsetY,
          width: node.width,
          height: node.height,
          text: node.text,
          fontSize: 'Medium' as const,
          fontFamily: 'normal' as const,
          textAlign: 'center' as const,
          strokeFill: "#ffffff",
          strokeWidth: 2,
        };
        break;
    }

    shapes.push(shape);

    if (node.type !== 'text' && node.text) {
      const textShape: Shape = {
        id: uuidv4(),
        type: 'text',
        x: node.x + offsetX + node.width / 2,
        y: node.y + offsetY + node.height / 2 - 10,
        width: 0,
        height: 0,
        text: node.text,
        fontSize: 'Small' as const,
        fontFamily: 'normal' as const,
        textAlign: 'center' as const,
        strokeFill: "#ffffff",
        strokeWidth: 1,
      };
      shapes.push(textShape);
    }
  });

  spec.connections.forEach((conn) => {
    const fromShapeId = nodeIdMap[conn.fromNode];
    const toShapeId = nodeIdMap[conn.toNode];

    if (!fromShapeId || !toShapeId) return;

    const fromShape = shapes.find(s => s.id === fromShapeId);
    const toShape = shapes.find(s => s.id === toShapeId);

    if (!fromShape || !toShape) return;

    let toX: number, toY: number;
    let fromX: number, fromY: number;

    const getShapeCenter = (shape: Shape): { x: number; y: number } | null => {
      if (shape.type === 'rectangle' || shape.type === 'diamond') {
        return { x: shape.x + shape.width / 2, y: shape.y + shape.height / 2 };
      } else if (shape.type === 'ellipse') {
        return { x: shape.x, y: shape.y };
      } else if (shape.type === 'text') {
        return { x: shape.x, y: shape.y };
      } else if (shape.type === 'line' || shape.type === 'arrow') {
        return { x: shape.x, y: shape.y };
      }
      return null;
    };

    const fromCenter = getShapeCenter(fromShape);
    const toCenter = getShapeCenter(toShape);

    if (!fromCenter || !toCenter) return;

    fromX = fromCenter.x;
    fromY = fromCenter.y;
    toX = toCenter.x;
    toY = toCenter.y;

    const arrowShape: Shape = {
      id: uuidv4(),
      type: 'arrow',
      x: fromX,
      y: fromY,
      toX,
      toY,
      strokeWidth: 2,
      strokeFill: "#ffffff",
      strokeStyle: "solid",
      roughStyle: 0,
    };

    shapes.push(arrowShape);

    if (conn.label) {
      const midX = (fromX + toX) / 2;
      const midY = (fromY + toY) / 2;

      const labelShape: Shape = {
        id: uuidv4(),
        type: 'text',
        x: midX,
        y: midY - 10,
        width: 0,
        height: 0,
        text: conn.label,
        fontSize: 'Small' as const,
        fontFamily: 'normal' as const,
        textAlign: 'center' as const,
        strokeFill: "#ffffff",
        strokeWidth: 1,
      };

      shapes.push(labelShape);
    }
  });

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
