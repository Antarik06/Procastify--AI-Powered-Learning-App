// ============================================================
// boardService.ts — Firestore operations for WorkflowBoard
// Follows existing project service conventions
// Structure: users/{userId}/boards/{boardId}
//            users/{userId}/boards/{boardId}/columns/{columnId}
//            users/{userId}/boards/{boardId}/tasks/{taskId}
// ============================================================

import {
    collection,
    doc,
    getDoc,
    getDocs,
    setDoc,
    updateDoc,
    deleteDoc,
    writeBatch,
    query,
    orderBy,
    serverTimestamp,
    Timestamp,
    Firestore,
  } from 'firebase/firestore';
  import { db as firebaseDb } from '../../firebaseConfig';
  import { Board, BoardColumn, BoardTask } from './types';
  
  // Use the project-level db instance, fall back to null if unconfigured
  const getDb = (): Firestore | null => firebaseDb as Firestore | null;
  
  const DB_AVAILABLE = () => !!getDb();
  
  // ── helpers ──────────────────────────────────────────────────
  
  const boardsCol = (userId: string) => `users/${userId}/boards`;
  const columnsCol = (userId: string, boardId: string) =>
    `users/${userId}/boards/${boardId}/columns`;
  const tasksCol = (userId: string, boardId: string) =>
    `users/${userId}/boards/${boardId}/tasks`;
  
  // ── Board CRUD ───────────────────────────────────────────────
  
  /** Load (or create default) board for a user */
  export async function loadOrCreateBoard(userId: string): Promise<{
    board: Board;
    columns: BoardColumn[];
    tasks: BoardTask[];
  }> {
    if (!DB_AVAILABLE()) return buildLocalDefault(userId);
  
    const db = getDb()!;
    const boardsRef = collection(db, boardsCol(userId));
    const snap = await getDocs(boardsRef);
  
    if (!snap.empty) {
      const boardDoc = snap.docs[0];
      const board = { id: boardDoc.id, ...boardDoc.data() } as Board;
  
      // Load columns
      const colsSnap = await getDocs(
        query(collection(db, columnsCol(userId, board.id)), orderBy('order', 'asc'))
      );
      const columns: BoardColumn[] = colsSnap.docs.map((d) => ({
        id: d.id,
        ...(d.data() as Omit<BoardColumn, 'id'>),
      }));
  
      // Load tasks
      const tasksSnap = await getDocs(collection(db, tasksCol(userId, board.id)));
      const tasks: BoardTask[] = tasksSnap.docs.map((d) => {
        const data = d.data() as any;
        return {
          ...data,
          id: d.id,
          dueDate: data.dueDate instanceof Timestamp ? data.dueDate.toDate().toISOString() : data.dueDate,
          createdAt: data.createdAt instanceof Timestamp ? data.createdAt.toDate().getTime() : data.createdAt,
        } as BoardTask;
      });
  
      return { board, columns, tasks };
    }
  
    // No board exists → create default
    return createDefaultBoard(userId);
  }
  
  /** Create the default board with 3 columns */
  export async function createDefaultBoard(userId: string): Promise<{
    board: Board;
    columns: BoardColumn[];
    tasks: BoardTask[];
  }> {
    if (!DB_AVAILABLE()) return buildLocalDefault(userId);
  
    const db = getDb()!;
    const boardRef = doc(collection(db, boardsCol(userId)));
    const board: Board = {
      id: boardRef.id,
      name: 'My Workflow',
      createdAt: Date.now(),
      columnOrder: [],
    };
    await setDoc(boardRef, { name: board.name, createdAt: serverTimestamp(), columnOrder: [] });
  
    const defaultCols = [
      { title: 'To Do', order: 0 },
      { title: 'In Progress', order: 1 },
      { title: 'Done', order: 2 },
    ];
  
    const columns: BoardColumn[] = [];
    const batch = writeBatch(db);
    const colIds: string[] = [];
  
    for (const col of defaultCols) {
      const colRef = doc(collection(db, columnsCol(userId, board.id)));
      batch.set(colRef, { ...col, collapsed: false });
      columns.push({ id: colRef.id, ...col, collapsed: false });
      colIds.push(colRef.id);
    }
  
    // Update columnOrder on board
    batch.update(boardRef, { columnOrder: colIds });
    await batch.commit();
  
    board.columnOrder = colIds;
    return { board, columns, tasks: [] };
  }
  
  // ── Column CRUD ──────────────────────────────────────────────
  
  export async function addColumn(
    userId: string,
    boardId: string,
    title: string,
    order: number
  ): Promise<BoardColumn> {
    const db = getDb()!;
    const colRef = doc(collection(db, columnsCol(userId, boardId)));
    const col: Omit<BoardColumn, 'id'> = { title, order, collapsed: false };
    await setDoc(colRef, col);
  
    // append to board's columnOrder
    const boardRef = doc(db, boardsCol(userId), boardId);
    const boardSnap = await getDoc(boardRef);
    const existing: string[] = boardSnap.data()?.columnOrder ?? [];
    await updateDoc(boardRef, { columnOrder: [...existing, colRef.id] });
  
    return { id: colRef.id, ...col };
  }
  
  export async function renameColumn(
    userId: string,
    boardId: string,
    columnId: string,
    title: string
  ): Promise<void> {
    const db = getDb()!;
    await updateDoc(doc(db, columnsCol(userId, boardId), columnId), { title });
  }
  
  export async function deleteColumn(
    userId: string,
    boardId: string,
    columnId: string,
    taskIds: string[]
  ): Promise<void> {
    const db = getDb()!;
    const batch = writeBatch(db);
  
    // Delete all tasks in this column
    for (const tid of taskIds) {
      batch.delete(doc(db, tasksCol(userId, boardId), tid));
    }
  
    // Delete the column itself
    batch.delete(doc(db, columnsCol(userId, boardId), columnId));
  
    // Remove from board columnOrder
    const boardRef = doc(db, boardsCol(userId), boardId);
    const boardSnap = await getDoc(boardRef);
    const order: string[] = (boardSnap.data()?.columnOrder ?? []).filter((id: string) => id !== columnId);
    batch.update(boardRef, { columnOrder: order });
  
    await batch.commit();
  }
  
  export async function saveColumnOrder(
    userId: string,
    boardId: string,
    columnOrder: string[]
  ): Promise<void> {
    const db = getDb()!;
    const batch = writeBatch(db);
    const boardRef = doc(db, boardsCol(userId), boardId);
    batch.update(boardRef, { columnOrder });
  
    // Also update 'order' field on each column
    columnOrder.forEach((colId, idx) => {
      batch.update(doc(db, columnsCol(userId, boardId), colId), { order: idx });
    });
  
    await batch.commit();
  }
  
  export async function toggleColumnCollapse(
    userId: string,
    boardId: string,
    columnId: string,
    collapsed: boolean
  ): Promise<void> {
    const db = getDb()!;
    await updateDoc(doc(db, columnsCol(userId, boardId), columnId), { collapsed });
  }
  
  // ── Task CRUD ────────────────────────────────────────────────
  
  export async function addTask(
    userId: string,
    boardId: string,
    task: Omit<BoardTask, 'id'>
  ): Promise<BoardTask> {
    const db = getDb()!;
    const taskRef = doc(collection(db, tasksCol(userId, boardId)));
    const payload = {
      ...task,
      createdAt: serverTimestamp(),
      dueDate: task.dueDate ?? null,
    };
    await setDoc(taskRef, payload);
    return { ...task, id: taskRef.id };
  }
  
  export async function updateTask(
    userId: string,
    boardId: string,
    taskId: string,
    updates: Partial<BoardTask>
  ): Promise<void> {
    const db = getDb()!;
    await updateDoc(doc(db, tasksCol(userId, boardId), taskId), updates as any);
  }
  
  export async function deleteTask(
    userId: string,
    boardId: string,
    taskId: string
  ): Promise<void> {
    const db = getDb()!;
    await deleteDoc(doc(db, tasksCol(userId, boardId), taskId));
  }
  
  /**
   * Persist reordering of tasks using a batched write.
   * Updates columnId and position for each task in affected columns.
   */
  export async function saveTaskPositions(
    userId: string,
    boardId: string,
    tasks: BoardTask[]
  ): Promise<void> {
    const db = getDb()!;
    const batch = writeBatch(db);
  
    for (const task of tasks) {
      batch.update(doc(db, tasksCol(userId, boardId), task.id), {
        columnId: task.columnId,
        position: task.position,
      });
    }
  
    await batch.commit();
  }
  
  // ── Local fallback (no Firebase) ────────────────────────────
  
  function buildLocalDefault(userId: string): { board: Board; columns: BoardColumn[]; tasks: BoardTask[] } {
    const boardId = `local-${userId}`;
    const cols: BoardColumn[] = [
      { id: 'col-todo', title: 'To Do', order: 0, collapsed: false },
      { id: 'col-inprogress', title: 'In Progress', order: 1, collapsed: false },
      { id: 'col-done', title: 'Done', order: 2, collapsed: false },
    ];
    return {
      board: { id: boardId, name: 'My Workflow', createdAt: Date.now(), columnOrder: cols.map((c) => c.id) },
      columns: cols,
      tasks: [],
    };
  }
  