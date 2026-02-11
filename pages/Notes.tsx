import React, { useState, useEffect, useCallback, useRef } from 'react';
import { Note, NoteElement, UserPreferences } from '../types';
import { Plus, ChevronLeft, Trash2, Layout, FileText, Image as ImageIcon, Search, AlignLeft, SplitSquareHorizontal, Globe, GripVertical } from 'lucide-react';
import DocumentEditor from '../components/DocumentEditor';
import CanvasBoard from '../components/CanvasBoard';
import { StorageService } from '../services/storageService';

interface NotesProps {
    notes: Note[];
    setNotes: (notes: Note[]) => void;
    onDeleteNote: (id: string) => Promise<void>;
    user: UserPreferences;
    onNavigate: (view: any) => void;
}

type ViewMode = 'split' | 'document' | 'canvas';

const Notes: React.FC<NotesProps> = ({ notes, setNotes, onDeleteNote, user, onNavigate }) => {
    const [selectedNoteId, setSelectedNoteId] = useState<string | null>(null);
    const [viewMode, setViewMode] = useState<ViewMode>('split');
    const [search, setSearch] = useState('');
    const [isEditingTitle, setIsEditingTitle] = useState(false);

    // Resizable split view state
    const [splitPosition, setSplitPosition] = useState(50); // Percentage (0-100)
    const [isDragging, setIsDragging] = useState(false);
    const containerRef = useRef<HTMLDivElement>(null);

    // Handle mouse move during drag
    const handleMouseMove = useCallback((e: MouseEvent) => {
        if (!isDragging || !containerRef.current) return;

        const container = containerRef.current;
        const rect = container.getBoundingClientRect();
        const newPosition = ((e.clientX - rect.left) / rect.width) * 100;

        // Clamp between 20% and 80%
        const clampedPosition = Math.min(80, Math.max(20, newPosition));
        setSplitPosition(clampedPosition);
    }, [isDragging]);

    // Handle mouse up to stop dragging
    const handleMouseUp = useCallback(() => {
        setIsDragging(false);
    }, []);

    // Add/remove global event listeners for drag
    useEffect(() => {
        if (isDragging) {
            document.addEventListener('mousemove', handleMouseMove);
            document.addEventListener('mouseup', handleMouseUp);
            document.body.style.cursor = 'col-resize';
            document.body.style.userSelect = 'none';
        } else {
            document.removeEventListener('mousemove', handleMouseMove);
            document.removeEventListener('mouseup', handleMouseUp);
            document.body.style.cursor = '';
            document.body.style.userSelect = '';
        }

        return () => {
            document.removeEventListener('mousemove', handleMouseMove);
            document.removeEventListener('mouseup', handleMouseUp);
            document.body.style.cursor = '';
            document.body.style.userSelect = '';
        };
    }, [isDragging, handleMouseMove, handleMouseUp]);

    const activeNote = notes.find(n => n.id === selectedNoteId);

    // Migration / Data Access Helper
    const getCanvasElements = (note: Note) => {
        return note.canvas?.elements || note.elements || [];
    };

    const getDocumentContent = (note: Note) => {
        const blocks = note.document?.blocks;
        if (Array.isArray(blocks) && blocks.length > 0) {
            // Check if it's the old Tiptap format or new Block format
            // Tiptap blocks have "type" but not "id" usually at top level in the same way, or content array.
            // New blocks have "id" and "content" string. 
            // If the first item has 'content' as string, it's likely new format.
            // If 'content' is array, it's Tiptap.
            const first = blocks[0];
            if ((first as any).id && typeof (first as any).content === 'string') {
                return blocks as any; // It's our new Block[]
            }
        }
        // Fallback for empty or legacy: Return empty array to let Editor initialize default
        return [];
    };

    const createNote = async () => {
        const newNote: Note = {
            id: Date.now().toString(),
            userId: user.id,
            title: 'Untitled Note',
            tags: [],
            folder: 'General',
            lastModified: Date.now(),
            document: { blocks: [] },
            canvas: { elements: [] },
            elements: [], // Legacy compat
            createdAt: Date.now()
        };
        console.log("[Notes.tsx] createNote - Saving new note:", newNote);
        await StorageService.saveNote(newNote);
        setNotes([newNote, ...notes]);
        setSelectedNoteId(newNote.id);
    };

    const deleteNote = async (id: string, e: React.MouseEvent) => {
        e.stopPropagation();
        if (selectedNoteId === id) setSelectedNoteId(null);
        await onDeleteNote(id);
    };

    // Old updateCanvasElements removed as CanvasBoard now handles persistence directly.

    const updateDocumentContent = useCallback((newBlocks: any) => {
        if (!activeNote) return;

        // Skip update if content is identical (deep check would be better but this helps)
        // Actually, DocumentEditor handles the diff, so we just trust the callback.

        // Optimistic update to local state first
        setNotes(prevNotes => {
            const noteIndex = prevNotes.findIndex(n => n.id === activeNote.id);
            if (noteIndex === -1) return prevNotes;

            const updated = {
                ...prevNotes[noteIndex],
                document: { blocks: newBlocks },
                lastModified: Date.now()
            };

            // Trigger side effect (save) outside of state reducer if possible, 
            // but for simple app, saving here or in useEffect is fine.
            // Be careful: calling side effect inside setState reducer is bad practice usually, 
            // but here we just need to ensure we have the LATEST notes? 
            // Actually, 'activeNote' dependency in useCallback might be the issue.
            // If activeNote changes, function changes -> DocumentEditor re-renders -> onUpdate called -> activeNote changes... LOOP.

            // Fix: Use functional state update and removing activeNote from dependency if possible, 
            // or just ensure we don't save if nothing changed. 
            // But better: DocumentEditor debounce should handle it if function is stable.

            return prevNotes.map((n, i) => i === noteIndex ? updated : n);
        });

        // We need the ID, which is stable. 
        // We can't easily get the 'updated' object from inside setNotes to save it.
        // So let's construct it.
        const updatedStart = {
            ...activeNote,
            document: { blocks: newBlocks },
            lastModified: Date.now()
        };

        console.log("[Notes.tsx] updateDocumentContent - Saving updated note:", updatedStart);
        StorageService.saveNote(updatedStart);

    }, [activeNote]); // Still depends on activeNote... see below.

    const updateTitle = (title: string) => {
        if (!activeNote) return;
        const updatedNote = { ...activeNote, title, lastModified: Date.now() };
        console.log("[Notes.tsx] updateTitle - Saving updated title:", updatedNote);
        StorageService.saveNote(updatedNote);
        setNotes(notes.map(n => n.id === activeNote.id ? updatedNote : n));
    };

    const handleTogglePublish = async () => {
        if (!activeNote) return;
        const newStatus = !activeNote.isPublic;
        const updatedNote = { ...activeNote, isPublic: newStatus, publishedAt: newStatus ? Date.now() : undefined };

        // Optimistic update
        setNotes(notes.map(n => n.id === activeNote.id ? updatedNote : n));

        // Persist
        if (newStatus) {
            await StorageService.publishNote(updatedNote);
        } else {
            await StorageService.unpublishNote(activeNote.id);
        }
    };

    if (!selectedNoteId) {
        return (
            <div className="p-8 h-full overflow-y-auto">
                <div className="flex justify-between items-center mb-8 max-w-6xl mx-auto">
                    <h1 className="text-3xl font-bold text-white">My Notes</h1>
                    <div className="flex gap-3">
                        <button
                            onClick={() => onNavigate('store')}
                            className="bg-[#2b2d31] hover:bg-[#3f4147] border border-white/5 text-white px-4 py-2 rounded-lg flex items-center gap-2 transition-all font-medium"
                        >
                            <Globe size={18} /> Community
                        </button>
                        <button onClick={createNote} className="bg-discord-accent hover:bg-discord-accentHover text-white px-4 py-2 rounded-lg flex items-center gap-2 transition-colors font-medium">
                            <Plus size={18} /> New Note
                        </button>
                    </div>
                </div>

                <div className="mb-6 relative max-w-6xl mx-auto">
                    <Search className="absolute left-3 top-3 text-discord-textMuted" size={20} />
                    <input
                        className="w-full bg-discord-panel border border-white/5 rounded-lg pl-10 pr-4 py-3 text-white focus:outline-none focus:border-discord-accent transition-all"
                        placeholder="Search notes..."
                        value={search}
                        onChange={(e) => setSearch(e.target.value)}
                    />
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 max-w-6xl mx-auto">
                    {notes.filter(n => n.title.toLowerCase().includes(search.toLowerCase())).map(note => {
                        const elements = getCanvasElements(note);
                        return (
                            <div
                                key={note.id}
                                onClick={() => setSelectedNoteId(note.id)}
                                className="bg-discord-panel aspect-video rounded-xl border border-white/5 hover:border-discord-accent/50 cursor-pointer transition-all group relative overflow-hidden shadow-sm hover:shadow-md flex flex-col"
                            >
                                {/* Preview Area - Simple representation */}
                                <div className="flex-1 bg-[#2b2d31] relative overflow-hidden">
                                    {/* Mini Canvas Preview */}
                                    <div className="absolute inset-0 opacity-50 scale-50 origin-top-left w-[200%] h-[200%] pointer-events-none">
                                        {elements.slice(0, 5).map((el, i) => (
                                            <div key={i} style={{
                                                position: 'absolute', left: el.x, top: el.y, width: el.width, height: el.height,
                                                backgroundColor: el.type === 'text' ? '#fff' : el.color,
                                                opacity: 0.2
                                            }} />
                                        ))}
                                    </div>
                                </div>

                                <div className="p-4 bg-discord-panel z-10 border-t border-white/5">
                                    <h3 className="font-bold text-lg text-white truncate">{note.title}</h3>
                                    <div className="flex items-center gap-2 mt-1">
                                        <span className="text-xs text-discord-textMuted">{elements.length} canvas items</span>
                                        <span className="text-xs text-discord-textMuted">•</span>
                                        <span className="text-xs text-discord-textMuted">{new Date(note.lastModified).toLocaleDateString()}</span>
                                    </div>
                                </div>

                                <button onClick={(e) => deleteNote(note.id, e)} className="absolute top-3 right-3 p-2 bg-black/60 hover:bg-red-500 rounded-lg text-white opacity-0 group-hover:opacity-100 transition-all backdrop-blur-sm z-20">
                                    <Trash2 size={16} />
                                </button>
                            </div>
                        );
                    })}
                </div>
            </div>
        );
    }

    if (!activeNote) return null;

    return (
        <div className="h-screen flex flex-col bg-[#1e1f22] overflow-hidden">
            {/* Header */}
            <div className="h-16 border-b border-white/10 flex items-center justify-between px-6 bg-discord-panel shrink-0 z-50 shadow-sm">
                <div className="flex items-center gap-4">
                    <button onClick={() => setSelectedNoteId(null)} className="text-discord-textMuted hover:text-white transition-colors p-2 hover:bg-white/5 rounded-lg">
                        <ChevronLeft size={20} />
                    </button>

                    <div className="h-6 w-[1px] bg-white/10"></div>

                    <input
                        value={activeNote.title}
                        onChange={(e) => updateTitle(e.target.value)}
                        onFocus={() => setIsEditingTitle(true)}
                        onBlur={() => setIsEditingTitle(false)}
                        className={`bg-transparent text-white font-bold text-xl focus:outline-none w-64 px-3 py-1.5 rounded-lg transition-all border border-transparent
                ${isEditingTitle ? 'bg-black/20 border-white/10' : 'hover:bg-white/5 hover:border-white/5'}
            `}
                        placeholder="Untitled Note"
                    />
                </div>

                {/* View Toggles */}
                <div className="flex bg-black/20 p-1 rounded-lg border border-white/5 items-center">
                    {!user.isGuest && (
                        <>
                            <button
                                onClick={handleTogglePublish}
                                className={`p-2 rounded-md transition-all flex items-center gap-2 ${activeNote.isPublic ? 'bg-green-600 text-white' : 'text-discord-textMuted hover:text-white hover:bg-white/5'}`}
                                title={activeNote.isPublic ? "Published (Click to unpublish)" : "Publish to Community"}
                            >
                                <Globe size={18} />
                            </button>
                            <div className="w-[1px] h-6 bg-white/10 mx-1"></div>
                        </>
                    )}
                    <button
                        onClick={() => setViewMode('document')}
                        className={`p-2 rounded-md transition-all flex items-center gap-2 ${viewMode === 'document' ? 'bg-[#5865F2] text-white' : 'text-discord-textMuted hover:text-white'}`}
                        title="Document Only"
                    >
                        <FileText size={18} />
                    </button>
                    <div className="w-[1px] bg-white/10 my-1 mx-1"></div>
                    <button
                        onClick={() => setViewMode('split')}
                        className={`p-2 rounded-md transition-all flex items-center gap-2 ${viewMode === 'split' ? 'bg-[#5865F2] text-white' : 'text-discord-textMuted hover:text-white'}`}
                        title="Split View"
                    >
                        <SplitSquareHorizontal size={18} />
                    </button>
                    <div className="w-[1px] bg-white/10 my-1 mx-1"></div>
                    <button
                        onClick={() => setViewMode('canvas')}
                        className={`p-2 rounded-md transition-all flex items-center gap-2 ${viewMode === 'canvas' ? 'bg-[#5865F2] text-white' : 'text-discord-textMuted hover:text-white'}`}
                        title="Canvas Only"
                    >
                        <ImageIcon size={18} />
                    </button>
                </div>
            </div>

            {/* Content Area */}
            <div ref={containerRef} className="flex-1 flex overflow-hidden relative">

                {/* Document Section */}
                {(viewMode === 'document' || viewMode === 'split') && (
                    <div
                        className={`bg-[#1e1f22] flex flex-col overflow-hidden`}
                        style={{ width: viewMode === 'split' ? `${splitPosition}%` : '100%' }}
                    >
                        <DocumentEditor
                            content={getDocumentContent(activeNote)}
                            onUpdate={updateDocumentContent}
                        />
                    </div>
                )}

                {/* Resizable Divider - Only in split mode */}
                {viewMode === 'split' && (
                    <div
                        className={`w-2 bg-[#2b2d31] hover:bg-discord-accent/50 cursor-col-resize flex items-center justify-center transition-colors group ${isDragging ? 'bg-discord-accent' : ''}`}
                        onMouseDown={(e) => {
                            e.preventDefault();
                            setIsDragging(true);
                        }}
                    >
                        <div className={`w-1 h-12 rounded-full transition-colors ${isDragging ? 'bg-discord-accent' : 'bg-white/20 group-hover:bg-discord-accent/70'}`} />
                    </div>
                )}

                {/* Canvas Section */}
                {(viewMode === 'canvas' || viewMode === 'split') && (
                    <div
                        className={`bg-[#1e1f22] overflow-hidden`}
                        style={{ width: viewMode === 'split' ? `${100 - splitPosition}%` : '100%' }}
                    >
                        <CanvasBoard
                            canvasId={activeNote.id}
                            readOnly={false}
                        />
                    </div>
                )}
            </div>
        </div>
    );
};

export default Notes;
