import React, { createContext, useCallback, useContext, useMemo, useState } from 'react';
import type { AppView, RoutineTask } from '../../types';

export interface NavigateOptions {
  /** Notes view: null = uncategorised, undefined = all notes. */
  folderId?: string | null;
  classroomId?: string;
  /** Focus view: the task to run. */
  task?: RoutineTask;
}

interface NavigationContextValue {
  view: AppView;
  activeFolderId: string | null | undefined;
  selectedClassroomId?: string;
  focusTask?: RoutineTask;
  navigate: (view: AppView, options?: NavigateOptions | string | null) => void;
}

const NavigationContext = createContext<NavigationContextValue | null>(null);

/**
 * Single source of truth for "what is on screen" plus the parameters a view
 * needs. Kept deliberately small — this app has no URL router.
 */
export const NavigationProvider: React.FC<{
  initialView?: AppView;
  onViewChange?: (view: AppView) => void;
  children: React.ReactNode;
}> = ({ initialView = 'dashboard', onViewChange, children }) => {
  const [view, setView] = useState<AppView>(initialView);
  const [activeFolderId, setActiveFolderId] = useState<string | null | undefined>(undefined);
  const [selectedClassroomId, setSelectedClassroomId] = useState<string | undefined>(undefined);
  const [focusTask, setFocusTask] = useState<RoutineTask | undefined>(undefined);

  const navigate = useCallback(
    (nextView: AppView, options?: NavigateOptions | string | null) => {
      // Legacy call sites pass a bare folder/classroom id as the second argument.
      const params: NavigateOptions =
        typeof options === 'string'
          ? { folderId: options, classroomId: options }
          : options === null
            ? { folderId: null }
            : (options ?? {});

      if (nextView === 'notes') {
        setActiveFolderId(params.folderId);
      } else {
        setActiveFolderId(undefined);
      }

      if (nextView === 'classroomDetail' || nextView === 'studentClassroomView') {
        setSelectedClassroomId(params.classroomId ?? undefined);
      }

      if (nextView === 'focus') {
        setFocusTask(params.task);
      }

      setView(nextView);
      onViewChange?.(nextView);
    },
    [onViewChange],
  );

  const value = useMemo<NavigationContextValue>(
    () => ({ view, activeFolderId, selectedClassroomId, focusTask, navigate }),
    [view, activeFolderId, selectedClassroomId, focusTask, navigate],
  );

  return <NavigationContext.Provider value={value}>{children}</NavigationContext.Provider>;
};

export function useNavigation(): NavigationContextValue {
  const context = useContext(NavigationContext);
  if (!context) throw new Error('useNavigation must be used inside <NavigationProvider>');
  return context;
}
