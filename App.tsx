import React, { useState, useEffect, Suspense, lazy } from 'react';
import { ViewState, UserPreferences, Summary, Note, RoutineTask, UserStats, Flashcard, NoteElement, Folder, UserRole, UserAchievement, Achievement } from './types';
import { StorageService } from './services/storageService';
import { ActivityTracker } from './services/activityTracker';
import { auth, isFirebaseConfigured } from './firebaseConfig';
import { onAuthStateChanged, signInWithEmailAndPassword, createUserWithEmailAndPassword, signOut } from 'firebase/auth';
import { authRateLimiter } from './services/rateLimiter';
import { validateUserInput } from './services/validation';
import { initializeSecureKeys } from './services/secureKeyManager';
import logger from './services/securityLogger';

import { AlertCircle, LogIn, X, Loader2 } from 'lucide-react';

// Eager: shell and the pre-login screens, which are always on the critical path.
import Sidebar from './components/Sidebar';
import Landing from './pages/Landing';
import Auth from './pages/Auth';
import RoleSelection from './pages/RoleSelection';

// Lazy: only one of these renders at a time, and several pull in heavy
// dependencies (charts, pdf.js, tiptap, canvas). Loading them on demand keeps
// them out of the initial bundle.
const Dashboard = lazy(() => import('./pages/Dashboard'));
const TeacherDashboard = lazy(() => import('./pages/TeacherDashboard'));
const Summarizer = lazy(() => import('./pages/Summarizer'));
const Notes = lazy(() => import('./pages/Notes'));
const Folders = lazy(() => import('./pages/Folders'));
const Routine = lazy(() => import('./pages/Routine'));
const Focus = lazy(() => import('./pages/Focus'));
const QuizPage = lazy(() => import('./pages/Quiz'));
const NoteFeed = lazy(() => import('./pages/NoteFeed'));
const NotesStore = lazy(() => import('./pages/NotesStore'));
const Classrooms = lazy(() => import('./pages/Classrooms'));
const ClassroomDetail = lazy(() => import('./pages/ClassroomDetail'));
const StudentClassrooms = lazy(() => import('./pages/StudentClassrooms'));
const StudentClassroomView = lazy(() => import('./pages/StudentClassroomView'));
const WorkflowBoard = lazy(() =>
  import('./components/WorkflowBoard').then((m) => ({ default: m.WorkflowBoard })),
);
const ExamTracker = lazy(() =>
  import('./pages/ExamTracker').then((m) => ({ default: m.ExamTracker })),
);

const PageLoader: React.FC = () => (
  <div className="flex items-center justify-center h-screen w-full">
    <Loader2 className="animate-spin text-discord-accent" size={32} />
  </div>
);


