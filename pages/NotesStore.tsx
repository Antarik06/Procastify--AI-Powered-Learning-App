import React, { useState, useEffect } from 'react';
import { Note, UserPreferences, ViewState } from '../types';
import { Search, Loader2, Heart, Download, ChevronLeft, BookOpen } from 'lucide-react';
import { FirebaseService } from '../services/firebaseService';
import { StorageService } from '../services/storageService';
import CanvasBoard from '../components/CanvasBoard';
import DocumentEditor from '../components/DocumentEditor';
import StudyResourcesSection from './StudyResourcesSection';

interface NotesStoreProps {
    user: UserPreferences | null;
    onImportNote?: (note: Note) => void;
    onNavigate?: (view: ViewState) => void;
}

type TabType = 'notes' | 'resources';

const NotesStore: React.FC<NotesStoreProps> = ({ user, onImportNote, onNavigate }) => {
    const [activeTab, setActiveTab] = useState<TabType>('notes');
    const [publicNotes, setPublicNotes] = useState<Note[]>([]);
    const [loading, setLoading] = useState(true);
    const [search, setSearch] = useState('');
    const [selectedNote, setSelectedNote] = useState<Note | null>(null);

    useEffect(() => {
        loadNotes();
    }, []);

    const loadNotes = async () => {
        try {
            const notes = await FirebaseService.getPublicNotes();
            setPublicNotes(notes);
        } catch (error) {
            console.error("Failed to load public notes", error);
        } finally {
            setLoading(false);
        }
    };

    const handleImport = async (note: Note) => {
        if (!user || !onImportNote) return;

        console.log("[IMPORT] Import requested for community note:", note.id);

        // Deep Copy Document Blocks
        const newBlocks = note.document?.blocks ? JSON.parse(JSON.stringify(note.document.blocks)) : [];
        // Regenerate Block IDs to ensure uniqueness
        newBlocks.forEach((block: any) => {
            block.id = Math.random().toString(36).substr(2, 9);
        });
        console.log("[IMPORT] Document content copied");

        // Deep Copy Canvas Elements
        const elements = note.canvas?.elements || note.elements || [];
        const newCanvasElements = JSON.parse(JSON.stringify(elements));
        // Regenerate Element IDs if needed (optional but good practice)
        newCanvasElements.forEach((el: any) => {
            // Keep internal references if any? Canvas usually self-contained. 
            // Generating new ID primarily for the note itself is most important.
            // But let's just copy as-is for canvas elements unless they reference each other.
        });
        console.log(`[IMPORT] Canvas data copied: ${newCanvasElements.length} elements`);

        const newNoteId = Date.now().toString();

        // Clone note for user
        const newNote: Note = {
            id: newNoteId,
            userId: user.id,
            title: `${note.title} (Copy)`,
            // Strip metadata
            isPublic: false,
            publishedAt: undefined,
            likes: undefined,

            document: { blocks: newBlocks },
            canvas: { elements: newCanvasElements },
            elements: newCanvasElements, // Legacy compat

            tags: [], // Optional: Strip tags or keep? keeping for context is often nice, but "Community" tag might be weird. Let's start clean.
            folder: 'General',
            createdAt: Date.now(),
            lastModified: Date.now()
        };

        console.log("[IMPORT] New note created for user:", user.id);

        // Save to user storage
        // This must be the user's private storage
        await StorageService.saveNote(newNote);
        // CRITICAL: Explicitly save canvas elements to ensure they are available for CanvasEngine immediately
        // This bypasses any potential stripping in saveNote or legacy issues
        if (newCanvasElements.length > 0) {
            await StorageService.saveCanvasElements(newNote.id, newCanvasElements);
        }

        console.log("[IMPORT] Import completed successfully");

        // Navigate to new note
        onImportNote(newNote);
    };

    const filteredNotes = publicNotes.filter(n => n.title.toLowerCase().includes(search.toLowerCase()));

    // Render Study Resources tab
    if (activeTab === 'resources') {
        return (
            <div className="h-full bg-[#1e1f22]">
                {/* Tab Navigation */}
                <div className="border-b border-white/10 bg-[#2b2d31]">
                    <div className="max-w-6xl mx-auto px-8">
                        <div className="flex gap-1">
                            <button
                                onClick={() => setActiveTab('notes')}
                                className="px-6 py-4 text-gray-400 hover:text-white transition-colors relative"
                            >
                                Community Notes
                            </button>
                            <button
                                onClick={() => setActiveTab('resources')}
                                className="px-6 py-4 text-white transition-colors relative"
                            >
                                <div className="flex items-center gap-2">
                                    <BookOpen size={18} />
                                    Study Resources
                                </div>
                                <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-[#5865F2]"></div>
                            </button>
                        </div>
                    </div>
                </div>
                <StudyResourcesSection user={user} />
            </div>
        );
    }

    return (
        <div className="h-full bg-[#1e1f22] text-white">
            {/* Tab Navigation */}
            <div className="border-b border-white/10 bg-[#2b2d31]">
                <div className="max-w-6xl mx-auto px-8">
                    <div className="flex gap-1">
                        <button
                            onClick={() => setActiveTab('notes')}
                            className="px-6 py-4 text-white transition-colors relative"
                        >
                            Community Notes
                            <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-[#5865F2]"></div>
                        </button>
                        <button
                            onClick={() => setActiveTab('resources')}
                            className="px-6 py-4 text-gray-400 hover:text-white transition-colors relative"
                        >
                            <div className="flex items-center gap-2">
                                <BookOpen size={18} />
                                Study Resources
                            </div>
                        </button>
                    </div>
                </div>
            </div>

            {/* Community Notes Content */}
            <div className="p-8 overflow-y-auto">
                <div className="max-w-6xl mx-auto">
                <div className="flex justify-between items-center mb-8">
                    <div className="flex items-center gap-4">
                        {onNavigate && (
                            <button
                                onClick={() => onNavigate('notes')}
                                className="flex items-center gap-2 px-3 py-2 -ml-2 hover:bg-white/10 rounded-lg text-gray-400 hover:text-white transition-colors group"
                            >
                                <ChevronLeft size={20} className="group-hover:-translate-x-1 transition-transform" />
                            </button>
                        )}
                        <div>
                            <h1 className="text-3xl font-bold">Community Notes</h1>
                            <p className="text-gray-400 mt-1">Discover and learn from others.</p>
                        </div>
                    </div>
                    <div className="relative w-64">
                        <Search className="absolute left-3 top-3 text-gray-400" size={18} />
                        <input
                            className="w-full bg-black/20 border border-white/10 rounded-lg pl-10 pr-4 py-2.5 text-white focus:outline-none focus:border-[#5865F2]"
                            placeholder="Search..."
                            value={search}
                            onChange={e => setSearch(e.target.value)}
                        />
                    </div>
                </div>

                {loading ? (
                    <div className="flex justify-center py-20"><Loader2 className="animate-spin text-[#5865F2]" size={40} /></div>
                ) : filteredNotes.length > 0 ? (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                        {filteredNotes.map(note => (
                            <div
                                key={note.id}
                                onClick={() => setSelectedNote(note)}
                                className="bg-[#2b2d31] rounded-xl overflow-hidden border border-white/5 hover:border-[#5865F2] cursor-pointer transition-all hover:transform hover:-translate-y-1 hover:shadow-xl group"
                            >
                                <div className="aspect-video bg-[#232428] relative overflow-hidden">
                                    {/* Simple Preview */}
                                    <div className="absolute inset-0 opacity-40 scale-50 origin-top-left w-[200%] h-[200%] pointer-events-none p-4">
                                        {(note.canvas?.elements || note.elements || []).slice(0, 5).map((el, i) => (
                                            <div key={i} style={{
                                                position: 'absolute', left: el.x, top: el.y, width: el.width, height: el.height,
                                                backgroundColor: el.type === 'sticky' ? el.color : '#fff',
                                                opacity: 0.3
                                            }} />
                                        ))}
                                    </div>
                                </div>
                                <div className="p-4">
                                    <h3 className="font-bold text-lg truncate">{note.title}</h3>
                                    <div className="flex justify-between items-center mt-3 text-xs text-gray-400">
                                        <span>{new Date(note.publishedAt || note.lastModified).toLocaleDateString()}</span>
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                ) : (
                    <div className="flex flex-col items-center justify-center py-20 text-center">
                        <div className="w-16 h-16 bg-white/5 rounded-full flex items-center justify-center mb-4">
                            <Search size={32} className="text-gray-500" />
                        </div>
                        <h3 className="text-xl font-bold text-white mb-2">No notes at the moment</h3>
                        <p className="text-gray-400 max-w-sm">
                            {search ? "Try adjusting your search terms." : "The community hasn't published any notes yet. Be the first!"}
                        </p>
                    </div>
                )}
                </div>
            </div>

            {/* Note Preview Modal */}
            {selectedNote && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-8">
                    <div className="bg-[#1e1f22] w-full max-w-6xl h-[90vh] rounded-2xl border border-white/10 shadow-2xl flex flex-col overflow-hidden animate-in zoom-in-95">
                        <div className="p-4 border-b border-white/10 flex justify-between items-center bg-[#2b2d31]">
                            <h2 className="text-xl font-bold">{selectedNote.title}</h2>
                            <div className="flex gap-2">
                                <button
                                    onClick={() => handleImport(selectedNote)}
                                    className="px-4 py-2 bg-[#5865F2] hover:bg-[#4752c4] text-white rounded-lg font-medium flex items-center gap-2 transition-colors"
                                >
                                    <Download size={18} /> Import Copy
                                </button>
                                <button
                                    onClick={() => setSelectedNote(null)}
                                    className="px-4 py-2 hover:bg-white/10 rounded-lg text-gray-400 hover:text-white"
                                >
                                    Close
                                </button>
                            </div>
                        </div>
                        <div className="flex-1 flex overflow-hidden">
                            {/* Preview Split View */}
                            <div className="w-1/2 border-r border-white/10 flex flex-col">
                                <DocumentEditor
                                    content={selectedNote.document?.blocks ? selectedNote.document.blocks : []}
                                    onUpdate={() => { }}
                                    readOnly={true}
                                />
                            </div>
                            <div className="w-1/2">
                                <CanvasBoard
                                    elements={(selectedNote.canvas?.elements || selectedNote.elements || []) as any}
                                    readOnly={true}
                                />
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default NotesStore;
