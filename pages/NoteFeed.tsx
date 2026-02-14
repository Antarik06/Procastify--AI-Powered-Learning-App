import React, { useState, useEffect, useRef } from 'react';
import { Note, UserPreferences } from '../types';
import { motion, AnimatePresence } from 'framer-motion';
import { Heart, Share2, MessageCircle, MoreHorizontal, ArrowLeft, BookOpen, Clock, CheckCircle, Play, RefreshCw, Zap } from 'lucide-react';
import { generateReels } from '../services/geminiService';

interface NoteFeedProps {
    notes: Note[];
    user: UserPreferences;
    onClose: () => void;
}

interface ReelItem {
    id: string;
    noteId: string;
    noteTitle: string;
    content: string;
    index: number; // 1-5
}

// --- SIMPLIFIED CARD FOR REELS ---
const ReelCard = ({ reel, isActive }: { reel: ReelItem; isActive: boolean }) => {
    return (
        <div className="h-full w-full flex items-center justify-center p-4 snap-start relative bg-black">
            {/* Background Gradient Mesh - distinct for learning mode */}
            <div className="absolute inset-0 bg-gradient-to-br from-[#1e1e24] to-[#0f0f12] z-0"></div>

            {/* Subtle dynamic background */}
            <div className="absolute inset-0 opacity-20 z-0 bg-[radial-gradient(circle_at_50%_120%,rgba(120,119,198,0.3),rgba(255,255,255,0))]" />

            <div className={`w-full h-full max-w-md relative flex flex-col justify-center z-10 transition-all duration-700 ${isActive ? 'opacity-100 scale-100' : 'opacity-40 scale-95 blur-sm'}`}>

                {/* Minimal Header */}
                <div className="absolute top-10 left-0 right-0 text-center px-6">
                    <span className="inline-block py-1 px-3 rounded-full bg-white/5 border border-app-border text-xs font-bold text-app-textMuted uppercase tracking-widest backdrop-blur-md">
                        {reel.noteTitle} • {reel.index}/5
                    </span>
                </div>

                {/* MAIN CONTENT */}
                <div className="px-8 py-12">
                    <p className="text-3xl md:text-4xl font-bold text-app-text leading-tight text-center drop-shadow-2xl font-serif">
                        {reel.content}
                    </p>
                </div>

                {/* Footer hint */}
                <div className="absolute bottom-12 left-0 right-0 text-center animate-bounce">
                    <p className="text-xs text-app-text/30 font-medium">Swipe for next insight</p>
                </div>
            </div>
        </div>
    );
};

