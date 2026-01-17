import React, { useState, useEffect } from 'react';
import { Note, NoteElement, UserPreferences } from '../types';
import { Plus, ChevronLeft, Trash2, Layout, FileText, Image as ImageIcon, Search, AlignLeft, SplitSquareHorizontal, Globe } from 'lucide-react';
import DocumentEditor from '../components/DocumentEditor';
import CanvasBoard from '../components/CanvasBoard';
import { StorageService } from '../services/storageService';

interface NotesProps {
    notes: Note[];
    setNotes: (notes: Note[]) => void;
    user: UserPreferences;
    onNavigate: (view: any) => void;
}

type ViewMode = 'split' | 'document' | 'canvas';

const Notes: React.FC<NotesProps> = ({ notes, setNotes, user, onNavigate }) => {
    const [selectedNoteId, setSelectedNoteId] = useState<string | null>(null);
    const [viewMode, setViewMode] = useState<ViewMode>('split');
    const [search, setSearch] = useState('');
    const [isEditingTitle, setIsEditingTitle] = useState(false);

    const activeNote = notes.find(n => n.id === selectedNoteId);

    // Migration / Data Access Helper
    const getCanvasElements = (note: Note) => {
        return note.canvas?.elements || note.elements || [];
    };

    const getDocumentContent = (note: Note) => {
        const blocks = note.document?.blocks;
        // Fix: Tiptap expects a wrapper object { type: 'doc', content: [...] }
        // App.tsx and Note type treat 'blocks' as the array of content nodes.
        if (Array.isArray(blocks)) {
            return { type: 'doc', content: blocks };
        }
        // Handle legacy or malformed cases where full object might have been saved
        if (blocks && !Array.isArray(blocks) && (blocks as any).type === 'doc') {
            return blocks;
        }
        return { type: 'doc', content: [] };
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
        await StorageService.saveNote(newNote);
        setNotes([newNote, ...notes]);
        setSelectedNoteId(newNote.id);
    };

    const deleteNote = async (id: string, e: React.MouseEvent) => {
        e.stopPropagation();
        setNotes(notes.filter(n => n.id !== id));
        if (selectedNoteId === id) setSelectedNoteId(null);
        await StorageService.deleteNote(id);
    };

    // Old updateCanvasElements removed as CanvasBoard now handles persistence directly.

    const updateDocumentContent = (newContent: any) => {
        if (!activeNote) return;
        // Fix: editor.getJSON() returns { type: 'doc', content: [...] }.
        // We only want to store the content array to stay consistent with App.tsx
        const contentArray = newContent.content || [];

        const updatedNote = {
            ...activeNote,
            document: { blocks: contentArray },
            lastModified: Date.now()
        };
        StorageService.saveNote(updatedNote);
        setNotes(notes.map(n => n.id === activeNote.id ? updatedNote : n));
    };

    const updateTitle = (title: string) => {
        if (!activeNote) return;
        const updatedNote = { ...activeNote, title, lastModified: Date.now() };
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
            <div className="flex-1 flex overflow-hidden">

                {/* Document Section */}
                {(viewMode === 'document' || viewMode === 'split') && (
                    <div className={`${viewMode === 'split' ? 'w-1/2 border-r border-white/10' : 'w-full'} bg-[#1e1f22] flex flex-col`}>
                        <DocumentEditor
                            content={getDocumentContent(activeNote)}
                            onUpdate={updateDocumentContent}
                        />
                    </div>
                )}

                {/* Canvas Section */}
                {(viewMode === 'canvas' || viewMode === 'split') && (
                    <div className={`${viewMode === 'split' ? 'w-1/2' : 'w-full'} bg-[#1e1f22]`}>
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
