
export interface Subtask {
  id: string;
  title: string;
  done: boolean;
}

export type TaskPriority = 'low' | 'medium' | 'high';

export type LabelColor =
  | '#5865F2'
  | '#57F287'
  | '#FEE75C'
  | '#ED4245'
  | '#EB459E'
  | '#3BA55D'
  | '#FAA61A'
  | '#9B59B6';

export interface BoardTask {
  id: string;
  title: string;
  description: string;
  columnId: string;
  position: number;
  dueDate: string | null;
  priority: TaskPriority;
  labels: LabelColor[];
  subtasks: Subtask[];
  timeAllocation: number | null;
  createdAt: number;
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

export interface DragItem {
  type: 'TASK' | 'COLUMN';
  id: string;
  fromColumnId?: string;
  fromIndex?: number;
}
