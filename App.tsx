import React, { useState, useEffect } from 'react';
import { ViewState, UserPreferences, Summary, Note, RoutineTask, UserStats, Flashcard, NoteElement } from './types';
import { StorageService } from './services/storageService';
import { auth } from './firebaseConfig';
import { onAuthStateChanged, signInWithEmailAndPassword, createUserWithEmailAndPassword, signOut } from 'firebase/auth';
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

    const deriveName = (email?: string | null) => {
        if (!email) return 'User';
        return email.split('@')[0];
    };

    useEffect(() => {
        const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
            if (firebaseUser) {

                let profile = await StorageService.getUserProfile(firebaseUser.uid);

                if (!profile) {

                    profile = {
                        id: firebaseUser.uid,
                        isGuest: false,
                        name: deriveName(firebaseUser.email),
                        freeTimeHours: 2,
                        energyPeak: 'morning',
                        goal: 'Productivity',
                        distractionLevel: 'medium'
                    };
                    await StorageService.saveUserProfile(profile);
                }

                StorageService.setSession(profile);
                setUser(profile);
                loadUserData();
                setView('dashboard');
            } else {

                const guestUser = StorageService.getGuestSession();
                if (guestUser) {
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
        }
    };



    const handleGuestAccess = () => {

        const guestUser = StorageService.createGuestUser();
        StorageService.saveUserProfile(guestUser);
        StorageService.setSession(guestUser);
        setUser(guestUser);
        loadUserData();
        setView('dashboard');
    };

    const handleAuthSubmit = async () => {
        if (!emailInput || !passwordInput) return;
        setAuthError('');
        try {
            if (isSignUp) {
                await createUserWithEmailAndPassword(auth, emailInput, passwordInput);
            } else {
                await signInWithEmailAndPassword(auth, emailInput, passwordInput);
            }
            setShowLoginModal(false);
            setEmailInput('');
            setPasswordInput('');
        } catch (e: any) {
            console.error(e);
            setAuthError(e.message || 'Authentication failed');
        }
    };

    const handleLogout = async () => {
        if (user?.isGuest) {
            localStorage.removeItem('procastify_session');
            setUser(null);
            setView('landing');
        } else {
            await signOut(auth);

        }
    };



    const handleStartFocus = (task?: RoutineTask) => {
        setFocusTask(task);
        setView('focus');
    };

    const handleFocusExit = (minutesSpent: number) => {
        if (minutesSpent > 0) {
            StorageService.logStudyTime(minutesSpent);
            StorageService.getStats().then(setStats);
        }
        setView('routine');
    };

    const handleAddToNote = async (noteId: string | null, summary: Summary, flashcards: Flashcard[]) => {
        if (!user) return;

        const timestamp = Date.now();

        // --- Generate Blocks for Document Section ---
        const newBlocks: any[] = []; // Use any to match Block[] structure without importing strict type locally if not needed, but we essentially conform to Block interface

        // 1. Summary Header
        newBlocks.push({
            id: `${timestamp}-h1`,
            type: 'h1',
            content: `Summary: ${new Date().toLocaleDateString()}`
        });

        // 2. Summary Text
        // Convert newlines to breaks for HTML rendering in Block editor
        const formattedSummary = summary.summaryText.replace(/\n/g, '<br />');
        newBlocks.push({
            id: `${timestamp}-text`,
            type: 'text',
            content: formattedSummary
        });

        // 3. Flashcards Section
        if (flashcards.length > 0) {
            newBlocks.push({
                id: `${timestamp}-fc-h2`,
                type: 'h2',
                content: "Flashcards (Key Learning Concepts)"
            });

            flashcards.forEach((fc, i) => {
                newBlocks.push({
                    id: `${timestamp}-fc-${i}-q`,
                    type: 'h3',
                    content: fc.front
                });
                newBlocks.push({
                    id: `${timestamp}-fc-${i}-a`,
                    type: 'text',
                    content: fc.back
                });
                // Add a small spacer/separator if needed, or just let them flow
                newBlocks.push({
                    id: `${timestamp}-fc-${i}-d`,
                    type: 'text',
                    content: ''
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
                canvas: { elements: [] }, // Empty canvas as requested (focus on Document)
                elements: [], // Legacy
                tags: [],
                folder: 'Summaries',
                lastModified: timestamp,
                createdAt: timestamp
            };
            updatedNotes = [newNote, ...updatedNotes];
            noteToSave = newNote;
            noteWasCreated = true;
        } else {
            // --- Update Existing Note ---
            updatedNotes = updatedNotes.map(n => {
                if (n.id === noteId) {
                    const existingBlocks = n.document?.blocks || [];

                    // Add visual separator block before appending new content
                    const separatorBlock = {
                        id: `${timestamp}-sep`,
                        type: 'text',
                        content: '<br/>---<br/>'
                    };

                    const updatedBlocks = [
                        ...existingBlocks,
                        separatorBlock,
                        ...newBlocks
                    ];

                    const updated = {
                        ...n,
                        document: { blocks: updatedBlocks },
                        lastModified: timestamp
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
            await StorageService.updateStats(s => ({
                ...s,
                notesCreated: (s.notesCreated || 0) + 1
            }));
            const updatedStats = await StorageService.getStats();
            setStats(updatedStats);
        }
    };


    if (loadingAuth) {
        return <div className="min-h-screen bg-[#1e1f22] flex items-center justify-center text-white"><Loader2 className="animate-spin mr-2" /> Loading Procastify...</div>;
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
    }


    if (view === 'focus') return <Focus initialTask={focusTask} onExit={handleFocusExit} />;


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
            </main>


            {showLoginModal && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
                    <div className="bg-[#1e1f22] p-8 rounded-2xl w-full max-w-md border border-white/10 shadow-2xl animate-in zoom-in-95">
                        <div className="flex justify-between items-center mb-6">
                            <h2 className="text-2xl font-bold text-white">Sync Account</h2>
                            <button onClick={() => setShowLoginModal(false)} className="text-gray-400 hover:text-white"><X /></button>
                        </div>

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

        </div>
    );
};

export default App;