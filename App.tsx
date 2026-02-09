import React, { useState, useEffect } from 'react';
import { ViewState, UserPreferences, Summary, Note, RoutineTask, UserStats, Flashcard, NoteElement } from './types';
import { StorageService } from './services/storageService';
import { auth } from './firebaseConfig';
import { onAuthStateChanged, signInWithEmailAndPassword, createUserWithEmailAndPassword, signOut } from 'firebase/auth';
import Sidebar, { NAV_ITEMS } from './components/Sidebar';
import Landing from './pages/Landing';
import Dashboard from './pages/Dashboard';
import Summarizer from './pages/Summarizer';
import Notes from './pages/Notes';
import Routine from './pages/Routine';
import Focus from './pages/Focus';
import QuizPage from './pages/Quiz';
import NoteFeed from './pages/NoteFeed';
import NotesStore from './pages/NotesStore';
import Auth from './pages/Auth';
import { AlertCircle, LogIn, X, Loader2, Menu, BrainCircuit, MoreHorizontal } from 'lucide-react';

const App: React.FC = () => {
    const [view, setView] = useState<ViewState>('landing');
    const [user, setUser] = useState<UserPreferences | null>(null);
    const [loadingAuth, setLoadingAuth] = useState(true);
    const [summaries, setSummaries] = useState<Summary[]>([]);
    const [notes, setNotes] = useState<Note[]>([]);
    const [stats, setStats] = useState<UserStats | null>(null);
    const [focusTask, setFocusTask] = useState<RoutineTask | undefined>(undefined);
    const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
    const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

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
                        name: firebaseUser.displayName || deriveName(firebaseUser.email),
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

    if (view === 'auth') {
        return (
            <Auth
                onLoginSuccess={() => setView('dashboard')}
                onGuestAccess={handleGuestAccess}
                onBack={user ? () => setView('dashboard') : () => setView('landing')}
            />
        );
    }

    if (!user || view === 'landing') {
        return (
            <Landing onLogin={() => setView('auth')} onGuestAccess={handleGuestAccess} />
        );
    }


    if (view === 'focus') return <Focus initialTask={focusTask} onExit={handleFocusExit} />;


    // Primary bottom-bar items (4 visible + More)
    const bottomBarItems = NAV_ITEMS.filter(i => i.primary);
    const isSecondaryView = !NAV_ITEMS.find(i => i.primary && i.view === view);

    return (
        <div className="flex min-h-screen bg-[#1e1f22]">
            <Sidebar
                currentView={view}
                onNavigate={setView}
                onLogout={handleLogout}
                collapsed={sidebarCollapsed}
                onToggleCollapse={() => setSidebarCollapsed(!sidebarCollapsed)}
                mobileOpen={mobileMenuOpen}
                onMobileToggle={() => setMobileMenuOpen(!mobileMenuOpen)}
                userName={user.name}
            />

            {/* ===== MOBILE TOP HEADER BAR ===== */}
            <div className="md:hidden fixed top-0 left-0 right-0 z-[52] h-14 bg-[#111214]/95 backdrop-blur-md border-b border-white/5 flex items-center justify-between px-4 mobile-safe-top">
              <button
                onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
                className="w-10 h-10 rounded-xl bg-white/5 flex items-center justify-center text-discord-textMuted hover:text-white hover:bg-white/10 transition-colors active:scale-95"
                aria-label="Open menu"
              >
                <Menu size={20} />
              </button>
              <div className="flex items-center gap-2">
                <div className="w-7 h-7 bg-gradient-to-br from-discord-accent to-purple-600 rounded-lg flex items-center justify-center shadow-md shadow-discord-accent/20">
                  <BrainCircuit className="text-white" size={14} />
                </div>
                <span className="text-sm font-bold text-white tracking-tight">Procastify</span>
              </div>
              <div className="w-10"></div>
            </div>

            <main className={`flex-1 ml-0 ${sidebarCollapsed ? 'md:ml-20' : 'md:ml-64'} overflow-y-auto max-h-screen relative transition-all duration-300 ease-in-out`}>
                {/* Mobile top spacer to clear the header bar */}
                <div className="md:hidden h-14"></div>

                {/* User Context Bar (Small) */}
                {user.isGuest && (
                    <div className="bg-indigo-900/30 border-b border-indigo-500/20 px-4 py-1 text-xs text-indigo-200 flex justify-between items-center sticky top-0 z-50 backdrop-blur-md">
                        <span>Guest Mode: Data saved to this device only.</span>
                        <button onClick={() => setView('auth')} className="hover:text-white underline">Sign up to sync</button>
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
                {/* Mobile bottom spacer to prevent content hiding behind bottom bar */}
                <div className="md:hidden h-20"></div>
            </main>

            {/* ===== MOBILE BOTTOM TAB BAR ===== */}
            <div className="md:hidden fixed bottom-0 left-0 right-0 z-[52] mobile-safe-bottom">
              <div className="bg-[#111214]/95 backdrop-blur-md border-t border-white/10 flex items-stretch justify-around px-1 h-16">
                {bottomBarItems.map((item) => {
                  const Icon = item.icon;
                  const active = view === item.view;
                  return (
                    <button
                      key={item.view}
                      onClick={() => setView(item.view)}
                      className={`flex-1 flex flex-col items-center justify-center gap-0.5 py-1 transition-all duration-200 relative touch-manipulation active:scale-95 ${
                        active ? 'text-discord-accent' : 'text-discord-textMuted'
                      }`}
                    >
                      {active && (
                        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-8 h-0.5 bg-discord-accent rounded-b-full"></div>
                      )}
                      <div className={`w-8 h-8 rounded-xl flex items-center justify-center transition-all duration-200 ${
                        active ? 'bg-discord-accent/15 shadow-sm shadow-discord-accent/10' : ''
                      }`}>
                        <Icon size={active ? 20 : 18} className="transition-all duration-200" />
                      </div>
                      <span className={`text-[10px] leading-none font-medium transition-all duration-200 ${active ? 'text-discord-accent' : ''}`}>
                        {item.label.split(' ')[0]}
                      </span>
                    </button>
                  );
                })}
                {/* "More" button opens drawer for secondary items */}
                <button
                  onClick={() => setMobileMenuOpen(true)}
                  className={`flex-1 flex flex-col items-center justify-center gap-0.5 py-1 transition-all duration-200 relative touch-manipulation active:scale-95 ${
                    isSecondaryView ? 'text-discord-accent' : 'text-discord-textMuted'
                  }`}
                >
                  {isSecondaryView && (
                    <div className="absolute top-0 left-1/2 -translate-x-1/2 w-8 h-0.5 bg-discord-accent rounded-b-full"></div>
                  )}
                  <div className={`w-8 h-8 rounded-xl flex items-center justify-center transition-all duration-200 ${
                    isSecondaryView ? 'bg-discord-accent/15' : ''
                  }`}>
                    <MoreHorizontal size={isSecondaryView ? 20 : 18} className="transition-all duration-200" />
                  </div>
                  <span className={`text-[10px] leading-none font-medium ${isSecondaryView ? 'text-discord-accent' : ''}`}>More</span>
                </button>
              </div>
            </div>

        </div>
    );
};

export default App;
