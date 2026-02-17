// ============================================================
// WorkflowBoard Types
// Follows existing project types conventions
// ============================================================

export interface Subtask {
  id: string;
  title: string;
  done: boolean;
}

export type TaskPriority = 'low' | 'medium' | 'high';

export type LabelColor =
  | '#5865F2' // Discord accent (blue/purple)
  | '#57F287' // Green
  | '#FEE75C' // Yellow
  | '#ED4245' // Red
  | '#EB459E' // Pink
  | '#3BA55D' // Teal-green
  | '#FAA61A' // Orange
  | '#9B59B6'; // Purple

export interface BoardTask {
  id: string;
  title: string;
  description: string;
  columnId: string;
  position: number;
  dueDate: string | null;         // ISO string or null
  priority: TaskPriority;
  labels: LabelColor[];
  subtasks: Subtask[];
  timeAllocation: number | null;  // minutes, optional
  createdAt: number;              // timestamp
}

export interface BoardColumn {
  id: string;
  title: string;
  order: number;
  collapsed: boolean;
}

export interface Board {
  id: string;
  name: string;
  createdAt: number;
  columnOrder: string[];
}

// ---- UI drag state ----
export interface DragItem {
  type: 'TASK' | 'COLUMN';
  id: string;
  fromColumnId?: string;
  fromIndex?: number;
}
