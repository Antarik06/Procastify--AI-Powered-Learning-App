import {
  LayoutDashboard,
  FileText,
  BookOpen,
  Clock,
  BrainCircuit,
  Gamepad2,
  Flame,
  GraduationCap,
  type LucideIcon,
} from 'lucide-react';
import type { AppView, UserRole } from '../../types';

export interface NavItem {
  view: AppView;
  label: string;
  icon: LucideIcon;
  /** Views that should also light this item up (e.g. folders -> notes). */
  matches?: AppView[];
}

const STUDENT_NAV: NavItem[] = [
  { view: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { view: 'summarizer', label: 'Summarizer', icon: FileText },
  { view: 'notes', label: 'My Notes', icon: BookOpen, matches: ['folders'] },
  { view: 'classrooms', label: 'My Classrooms', icon: GraduationCap },
  { view: 'feed', label: 'Learning Feed', icon: Flame },
  { view: 'quiz', label: 'Quiz Arena', icon: Gamepad2 },
  { view: 'routine', label: 'Routine', icon: Clock },
  { view: 'focus', label: 'Focus Mode', icon: BrainCircuit },
];

const TEACHER_NAV: NavItem[] = [
  { view: 'classrooms', label: 'My Classrooms', icon: GraduationCap },
  { view: 'notes', label: 'My Notes', icon: BookOpen, matches: ['folders'] },
];

export function getNavItems(role: UserRole = 'student'): NavItem[] {
  return role === 'teacher' ? TEACHER_NAV : STUDENT_NAV;
}

/** The landing view for a role once they sign in. */
export function getHomeView(role: UserRole = 'student'): AppView {
  return role === 'teacher' ? 'classrooms' : 'dashboard';
}

export function isNavItemActive(item: NavItem, view: AppView): boolean {
  return item.view === view || (item.matches?.includes(view) ?? false);
}
