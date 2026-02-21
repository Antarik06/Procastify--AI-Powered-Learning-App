import { Exam, Subject, StudyLog, ExamTrackerState } from './types';

const KEY = 'procastify_exam_tracker';

function load(): ExamTrackerState {
  try {
    const raw = localStorage.getItem(KEY);
    if (raw) return JSON.parse(raw);
  } catch {}
  return { exams: [], subjects: [], logs: [] };
}

function save(state: ExamTrackerState): void {
  try {
    localStorage.setItem(KEY, JSON.stringify(state));
  } catch {}
}

export const ExamTrackerService = {
  getState: (): ExamTrackerState => load(),

  // ── Exams ─────────────────────────────────────────────────
  saveExam(exam: Exam): void {
    const s = load();
    const idx = s.exams.findIndex((e) => e.id === exam.id);
    if (idx >= 0) s.exams[idx] = exam;
    else s.exams.push(exam);
    save(s);
  },

  deleteExam(examId: string): void {
    const s = load();
    s.exams = s.exams.filter((e) => e.id !== examId);
    s.subjects = s.subjects.filter((sub) => sub.examId !== examId);
    s.logs = s.logs.filter((l) => l.examId !== examId);
    save(s);
  },

  // ── Subjects ──────────────────────────────────────────────
  saveSubject(subject: Subject): void {
    const s = load();
    const idx = s.subjects.findIndex((sub) => sub.id === subject.id);
    if (idx >= 0) s.subjects[idx] = subject;
    else s.subjects.push(subject);
    save(s);
  },

  deleteSubject(subjectId: string): void {
    const s = load();
    s.subjects = s.subjects.filter((sub) => sub.id !== subjectId);
    s.logs = s.logs.filter((l) => l.subjectId !== subjectId);
    save(s);
  },

  // ── Logs ──────────────────────────────────────────────────
  saveLog(log: StudyLog): void {
    const s = load();
    const idx = s.logs.findIndex((l) => l.id === log.id);
    if (idx >= 0) s.logs[idx] = log;
    else s.logs.push(log);
    save(s);
  },

  deleteLog(logId: string): void {
    const s = load();
    s.logs = s.logs.filter((l) => l.id !== logId);
    save(s);
  },
};
