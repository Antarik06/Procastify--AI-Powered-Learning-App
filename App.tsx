import React, { useState, useEffect } from 'react';
import { ViewState, UserPreferences, Summary, Note, RoutineTask, UserStats, Flashcard, NoteElement, UserRole } from './types';
import { ViewState, UserPreferences, Summary, Note, RoutineTask, UserStats, Flashcard, NoteElement, Folder, UserRole } from './types';
import { StorageService } from './services/storageService';
import { auth, isFirebaseConfigured } from './firebaseConfig';
import { onAuthStateChanged, signInWithEmailAndPassword, createUserWithEmailAndPassword, signOut } from 'firebase/auth';
import { authRateLimiter } from './services/rateLimiter';
import { validateUserInput } from './services/validation';
import { initializeSecureKeys } from './services/secureKeyManager';
import logger from './services/securityLogger';
import { ThemeProvider } from './contexts/ThemeContext';
import Sidebar from './components/Sidebar';
import Landing from './pages/Landing';
import Dashboard from './pages/Dashboard';
import Summarizer from './pages/Summarizer';
import Notes from './pages/Notes';
import Routine from './pages/Routine';
import Focus from './pages/Focus';
import QuizPage from './pages/Quiz';
import NoteFeed from './pages/NoteFeed';
import NotesStore from './pages/NotesStore';
import Classrooms from './pages/Classrooms';
import RoleSelection from './components/RoleSelection';
import { AlertCircle, LogIn, X, Loader2 } from 'lucide-react';

