export interface Exam {
  id: string;
  name: string;
  date: string; // ISO date string YYYY-MM-DD
  description?: string;
  createdAt: number;
}

export interface Topic {
  id: string;
  name: string;
  plannedHours: number;
}

export interface Subject {
  id: string;
  examId: string;
  name: string;
  color: string; // hex color for charts
  plannedHours: number;
  topics: Topic[];
  createdAt: number;
}

export interface StudyLog {
  id: string;
  examId: string;
  subjectId: string;
  topicId?: string; // optional, logs can be subject-level
  date: string; // YYYY-MM-DD
  hours: number;
  note?: string;
  createdAt: number;
}

export interface ExamTrackerState {
  exams: Exam[];
  subjects: Subject[];
  logs: StudyLog[];
}
