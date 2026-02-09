import React, { useState, useEffect } from "react";
import {
  ViewState,
  UserPreferences,
  Summary,
  Note,
  RoutineTask,
  UserStats,
  Flashcard,
  NoteElement,
  Folder,
} from "./types";
import { StorageService } from "./services/storageService";
import { auth } from "./firebaseConfig";
import {
  onAuthStateChanged,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
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
import Folders from "./pages/Folders";
import Auth from "./pages/Auth";
import { AlertCircle, LogIn, X, Loader2 } from "lucide-react";

const App: React.FC = () => {
  const [view, setView] = useState<ViewState | "folders">("landing");
  const [user, setUser] = useState<UserPreferences | null>(null);
  const [loadingAuth, setLoadingAuth] = useState(true);
  const [summaries, setSummaries] = useState<Summary[]>([]);
  const [notes, setNotes] = useState<Note[]>([]);
  const [folders, setFolders] = useState<Folder[]>([]);
  const [stats, setStats] = useState<UserStats | null>(null);
  const [focusTask, setFocusTask] = useState<RoutineTask | undefined>(
    undefined,
  );
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);

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
          profile = {
            id: firebaseUser.uid,
            isGuest: false,
            name: firebaseUser.displayName || deriveName(firebaseUser.email),
            freeTimeHours: 2,
            energyPeak: "morning",
            goal: "Productivity",
            distractionLevel: "medium",
          };
          await StorageService.saveUserProfile(profile);
        }

        StorageService.setSession(profile);
        setUser(profile);
        loadUserData();
        setView("dashboard");
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

  const handleGuestAccess = () => {
    const guestUser = StorageService.createGuestUser();
    StorageService.saveUserProfile(guestUser);
    StorageService.setSession(guestUser);
    setUser(guestUser);
    loadUserData();
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
    } else {
      setActiveFolderId(undefined);
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

  if (!user || view === "landing") {
    return (
      <Landing
        onLogin={() => setView("auth")}
        onGuestAccess={handleGuestAccess}
      />
    );
  }

  if (view === "focus")
    return <Focus initialTask={focusTask} onExit={handleFocusExit} />;

  return (
    <div className="flex min-h-screen bg-[#1e1f22]">
      <Sidebar
        currentView={view === "folders" ? "notes" : view}
        onNavigate={handleNavigate}
        onLogout={handleLogout}
        collapsed={sidebarCollapsed}
        onToggleCollapse={() => setSidebarCollapsed(!sidebarCollapsed)}
      />
      <main
        className={`flex-1 ${sidebarCollapsed ? "ml-20" : "ml-64"} overflow-y-auto max-h-screen relative transition-all duration-300 ease-in-out`}
      >
        {/* User Context Bar (Small) */}
        {user.isGuest && (
          <div className="bg-indigo-900/30 border-b border-indigo-500/20 px-4 py-1 text-xs text-indigo-200 flex justify-between items-center sticky top-0 z-50 backdrop-blur-md">
            <span>Guest Mode: Data saved to this device only.</span>
            <button
              onClick={() => setView("auth")}
              className="hover:text-white underline"
            >
              Sign up to sync
            </button>
          </div>
        )}

        {view === "dashboard" && stats && (
          <Dashboard
            user={user}
            summaries={summaries}
            notes={notes}
            stats={stats}
            onNoteClick={(noteId) => {
              setView("notes");
            }}
          />
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
              StorageService.saveNotes(newNotes);
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
      </main>
    </div>
  );
};

export default App;