const App: React.FC = () => {
    const [view, setView] = useState<ViewState>('landing');
    const [user, setUser] = useState<UserPreferences | null>(null);
    const [loadingAuth, setLoadingAuth] = useState(true);
    const [summaries, setSummaries] = useState<Summary[]>([]);
    const [notes, setNotes] = useState<Note[]>([]);
    const [stats, setStats] = useState<UserStats | null>(null);
    const [focusTask, setFocusTask] = useState<RoutineTask | undefined>(undefined);
    const [showLoginModal, setShowLoginModal] = useState(false);
    const [isSignUp, setIsSignUp] = useState(false);
    const [emailInput, setEmailInput] = useState('');
    const [passwordInput, setPasswordInput] = useState('');
    const [authError, setAuthError] = useState('');
    const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
    const [showRoleSelection, setShowRoleSelection] = useState(false);

    const deriveName = (email?: string | null) => {
        if (!email) return 'User';
        return email.split('@')[0];
    };

    useEffect(() => {
        // Initialize security keys
        initializeSecureKeys();

        // Don't set up auth listener if Firebase is not configured
        if (!auth || !isFirebaseConfigured()) {
            setLoadingAuth(false);
            return;
        }

        const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
            if (firebaseUser) {

                let profile = await StorageService.getUserProfile(firebaseUser.uid);

                if (!profile) {
                    // New user - create profile without role (will be set via role selection)
                    profile = {
                        id: firebaseUser.uid,
                        isGuest: false,
                        name: deriveName(firebaseUser.email),
                        freeTimeHours: 2,
                        energyPeak: 'morning',
                        goal: 'Productivity',
                        distractionLevel: 'medium'
                        // role is intentionally undefined - will be set via role selection
                    };
                    await StorageService.saveUserProfile(profile);
                }

                // Check if role is missing - show role selection
                if (!profile.role) {
                    StorageService.setSession(profile);
                    setUser(profile);
                    setShowRoleSelection(true);
                    setLoadingAuth(false);
                    return;
                }

                StorageService.setSession(profile);
                setUser(profile);
                loadUserData();
                setView('dashboard');
            } else {

                const guestUser = StorageService.getGuestSession();
                if (guestUser) {
                    // Guest users default to student role
                    if (!guestUser.role) {
                        guestUser.role = 'student';
                        await StorageService.saveUserProfile(guestUser);
                    }
                    StorageService.setSession(guestUser);
                    setUser(guestUser);
                    loadUserData();
                    setView('dashboard');
                } else {
                    setUser(null);
                    setView('landing');
                }
            }
            setLoadingAuth(false);
        });

        return () => unsubscribe();
    }, []);

    const loadUserData = async () => {
        try {
            await StorageService.checkLoginStreak();
            // Zero Migration: Removed migration check
            const n = await StorageService.getNotes();
            const s = await StorageService.getSummaries();
            const st = await StorageService.getStats();
            setNotes(n);
            setSummaries(s);
            setStats(st);
        } catch (error) {
            console.error('Error loading user data:', error);
import Auth from './pages/Auth';
import RoleSelection from './pages/RoleSelection';
import TeacherDashboard from './pages/TeacherDashboard';
import Folders from './pages/Folders';
import Classrooms from './pages/Classrooms';
import ClassroomDetail from './pages/ClassroomDetail';
import StudentClassrooms from './pages/StudentClassrooms';
import StudentClassroomView from './pages/StudentClassroomView';
import { AlertCircle, LogIn, X, Loader2 } from 'lucide-react';

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

    const handleGuestAccess = () => {
        const guestUser = StorageService.createGuestUser();
        // Guest users default to student role
        guestUser.role = 'student';
        StorageService.saveUserProfile(guestUser);
        StorageService.setSession(guestUser);
        setUser(guestUser);
        loadUserData();
        setView('dashboard');
    };

    const handleRoleSelection = async (role: UserRole) => {
        if (!user) return;

        const updatedUser = { ...user, role };
        await StorageService.saveUserProfile(updatedUser);
        StorageService.setSession(updatedUser);
        setUser(updatedUser);
        setShowRoleSelection(false);
        loadUserData();
        setView('dashboard');
    };

    const handleAuthSubmit = async () => {
        if (!emailInput || !passwordInput) return;
        setAuthError('');

        // Validate Input
        const emailValidation = validateUserInput(emailInput, 'email');
        if (!emailValidation.valid) {
            setAuthError(emailValidation.errors[0]);
            logger.logValidationError('email', emailValidation.errors[0]);
            return;
        }

        const passwordValidation = validateUserInput(passwordInput, 'password');
        // Only enforce strict password rules on Signup, allow legacy/weak passwords on Login
        if (isSignUp && !passwordValidation.valid) {
            setAuthError(passwordValidation.errors[0]);
            logger.logValidationError('password', passwordValidation.errors[0]);
            return;
        }

        // Rate limiting on authentication
        const identifier = emailValidation.sanitized;
        if (authRateLimiter.isLimited(identifier)) {
            setAuthError('Too many login attempts. Please try again later.');
            logger.logRateLimitViolation(identifier, isSignUp ? '/signup' : '/signin');
            return;
        }

        // Check if Firebase is configured
        if (!auth) {
            setAuthError('Firebase is not configured. Please check your .env.local file with valid Firebase credentials. See SETUP.md for instructions.');
            logger.logSecurityIncident('Firebase not configured', 'WARNING' as any);
            return;
        }

        try {
            if (isSignUp) {
                await createUserWithEmailAndPassword(auth, emailValidation.sanitized, passwordInput);
                logger.logAuthEvent('User signed up successfully', auth.currentUser?.uid || '', true, { email: identifier });
            } else {
                await signInWithEmailAndPassword(auth, emailValidation.sanitized, passwordInput);
                logger.logAuthEvent('User signed in successfully', auth.currentUser?.uid || '', true, { email: identifier });
            }
            setShowLoginModal(false);
            setEmailInput('');
            setPasswordInput('');
        } catch (e: any) {
            const errorMessage = getAuthErrorMessage(e, isSignUp);
            setAuthError(errorMessage);
            logger.logAuthEvent(
                `Authentication failed: ${e.code || 'Unknown error'}`,
                identifier,
                false,
                { code: e.code, message: e.message }
            );
        }
    };

    const getAuthErrorMessage = (error: any, isSignUp: boolean): string => {
        const errorCode = error.code || '';
        const defaultMessage = isSignUp ? 'signup failed' : 'signin failed';

        const errorMap: Record<string, string> = {
            'auth/api-key-not-valid': 'Firebase API key is invalid. Please check your .env.local file.',
            'auth/invalid-email': 'Invalid email address. Please check and try again.',
            'auth/weak-password': 'Password must be at least 8 characters with uppercase, lowercase, number, and special character.',
            'auth/email-already-in-use': 'This email is already registered. Please sign in instead.',
            'auth/user-not-found': 'No account found with this email. Please sign up first.',
            'auth/wrong-password': 'Incorrect password. Please try again.',
            'auth/too-many-requests': 'Too many failed login attempts. Please try again later.',
            'auth/operation-not-allowed': 'Account creation is not enabled. Please contact support.'
        };

        return errorMap[errorCode] || error.message || defaultMessage;
    };

    const handleLogout = async () => {
        if (user?.isGuest) {
            localStorage.removeItem('procastify_session');
            setUser(null);
            setView('landing');
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

    if (!user || view === 'landing') {
        return (
            <>
                <Landing onLogin={() => setShowLoginModal(true)} onGuestAccess={handleGuestAccess} />

                {/* Login Modal */}
                {showLoginModal && (
                    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
                        <div className="bg-[#1e1f22] p-8 rounded-2xl w-full max-w-md border border-white/10 shadow-2xl animate-in zoom-in-95">
                            <div className="flex justify-between items-center mb-6">
                                <h2 className="text-2xl font-bold text-white">{isSignUp ? 'Create Account' : 'Welcome Back'}</h2>
                                <button onClick={() => setShowLoginModal(false)} className="text-gray-400 hover:text-white"><X /></button>
                            </div>

                            {!isFirebaseConfigured() && (
                                <div className="mb-4 p-4 bg-yellow-500/10 border border-yellow-500/20 text-yellow-400 text-sm rounded-lg">
                                    <p className="font-semibold mb-2">⚠️ Firebase Not Configured</p>
                                    <p className="mb-2">To use authentication and cloud features, please:</p>
                                    <ol className="list-decimal list-inside space-y-1 text-xs">
                                        <li>Create a <code className="bg-black/30 px-1 rounded">.env.local</code> file in the project root</li>
                                        <li>Add your Firebase configuration (see <code className="bg-black/30 px-1 rounded">SETUP.md</code>)</li>
                                        <li>Restart the development server</li>
                                    </ol>
                                </div>
                            )}

                            {authError && <div className="mb-4 p-3 bg-red-500/10 border border-red-500/20 text-red-400 text-sm rounded-lg">{authError}</div>}

                            <input
                                type="email"
                                className="w-full bg-black/20 border border-white/10 rounded-lg px-4 py-3 text-white focus:outline-none focus:border-[#5865F2] mb-4"
                                placeholder="Email"
                                value={emailInput}
                                onChange={(e) => setEmailInput(e.target.value)}
                            />
                            <input
                                type="password"
                                className="w-full bg-black/20 border border-white/10 rounded-lg px-4 py-3 text-white focus:outline-none focus:border-[#5865F2] mb-6"
                                placeholder="Password"
                                value={passwordInput}
                                onChange={(e) => setPasswordInput(e.target.value)}
                            />

                            <button
                                onClick={handleAuthSubmit}
                                disabled={!emailInput || !passwordInput}
                                className="w-full bg-[#5865F2] hover:bg-[#4752c4] text-white font-bold py-3 rounded-xl transition-all disabled:opacity-50 mb-4"
                            >
                                {isSignUp ? 'Sign Up' : 'Sign In'}
                            </button>

                            <p className="text-center text-sm text-gray-400">
                                {isSignUp ? "Already have an account?" : "Don't have an account?"}
                                <button onClick={() => setIsSignUp(!isSignUp)} className="ml-2 text-[#5865F2] hover:underline font-bold">
                                    {isSignUp ? 'Sign In' : 'Sign Up'}
                                </button>
                            </p>
                        </div>
                    </div>
                )}
            </>
        );
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
        <div className="flex min-h-screen bg-[#1e1f22]">
            <Sidebar
                currentView={view}
                onNavigate={setView}
                onLogout={handleLogout}
                collapsed={sidebarCollapsed}
                onToggleCollapse={() => setSidebarCollapsed(!sidebarCollapsed)}
            />
            <main className={`flex-1 ${sidebarCollapsed ? 'ml-20' : 'ml-64'} overflow-y-auto max-h-screen relative transition-all duration-300 ease-in-out`}>
                {/* User Context Bar (Small) */}
                {user.isGuest && (
                    <div className="bg-indigo-900/30 border-b border-indigo-500/20 px-4 py-1 text-xs text-indigo-200 flex justify-between items-center sticky top-0 z-50 backdrop-blur-md">
                        <span>Guest Mode: Data saved to this device only.</span>
                        <button onClick={() => setShowLoginModal(true)} className="hover:text-white underline">Sign up to sync</button>
                    </div>
                )}

                {view === 'dashboard' && stats && <Dashboard user={user} summaries={summaries} notes={notes} stats={stats} onNoteClick={(noteId) => {

                    setView('notes');
                }} />}

                {view === 'summarizer' && (
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

                {view === 'notes' && (
                    <Notes
                        notes={notes}
                        setNotes={(newNotes) => {
                            setNotes(newNotes);
                            StorageService.saveNotes(newNotes);
                        }}
                        onDeleteNote={async (noteId) => {
                            // strictly handle the flow: Service(Firestore/Storage) -> Local State
                            await StorageService.deleteNote(noteId);
                            setNotes(prev => prev.filter(n => n.id !== noteId));
                            console.log("[DELETE] Removed from local React state:", noteId);
                        }}
                        user={user}
                        onNavigate={setView}
                    />
                )}

                {view === 'routine' && (
                    <Routine
                        user={user}
                        setUser={async (u) => {
                            await StorageService.saveUserProfile(u);
                            setUser(u);
                        }}
                        notes={notes}
                        setNotes={(n) => { setNotes(n); StorageService.saveNotes(n); }}
                        onStartTask={handleStartFocus}
                    />
                )}


                {view === 'quiz' && <QuizPage notes={notes} user={user} stats={stats} setStats={setStats} />}

                {view === 'feed' && (
                    <NoteFeed
                        notes={notes}
                        user={user}
                        onClose={() => setView('dashboard')}
                    />
                )}

                {view === 'store' && (
                    <NotesStore
                        user={user}
                        onImportNote={(newNote) => {
                            setNotes([newNote, ...notes]);
                            StorageService.saveNote(newNote); // Ensure persistence immediately
                            setView('notes');
                        }}
                        onNavigate={setView}
                    />
                )}

                {view === 'classrooms' && (
                    <Classrooms
                        user={user}
                        onNavigate={setView}
                    />
                )}
            </main>


            {showLoginModal && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
                    <div className="bg-[#1e1f22] p-8 rounded-2xl w-full max-w-md border border-white/10 shadow-2xl animate-in zoom-in-95">
                        <div className="flex justify-between items-center mb-6">
                            <h2 className="text-2xl font-bold text-white">Sync Account</h2>
                            <button onClick={() => setShowLoginModal(false)} className="text-gray-400 hover:text-white"><X /></button>
                        </div>

                        {!isFirebaseConfigured() && (
                            <div className="mb-4 p-4 bg-yellow-500/10 border border-yellow-500/20 text-yellow-400 text-sm rounded-lg">
                                <p className="font-semibold mb-2">⚠️ Firebase Not Configured</p>
                                <p className="mb-2">To use authentication and cloud features, please:</p>
                                <ol className="list-decimal list-inside space-y-1 text-xs">
                                    <li>Create a <code className="bg-black/30 px-1 rounded">.env.local</code> file in the project root</li>
                                    <li>Add your Firebase configuration (see <code className="bg-black/30 px-1 rounded">SETUP.md</code>)</li>
                                    <li>Restart the development server</li>
                                </ol>
                            </div>
                        )}

                        {authError && <div className="mb-4 p-3 bg-red-500/10 border border-red-500/20 text-red-400 text-sm rounded-lg">{authError}</div>}

                        <p className="text-gray-400 mb-6">Create an account to sync your current guest data to the cloud.</p>
                        <input
                            type="email"
                            className="w-full bg-black/20 border border-white/10 rounded-lg px-4 py-3 text-white focus:outline-none focus:border-[#5865F2] mb-4"
                            placeholder="Email"
                            value={emailInput}
                            onChange={(e) => setEmailInput(e.target.value)}
                        />
                        <input
                            type="password"
                            className="w-full bg-black/20 border border-white/10 rounded-lg px-4 py-3 text-white focus:outline-none focus:border-[#5865F2] mb-6"
                            placeholder="Password"
                            value={passwordInput}
                            onChange={(e) => setPasswordInput(e.target.value)}
                        />
                        <button
                            onClick={handleAuthSubmit}
                            disabled={!emailInput || !passwordInput}
                            className="w-full bg-[#5865F2] hover:bg-[#4752c4] text-white font-bold py-3 rounded-xl transition-all disabled:opacity-50"
                        >
                            {isSignUp ? 'Sign Up & Sync' : 'Sign In & Sync'}
                        </button>
                        <p className="text-center text-sm text-gray-400 mt-4">
                            {isSignUp ? "Already have an account?" : "Don't have an account?"}
                            <button onClick={() => setIsSignUp(!isSignUp)} className="ml-2 text-[#5865F2] hover:underline font-bold">
                                {isSignUp ? 'Sign In' : 'Sign Up'}
                            </button>
                        </p>
                    </div>
                </div>
            )}

            {showRoleSelection && user && (
                <RoleSelection
                    onSelect={handleRoleSelection}
                    userName={user.name}
                />
            )}

        </div>
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
        userRole={user.role}
        user={user ? { name: user.name, avatarUrl: user.avatarUrl } : undefined}
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
      </main>
    </div>
  );
};

export default App;