const App: React.FC = () => {
  const [view, setView] = useState<ViewState | "folders">("landing");
  const [user, setUser] = useState<UserPreferences | null>(null);
  const [loadingAuth, setLoadingAuth] = useState(true);
  const [summaries, setSummaries] = useState<Summary[]>([]);
  const [notes, setNotes] = useState<Note[]>([]);
  const [folders, setFolders] = useState<Folder[]>([]);
  const [stats, setStats] = useState<UserStats | null>(null);
  const [achievements, setAchievements] = useState<UserAchievement[]>([]);
  const [newAchievements, setNewAchievements] = useState<Achievement[]>([]);
  const [focusTask, setFocusTask] = useState<RoutineTask | undefined>(
    undefined,
  );
  const [selectedClassroomId, setSelectedClassroomId] = useState<string | undefined>(undefined);

  // Folder filtering state
  const [activeFolderId, setActiveFolderId] = useState<
    string | null | undefined
  >(undefined);

  const deriveName = (email?: string | null) => {
    if (!email) return "User";
    return email.split("@")[0];
  };

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
      if (firebaseUser) {
        let profile = await StorageService.getUserProfile(firebaseUser.uid);

        if (!profile) {
          // Generate avatar URL from Firebase photoURL or create one
          const avatarUrl = firebaseUser.photoURL ||
            `https://api.dicebear.com/7.x/notionists/svg?seed=${firebaseUser.displayName || firebaseUser.email}`;

          profile = {
            id: firebaseUser.uid,
            isGuest: false,
            name: firebaseUser.displayName || deriveName(firebaseUser.email),
            email: firebaseUser.email || undefined,
            avatarUrl: avatarUrl,
            freeTimeHours: 2,
            energyPeak: "morning",
            goal: "Productivity",
            distractionLevel: "medium",
          };
          await StorageService.saveUserProfile(profile);
        } else {
          // Always update email and avatar if missing or different (ensures existing profiles get them)
          let needsUpdate = false;
          if (!profile.email && firebaseUser.email) {
            profile.email = firebaseUser.email;
            needsUpdate = true;
          }
          if (!profile.avatarUrl) {
            profile.avatarUrl = firebaseUser.photoURL ||
              `https://api.dicebear.com/7.x/notionists/svg?seed=${profile.name}`;
            needsUpdate = true;
          }
          if (needsUpdate) {
            await StorageService.saveUserProfile(profile);
          }
        }

        StorageService.setSession(profile);
        setUser(profile);
        loadUserData();

        // Check if user has selected a role
        if (!profile.role) {
          setView("roleSelection");
        } else {
          setView("dashboard");
        }
      } else {
        const guestUser = StorageService.getGuestSession();
        if (guestUser) {
          StorageService.setSession(guestUser);
          setUser(guestUser);
          loadUserData();
          setView("dashboard");
        } else {
          setUser(null);
          setView("landing");
        }
      }
      setLoadingAuth(false);
    });

    return () => unsubscribe();
  }, []);

  const loadUserData = async () => {
    try {
      await StorageService.checkLoginStreak();
      const n = await StorageService.getNotes();
      const s = await StorageService.getSummaries();
      const st = await StorageService.getStats();
      const f = await StorageService.getFolders();
      setNotes(n);
      setSummaries(s);
      setStats(st);
      setFolders(f);
    } catch (error) {
      console.error("Error loading user data:", error);
    }
  };

  // Track time spent in the app so the dashboard analytics chart has real data.
  useEffect(() => {
    if (!user) return;

    ActivityTracker.start(() => {
      StorageService.getStats().then(setStats).catch(console.error);
    });

    return () => ActivityTracker.stop();
  }, [user?.id]);

  // Focus Mode logs its own session time on exit; don't double count.
  useEffect(() => {
    if (view === "focus") {
      ActivityTracker.pause();
    } else {
      ActivityTracker.resume();
    }
  }, [view]);

  const handleGuestAccess = () => {
    const guestUser = StorageService.createGuestUser();
    StorageService.saveUserProfile(guestUser);
    StorageService.setSession(guestUser);
    setUser(guestUser);
    loadUserData();
    setView("dashboard");
  };

  const handleRoleSelected = async (role: "student" | "teacher") => {
    if (!user) return;

    const updatedUser = { ...user, role };
    await StorageService.saveUserProfile(updatedUser);
    StorageService.setSession(updatedUser);
    setUser(updatedUser);
    setView("dashboard");
  };

  const handleLogout = async () => {
    if (user?.isGuest) {
      localStorage.removeItem("procastify_session");
      setUser(null);
      setView("landing");
    } else {
      await signOut(auth);
    }
  };

  const handleStartFocus = (task?: RoutineTask) => {
    setFocusTask(task);
    setView("focus");
  };

  const handleFocusExit = (minutesSpent: number) => {
    if (minutesSpent > 0) {
      StorageService.logStudyTime(minutesSpent);
      StorageService.getStats().then(setStats);
    }
    setView("routine");
  };

  const handleNavigate = (
    newView: ViewState | "folders",
    folderId?: string | null,
  ) => {
    if (newView === "notes") {
      setActiveFolderId(folderId);
    } else if (newView === "folders") {
      // Folders view - accessible through Notes page button only
      setActiveFolderId(undefined);
    } else if (newView === "classroomDetail" || newView === "studentClassroomView") {
      // Store classroom ID for detail views
      setSelectedClassroomId(folderId || undefined);
    } else {
      setActiveFolderId(undefined);
    }

    // Make sure the dashboard shows time earned in the session just finished.
    if (newView === "dashboard") {
      ActivityTracker.flushNow()
        .then(() => StorageService.getStats())
        .then(setStats)
        .catch(console.error);
    }

    setView(newView);
  };

  const handleAddToNote = async (
    noteId: string | null,
    summary: Summary,
    flashcards: Flashcard[],
  ) => {
    if (!user) return;

    const timestamp = Date.now();

    // --- Generate Blocks for Document Section ---
    const newBlocks: any[] = [];

    // 1. Summary Header
    newBlocks.push({
      id: `${timestamp}-h1`,
      type: "h1",
      content: `Summary: ${new Date().toLocaleDateString()}`,
    });

    // 2. Summary Text
    const formattedSummary = summary.summaryText.replace(/\n/g, "<br />");
    newBlocks.push({
      id: `${timestamp}-text`,
      type: "text",
      content: formattedSummary,
    });

    // 3. Flashcards Section
    if (flashcards.length > 0) {
      newBlocks.push({
        id: `${timestamp}-fc-h2`,
        type: "h2",
        content: "Flashcards (Key Learning Concepts)",
      });

      flashcards.forEach((fc, i) => {
        newBlocks.push({
          id: `${timestamp}-fc-${i}-q`,
          type: "h3",
          content: fc.front,
        });
        newBlocks.push({
          id: `${timestamp}-fc-${i}-a`,
          type: "text",
          content: fc.back,
        });
        newBlocks.push({
          id: `${timestamp}-fc-${i}-d`,
          type: "text",
          content: "",
        });
      });
    }

    let updatedNotes = [...notes];
    let noteWasCreated = false;
    let noteToSave: Note | null = null;

    if (noteId === null) {
      // --- Create New Note ---
      const newNote: Note = {
        id: timestamp.toString(),
        userId: user.id,
        title: `Summary: ${new Date().toLocaleDateString()}`,
        document: { blocks: newBlocks },
        canvas: { elements: [] },
        elements: [],
        tags: [],
        folder: "Summaries",
        folderId: null,
        lastModified: timestamp,
        createdAt: timestamp,
      };
      updatedNotes = [newNote, ...updatedNotes];
      noteToSave = newNote;
      noteWasCreated = true;
    } else {
      // --- Update Existing Note ---
      updatedNotes = updatedNotes.map((n) => {
        if (n.id === noteId) {
          const existingBlocks = n.document?.blocks || [];

          const separatorBlock = {
            id: `${timestamp}-sep`,
            type: "text",
            content: "<br/>---<br/>",
          };

          const updatedBlocks = [
            ...existingBlocks,
            separatorBlock,
            ...newBlocks,
          ];

          const updated = {
            ...n,
            document: { blocks: updatedBlocks },
            lastModified: timestamp,
          };
          noteToSave = updated;
          return updated;
        }
        return n;
      });
    }

    setNotes(updatedNotes);

    if (noteToSave) {
      await StorageService.saveNote(noteToSave);
    }

    if (noteWasCreated) {
      await StorageService.updateStats((s) => ({
        ...s,
        notesCreated: (s.notesCreated || 0) + 1,
      }));
      const updatedStats = await StorageService.getStats();
      setStats(updatedStats);
    }
  };

  if (loadingAuth) {
    return (
      <div className="min-h-screen bg-[#1e1f22] flex items-center justify-center text-white">
        <Loader2 className="animate-spin mr-2" /> Loading Procastify...
      </div>
    );
  }

  if (view === "auth") {
    return (
      <Auth
        onLoginSuccess={() => setView("dashboard")}
        onGuestAccess={handleGuestAccess}
        onBack={user ? () => setView("dashboard") : () => setView("landing")}
      />
    );
  }

  if (view === "roleSelection") {
    return <RoleSelection onRoleSelected={handleRoleSelected} />;
  }

  if (!user || view === "landing") {
    return (
      <Landing
        onLogin={() => setView("auth")}
        onGuestAccess={handleGuestAccess}
      />
    );
  }

  if (view === "focus")
    return (
      <Suspense fallback={<PageLoader />}>
        <Focus initialTask={focusTask} onExit={handleFocusExit} />
      </Suspense>
    );

  return (
    <div className="flex min-h-screen bg-[#1e1f22]">
      <Sidebar
        currentView={view === "folders" ? "notes" : view}
        onNavigate={handleNavigate}
        onLogout={handleLogout}
        userRole={user.role}
        user={user ? { name: user.name, avatarUrl: user.avatarUrl } : undefined}
      />
      <main
        className="flex-1 lg:ml-[92px] h-screen max-h-screen flex flex-col overflow-hidden relative transition-all duration-300 ease-in-out"
      >
        {/* User Context Bar (Small) */}
        {user.isGuest && (
          <div className="bg-indigo-900/30 border-b border-indigo-500/20 px-4 py-1 text-xs text-indigo-200 flex justify-between items-center shrink-0 z-50 backdrop-blur-md">
            <span>Guest Mode: Data saved to this device only.</span>
            <button
              onClick={() => setView("auth")}
              className="hover:text-white underline"
            >
              Sign up to sync
            </button>
          </div>
        )}

        {/* Page viewport: pages that manage their own layout use h-full, the rest scroll here. */}
        <div className="flex-1 min-h-0 overflow-y-auto">
        <Suspense fallback={<PageLoader />}>
        {view === "dashboard" && stats && (
          <>
            {user.role === "teacher" ? (
              <TeacherDashboard
                user={user}
                onNavigate={handleNavigate}
              />
            ) : (
              <Dashboard
                user={user}
                summaries={summaries}
                notes={notes}
                stats={stats}
                onNoteClick={(noteId) => {
                  setView("notes");
                }}
                onNavigate={(view) => handleNavigate(view as any)}
              />
            )}
          </>
        )}

        {view === "summarizer" && (
          <Summarizer
            onSave={async (s) => {
              const sWithUser = { ...s, userId: user.id };
              const newSums = [sWithUser, ...summaries];
              setSummaries(newSums);
              await StorageService.saveSummaries(newSums);
            }}
            notes={notes}
            onAddToNote={handleAddToNote}
          />
        )}

        {view === "notes" && (
          <Notes
            notes={notes}
            setNotes={(newNotes) => {
              setNotes(newNotes);
              const notesArray = typeof newNotes === 'function' ? newNotes(notes) : newNotes;
              StorageService.saveNotes(notesArray);
            }}
            onDeleteNote={async (noteId) => {
              await StorageService.deleteNote(noteId);
              setNotes((prev) => prev.filter((n) => n.id !== noteId));
              console.log("[DELETE] Removed from local React state:", noteId);
            }}
            user={user}
            onNavigate={handleNavigate}
            activeFolderId={activeFolderId}
            folders={folders}
          />
        )}

        {view === "folders" && (
          <Folders
            folders={folders}
            setFolders={setFolders}
            notes={notes}
            user={user}
            onNavigate={handleNavigate}
          />
        )}

        {view === "routine" && (
          <Routine
            user={user}
            setUser={async (u) => {
              await StorageService.saveUserProfile(u);
              setUser(u);
            }}
            notes={notes}
            setNotes={(n) => {
              setNotes(n);
              StorageService.saveNotes(n);
            }}
            onStartTask={handleStartFocus}
            onNavigate={(view) => handleNavigate(view as any)}
          />
        )}

        {view === "quiz" && (
          <QuizPage
            notes={notes}
            user={user}
            stats={stats}
            setStats={setStats}
          />
        )}

        {view === "feed" && (
          <NoteFeed
            notes={notes}
            user={user}
            onClose={() => setView("dashboard")}
          />
        )}

        {view === "store" && (
          <NotesStore
            user={user}
            onImportNote={(newNote) => {
              setNotes([newNote, ...notes]);
              StorageService.saveNote(newNote);
              setView("notes");
            }}
            onNavigate={handleNavigate}
          />
        )}

        {view === "classrooms" && (
          <Classrooms
            user={user}
            onNavigate={handleNavigate}
          />
        )}

        {view === "classroomDetail" && selectedClassroomId && (
          <ClassroomDetail
            user={user}
            classroomId={selectedClassroomId}
            onNavigate={handleNavigate}
          />
        )}

        {view === "studentClassrooms" && (
          <StudentClassrooms
            user={user}
            onNavigate={handleNavigate}
          />
        )}

        {view === "studentClassroomView" && selectedClassroomId && (
          <StudentClassroomView
            user={user}
            classroomId={selectedClassroomId}
            onNavigate={handleNavigate}
          />
        )}

        {view === "workflow" && (
          <WorkflowBoard
            userId={user.id}
            onClose={() => setView("dashboard")}
          />
        )}

        {view === "examTracker" && (
          <ExamTracker userId={user.id} />
        )}
        </Suspense>
        </div>

      </main>
    </div>
  );
};

export default App;
