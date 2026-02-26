import React, { useState, useEffect } from "react";
import {
  ViewState,
  UserPreferences,
  Summary,
  Note,
  RoutineTask,
  UserStats,
  Flashcard,
  Folder,
} from "./types";

import { StorageService } from "./services/storageService";
import { auth, isFirebaseConfigured } from "./firebaseConfig";
import {
  onAuthStateChanged,
  signOut,
} from "firebase/auth";

import Sidebar from "./components/Sidebar";
import Landing from "./pages/Landing";
import Dashboard from "./pages/Dashboard";
import Summarizer from "./pages/Summarizer";
import Notes from "./pages/Notes";
import Routine from "./pages/Routine";
import Focus from "./pages/Focus";
import QuizPage from "./pages/Quiz";
import NoteFeed from "./pages/NoteFeed";
import NotesStore from "./pages/NotesStore";
import Classrooms from "./pages/Classrooms";
import Auth from "./pages/Auth";
import RoleSelection from "./pages/RoleSelection";
import TeacherDashboard from "./pages/TeacherDashboard";
import Folders from "./pages/Folders";
import ClassroomDetail from "./pages/ClassroomDetail";
import StudentClassrooms from "./pages/StudentClassrooms";
import StudentClassroomView from "./pages/StudentClassroomView";
import { WorkflowBoard } from "./components/WorkflowBoard";
import { ExamTracker } from "./pages/ExamTracker";
import { Loader2 } from "lucide-react";

const App: React.FC = () => {
  const [view, setView] = useState<ViewState  >("landing");
  const [user, setUser] = useState<UserPreferences | null>(null);
  const [loadingAuth, setLoadingAuth] = useState(true);
  const [summaries, setSummaries] = useState<Summary[]>([]);
  const [notes, setNotes] = useState<Note[]>([]);
  const [folders, setFolders] = useState<Folder[]>([]);
  const [stats, setStats] = useState<UserStats | null>(null);
  const [focusTask, setFocusTask] = useState<RoutineTask | undefined>(undefined);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [selectedClassroomId, setSelectedClassroomId] = useState<string | undefined>(undefined);
  const [activeFolderId, setActiveFolderId] = useState<string | null | undefined>(undefined);

  const deriveName = (email?: string | null) =>
    email ? email.split("@")[0] : "User";

  /* =======================================================
     SAFE AUTH INITIALIZATION
  ======================================================= */
  useEffect(() => {
    // 🔐 If Firebase not configured → fallback to guest / landing
    if (!isFirebaseConfigured() || !auth) {
      console.warn("Firebase not configured — running UI-only mode");

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

      setLoadingAuth(false);
      return;
    }

    // ✅ Firebase configured → attach listener
    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
      if (firebaseUser) {
        let profile = await StorageService.getUserProfile(firebaseUser.uid);

        if (!profile) {
          profile = {
            id: firebaseUser.uid,
            isGuest: false,
            name: firebaseUser.displayName || deriveName(firebaseUser.email),
            email: firebaseUser.email || undefined,
            avatarUrl:
              firebaseUser.photoURL ||
              `https://api.dicebear.com/7.x/notionists/svg?seed=${firebaseUser.displayName || firebaseUser.email}`,
            freeTimeHours: 2,
            energyPeak: "morning",
            goal: "Productivity",
            distractionLevel: "medium",
          };
          await StorageService.saveUserProfile(profile);
        }

        StorageService.setSession(profile);
        setUser(profile);
        await loadUserData();

        if (!profile.role) setView("roleSelection");
        else setView("dashboard");
      } else {
        const guestUser = StorageService.getGuestSession();
        if (guestUser) {
          StorageService.setSession(guestUser);
          setUser(guestUser);
          await loadUserData();
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

  /* =======================================================
     LOAD USER DATA
  ======================================================= */
  const loadUserData = async () => {
    try {
      await StorageService.checkLoginStreak();
      setNotes(await StorageService.getNotes());
      setSummaries(await StorageService.getSummaries());
      setStats(await StorageService.getStats());
      setFolders(await StorageService.getFolders());
    } catch (error) {
      console.error("Error loading user data:", error);
    }
  };

  /* =======================================================
     LOGOUT (SAFE)
  ======================================================= */
  const handleLogout = async () => {
    if (user?.isGuest) {
      localStorage.removeItem("procastify_session");
      setUser(null);
      setView("landing");
    } else if (auth) {
      await signOut(auth);
    }
  };

  const handleStartFocus = (task?: RoutineTask) => {
    setFocusTask(task);
    setView("focus");
  };
  const handleGuestAccess = () => {
  const guestUser = StorageService.createGuestUser();

  StorageService.saveUserProfile(guestUser);
  StorageService.setSession(guestUser);

  setUser(guestUser);
  loadUserData();
  setView("dashboard");
};

  const handleFocusExit = (minutesSpent: number) => {
    if (minutesSpent > 0) {
      StorageService.logStudyTime(minutesSpent);
      StorageService.getStats().then(setStats);
    }
    setView("routine");
  };

  /* =======================================================
     LOADING SCREEN
  ======================================================= */
  if (loadingAuth) {
    return (
      <div className="min-h-screen bg-[#1e1f22] flex items-center justify-center text-white">
        <Loader2 className="animate-spin mr-2" /> Loading Procastify...
      </div>
    );
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
  return <Focus onExit={handleFocusExit} />

  /* =======================================================
     MAIN LAYOUT
  ======================================================= */
  return (
    <div className="flex min-h-screen bg-[#1e1f22]">
      <Sidebar
        currentView={view}
        onNavigate={(v) => setView(v)}
        onLogout={handleLogout}
        collapsed={sidebarCollapsed}
        onToggleCollapse={() => setSidebarCollapsed(!sidebarCollapsed)}
        userRole={user.role}
        user={{ name: user.name, avatarUrl: user.avatarUrl }}
      />

      <main className="flex-1 overflow-y-auto">
        {view === "dashboard" && stats && (
          <Dashboard
            user={user}
            summaries={summaries}
            notes={notes}
            stats={stats}
            onNavigate={(v) => setView(v as any)}
          />
        )}

        {view === "routine" && (
          <Routine
            user={user}
            setUser={setUser}
            notes={notes}
            setNotes={setNotes}
            onStartTask={handleStartFocus}
            onNavigate={(v) => setView(v as any)}
          />
        )}

        {view === "notes" && (
  <Notes
    notes={notes}
    setNotes={setNotes}
    user={user}
    onNavigate={(v) => setView(v as any)}
    activeFolderId={activeFolderId}
    folders={folders}
    onDeleteNote={async (noteId: string) => {
      await StorageService.deleteNote(noteId);
      setNotes((prev) => prev.filter((n) => n.id !== noteId));
    }}
  />
)}

        {view === "examTracker" && (
          <ExamTracker userId={user.id} />
        )}
      </main>
    </div>
  );
};

export default App;