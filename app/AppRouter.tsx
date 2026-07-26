import React, { Suspense } from 'react';
import { LoadingScreen } from '../components/ui';
import { routes } from './routes';
import { useNavigation } from './providers/NavigationProvider';
import { useSession } from './providers/SessionProvider';
import { useWorkspace } from './providers/WorkspaceProvider';
import { useAddSummaryToNote } from '../features/summarizer/hooks/useAddSummaryToNote';
import type { AppView } from '../types';

/**
 * Maps the current view to a screen and supplies it with data from the
 * providers. Adding a screen means: add a lazy import in routes.ts and a case
 * here — nothing else in the shell changes.
 */
export const AppRouter: React.FC = () => {
  const { user, updateProfile } = useSession();
  const { view, activeFolderId, selectedClassroomId, focusTask, navigate } = useNavigation();
  const workspace = useWorkspace();
  const addSummaryToNote = useAddSummaryToNote();

  if (!user) return null;

  const go = (next: string, param?: string | null) => navigate(next as AppView, param);

  const screen = () => {
    switch (view) {
      case 'dashboard':
        return user.role === 'teacher' ? (
          <routes.TeacherDashboard user={user} onNavigate={go} />
        ) : (
          <routes.Dashboard
            user={user}
            summaries={workspace.summaries}
            notes={workspace.notes}
            stats={workspace.stats}
            onNoteClick={() => navigate('notes')}
            onNavigate={go}
          />
        );

      case 'summarizer':
        return (
          <routes.Summarizer
            notes={workspace.notes}
            onSave={(summary: any) =>
              workspace.addSummary({ ...summary, userId: user.id })
            }
            onAddToNote={addSummaryToNote}
          />
        );

      case 'notes':
        return (
          <routes.Notes
            notes={workspace.notes}
            setNotes={workspace.setNotes}
            onDeleteNote={workspace.deleteNote}
            user={user}
            onNavigate={go}
            activeFolderId={activeFolderId}
            folders={workspace.folders}
          />
        );

      case 'folders':
        return (
          <routes.Folders
            folders={workspace.folders}
            setFolders={workspace.setFolders}
            notes={workspace.notes}
            user={user}
            onNavigate={go}
          />
        );

      case 'routine':
        return (
          <routes.Routine
            user={user}
            setUser={(next: any) => updateProfile(next)}
            notes={workspace.notes}
            setNotes={workspace.setNotes}
            onStartTask={(task: any) => navigate('focus', { task })}
            onNavigate={go}
          />
        );

      case 'quiz':
        return (
          <routes.Quiz
            notes={workspace.notes}
            user={user}
            stats={workspace.stats}
            setStats={() => void workspace.refreshStats()}
          />
        );

      case 'feed':
        return (
          <routes.NoteFeed
            notes={workspace.notes}
            user={user}
            onClose={() => navigate('dashboard')}
          />
        );

      case 'store':
        return (
          <routes.NotesStore
            user={user}
            onImportNote={(note: any) => {
              void workspace.saveNote(note);
              navigate('notes');
            }}
            onNavigate={go}
          />
        );

      case 'classrooms':
        return <routes.Classrooms user={user} onNavigate={go} />;

      case 'classroomDetail':
        return selectedClassroomId ? (
          <routes.ClassroomDetail
            user={user}
            classroomId={selectedClassroomId}
            onNavigate={go}
          />
        ) : null;

      case 'studentClassrooms':
        return <routes.StudentClassrooms user={user} onNavigate={go} />;

      case 'studentClassroomView':
        return selectedClassroomId ? (
          <routes.StudentClassroomView
            user={user}
            classroomId={selectedClassroomId}
            onNavigate={go}
          />
        ) : null;

      case 'workflow':
        return <routes.WorkflowBoard userId={user.id} onClose={() => navigate('dashboard')} />;

      case 'examTracker':
        return <routes.ExamTracker userId={user.id} />;

      default:
        return null;
    }
  };

  return <Suspense fallback={<LoadingScreen />}>{screen()}</Suspense>;
};

/** Focus Mode takes over the whole window, so it renders outside the shell. */
export const FocusRoute: React.FC<{ onExit: (minutesSpent: number) => void }> = ({ onExit }) => {
  const { focusTask } = useNavigation();

  return (
    <Suspense fallback={<LoadingScreen />}>
      <routes.Focus initialTask={focusTask} onExit={onExit} />
    </Suspense>
  );
};
