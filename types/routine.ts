export interface RoutineTask {
  id: string;
  userId: string;
  title: string;
  durationMinutes: number;
  type: 'focus' | 'break' | 'buffer' | 'procastify';
  completed: boolean;
  timeSlot?: string;
  noteId?: string;
  confidence?: 'high' | 'medium' | 'low';
}