const NoteFeed: React.FC<NoteFeedProps> = ({ notes, user, onClose }) => {
    const [view, setView] = useState<'selection' | 'loading' | 'feed'>('selection');
    const [selectedNoteIds, setSelectedNoteIds] = useState<string[]>([]);
    const [reels, setReels] = useState<ReelItem[]>([]);

    // For Feed Scrolling
    const containerRef = useRef<HTMLDivElement>(null);
    const [activeIndex, setActiveIndex] = useState(0);

    const handleScroll = () => {
        if (containerRef.current) {
            const index = Math.round(containerRef.current.scrollTop / containerRef.current.clientHeight);
            setActiveIndex(index);
        }
    };

    const handleGenerate = async () => {
        if (selectedNoteIds.length === 0) return;
        setView('loading');

        const generatedReels: ReelItem[] = [];

        // Process in parallel
        await Promise.all(selectedNoteIds.map(async (id) => {
            const note = notes.find(n => n.id === id);
            if (!note) return;

            // Extract text from note
            let textContext = note.elements
                .filter(e => e.type === 'text')
                .map(e => e.content)
                .join('\n');

            // If empty text, try blocks
            if (!textContext && note.document?.blocks) {
                textContext = note.document.blocks.map(b => b.content).join('\n');
            }

            if (!textContext || textContext.length < 50) return; // Skip empty notes

            // Call Service
            const points = await generateReels(textContext);

            // Map to Reel Items
            points.forEach((point, idx) => {
                generatedReels.push({
                    id: `${note.id}-reel-${idx}`,
                    noteId: note.id,
                    noteTitle: note.title,
                    content: point,
                    index: idx + 1
                });
            });
        }));

        // Shuffle safely (keeping chunks of same note might be better or global shuffle? 
        // User said "1 note -> 5 reels". Usually sequential per note to tell a story is better, 
        // OR interleave them. Let's interleave for a "Feed" feel if multiple notes selected.)
        // Fisher-Yates shuffle
        for (let i = generatedReels.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [generatedReels[i], generatedReels[j]] = [generatedReels[j], generatedReels[i]];
        }

        setReels(generatedReels);
        setView('feed');
    };


    // --- VIEW: SELECTION ---
    if (view === 'selection') {
        return (
            <div className="p-8 max-w-7xl mx-auto h-full flex flex-col animate-in fade-in">
                <div className="flex items-center justify-between mb-8">
                    <div className="flex items-center gap-4">
                        <div className="w-12 h-12 bg-app-accent rounded-xl flex items-center justify-center shadow-lg shadow-discord-accent/20">
                            <Play className="text-app-text" size={24} fill="currentColor" />
                        </div>
                        <div>
                            <h2 className="text-3xl font-bold text-app-text">Learning Feed</h2>
                            <p className="text-app-textMuted text-sm">Select notes to generate your study reels.</p>
                        </div>
                    </div>
                </div>

                <div className="flex-1 min-h-0 grid grid-cols-1 lg:grid-cols-3 gap-8">

                    {/* LEFT COLUMN: Note Selection (Vertical) */}
                    <div className="lg:col-span-2 flex flex-col min-h-0 bg-app-panel/50 rounded-2xl border border-app-border p-6">
                        <h3 className="text-sm font-bold text-app-textMuted uppercase mb-4 flex items-center gap-2">
                            <BookOpen size={16} /> Available Notes
                        </h3>

                        <div className="flex-1 overflow-y-auto pr-2 space-y-3 custom-scrollbar mb-6">
                            {notes.map(note => (
                                <div
                                    key={note.id}
                                    onClick={() => setSelectedNoteIds(prev => prev.includes(note.id) ? prev.filter(id => id !== note.id) : [...prev, note.id])}
                                    className={`p-4 rounded-xl border cursor-pointer transition-all flex items-center justify-between group
                                    ${selectedNoteIds.includes(note.id)
                                            ? 'bg-app-accent/10 border-app-accent text-app-text shadow-md'
                                            : 'bg-app-bg border-app-border text-app-textMuted hover:bg-app-panel hover:text-app-text'}`}
                                >
                                    <div className="flex items-center gap-4">
                                        <div className={`w-6 h-6 rounded-md border flex items-center justify-center transition-colors shrink-0
                                            ${selectedNoteIds.includes(note.id) ? 'bg-app-accent border-app-accent' : 'border-app-border group-hover:border-app-accent/50'}`}>
                                            {selectedNoteIds.includes(note.id) && <CheckCircle size={14} className="text-app-text" />}
                                        </div>
                                        <div className="min-w-0">
                                            <span className="font-bold text-sm block mb-1 truncate">{note.title}</span>
                                            <span className="text-xs text-app-textMuted/70 flex items-center gap-1.5">
                                                <span className="px-1.5 py-0.5 bg-white/5 rounded text-[10px] truncate max-w-[80px]">{note.folder}</span>
                                                <span className="shrink-0">•</span>
                                                <span className="shrink-0">{new Date(note.lastModified).toLocaleDateString()}</span>
                                            </span>
                                        </div>
                                    </div>
                                </div>
                            ))}
                            {notes.length === 0 && (
                                <div className="text-center py-10 border-2 border-dashed border-app-border rounded-xl">
                                    <p className="text-app-textMuted">No notes found. Create some notes first!</p>
                                </div>
                            )}
                        </div>

                        <div className="pt-4 border-t border-app-border">
                            <button
                                onClick={handleGenerate}
                                disabled={selectedNoteIds.length === 0}
                                className="w-full sm:w-auto px-8 bg-discord-green hover:bg-green-600 text-app-text py-3 rounded-xl font-bold text-lg transition-all disabled:opacity-50 disabled:grayscale flex items-center justify-center gap-3 shadow-lg hover:shadow-green-500/20"
                            >
                                Generate Feed <Play size={20} fill="currentColor" />
                            </button>
                        </div>
                    </div>

                    {/* RIGHT COLUMN: Coming Soon Placeholder */}
                    <div className="flex flex-col gap-6">
                        <div className="bg-gradient-to-br from-[#2b2d31] to-[#1e1f22] p-8 rounded-2xl border border-app-border relative overflow-hidden group">
                            {/* Decorative Background Elements */}
                            <div className="absolute top-0 right-0 w-32 h-32 bg-app-accent/10 rounded-full blur-3xl -mr-10 -mt-10"></div>
                            <div className="absolute bottom-0 left-0 w-24 h-24 bg-purple-500/10 rounded-full blur-2xl -ml-5 -mb-5"></div>

                            <div className="relative z-10">
                                <span className="inline-block py-1 px-3 rounded-full bg-app-accent/20 border border-app-accent/30 text-app-accent text-xs font-bold uppercase tracking-wider mb-4">
                                    Coming Soon
                                </span>

                                <h3 className="text-2xl font-bold text-app-text mb-3">Immersive Learning</h3>
                                <p className="text-app-textMuted text-sm leading-relaxed mb-6">
                                    We're building a multimodal engine to turn your notes into video reels, image carousels, and interactive quizzes instantly.
                                </p>

                                <div className="space-y-3">
                                    <div className="flex items-center gap-3 text-sm text-gray-400 group-hover:text-gray-300 transition-colors">
                                        <div className="w-8 h-8 rounded-lg bg-white/5 flex items-center justify-center">
                                            <Play size={14} className="text-purple-400" fill="currentColor" />
                                        </div>
                                        <span>AI Video Summaries</span>
                                    </div>
                                    <div className="flex items-center gap-3 text-sm text-gray-400 group-hover:text-gray-300 transition-colors">
                                        <div className="w-8 h-8 rounded-lg bg-white/5 flex items-center justify-center">
                                            <Zap size={14} className="text-yellow-400" fill="currentColor" />
                                        </div>
                                        <span>Interactive Pop-Quizzes</span>
                                    </div>
                                    <div className="flex items-center gap-3 text-sm text-gray-400 group-hover:text-gray-300 transition-colors">
                                        <div className="w-8 h-8 rounded-lg bg-white/5 flex items-center justify-center">
                                            <Share2 size={14} className="text-blue-400" />
                                        </div>
                                        <span>Social Study Groups</span>
                                    </div>
                                </div>
                            </div>
                        </div>

                        <div className="bg-app-panel p-6 rounded-2xl border border-app-border flex items-center gap-4 opacity-70">
                            <div className="w-10 h-10 rounded-full bg-white/5 flex items-center justify-center">
                                <Clock size={20} className="text-app-textMuted" />
                            </div>
                            <div>
                                <p className="text-app-text font-bold text-sm">Study Streak</p>
                                <p className="text-xs text-app-textMuted">Keep generating reels to maintain momentum!</p>
                            </div>
                        </div>
                    </div>

                </div>
            </div>
        )
    }

    // --- VIEW: LOADING ---
    if (view === 'loading') {
        return (
            <div className="fixed inset-0 z-[100] bg-[#111214] flex flex-col items-center justify-center text-app-text space-y-6">
                <div className="relative">
                    <div className="absolute inset-0 bg-app-accent blur-xl opacity-20 animate-pulse"></div>
                    <RefreshCw size={64} className="text-app-accent animate-spin relative z-10" />
                </div>
                <div className="text-center">
                    <h2 className="text-2xl font-bold mb-2">Curating your Feed...</h2>
                    <p className="text-app-textMuted">AI is slicing your notes into bite-sized reels.</p>
                </div>
            </div>
        );
    }

    // --- VIEW: FEED ---
    return (
        <div className="fixed inset-0 z-[100] bg-black text-app-text flex flex-col">
            <div className="absolute top-4 left-4 z-50 mix-blend-difference">
                <button onClick={() => setView('selection')} className="p-3 bg-white/10 rounded-full text-app-text hover:bg-white/20 transition-all backdrop-blur-md border border-app-border">
                    <ArrowLeft size={24} />
                </button>
            </div>

            <div
                ref={containerRef}
                onScroll={handleScroll}
                className="flex-1 overflow-y-scroll snap-y snap-mandatory scroll-smooth no-scrollbar"
                style={{ height: '100vh' }}
            >
                {reels.length > 0 ? (
                    reels.map((reel, index) => (
                        <div key={reel.id} className="h-full w-full snap-start">
                            <ReelCard reel={reel} isActive={index === activeIndex} />
                        </div>
                    ))
                ) : (
                    <div className="h-full w-full flex items-center justify-center">
                        <p className="text-gray-500">No content could be generated from these notes.</p>
                    </div>
                )}
            </div>
        </div>
    );
};

export default NoteFeed;
