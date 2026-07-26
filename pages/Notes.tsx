import React, { useState, useEffect, useCallback, useRef, Dispatch, SetStateAction } from "react";
import { Note, NoteElement, UserPreferences, Folder } from "../types";
import {
  Plus,
  ChevronLeft,
  Trash2,
  Layout,
  FileText,
  Image as ImageIcon,
  Search,
  AlignLeft,
  SplitSquareHorizontal,
  Globe,
  GripVertical,
  FolderOpen,
  X,
  Upload,
  Wand2,
  Loader2
} from "lucide-react";
import DocumentEditor from "../components/DocumentEditor";
import CanvasBoard, { CanvasBoardRef } from "../components/CanvasBoard";
import MigrationHub from "../components/MigrationHub";
import NoteChatbot from "../components/NoteChatbot";
import { StorageService } from "../services/storageService";
import { generateDiagramFromText, convertSpecToShapes } from "../services/diagramService";
import { Shape } from "../components/canvas/types";

interface NotesProps {
  notes: Note[];
  setNotes: Dispatch<SetStateAction<Note[]>>;
  onDeleteNote: (id: string) => Promise<void>;
  user: UserPreferences;
  onNavigate: (view: any, folderId?: string | null) => void;
  activeFolderId?: string | null; // null = uncategorized, undefined = all notes
  folders?: Folder[];
}

type ViewMode = "split" | "document" | "canvas";

const Notes: React.FC<NotesProps> = ({
  notes,
  setNotes,
  onDeleteNote,
  user,
  onNavigate,
  activeFolderId,
  folders = [],
}) => {
  const [selectedNoteId, setSelectedNoteId] = useState<string | null>(null);
  const [viewMode, setViewMode] = useState<ViewMode>("split");
  const [search, setSearch] = useState("");
  const [isEditingTitle, setIsEditingTitle] = useState(false);
  const [showMigrationHub, setShowMigrationHub] = useState(false);

  // Resizable split view state
  const [splitPosition, setSplitPosition] = useState(50); // Percentage (0-100)
  const [isDragging, setIsDragging] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const canvasBoardRef = useRef<CanvasBoardRef>(null);

  // Diagram generation state
  const [isGeneratingDiagram, setIsGeneratingDiagram] = useState(false);
  const [diagramError, setDiagramError] = useState<string | null>(null);
  const [diagramSuccess, setDiagramSuccess] = useState<string | null>(null);

  // Handle mouse move during drag
  const handleMouseMove = useCallback(
    (e: MouseEvent) => {
      if (!isDragging || !containerRef.current) return;

      const container = containerRef.current;
      const rect = container.getBoundingClientRect();
      const newPosition = ((e.clientX - rect.left) / rect.width) * 100;

      // Clamp between 20% and 80%
      const clampedPosition = Math.min(80, Math.max(20, newPosition));
      setSplitPosition(clampedPosition);
    },
    [isDragging],
  );

  // Handle mouse up to stop dragging
  const handleMouseUp = useCallback(() => {
    setIsDragging(false);
  }, []);

  // Keyboard support for the split handle (and double-click to re-center).
  const nudgeSplit = useCallback((delta: number) => {
    setSplitPosition((prev) => Math.min(80, Math.max(20, prev + delta)));
  }, []);

  // Add/remove global event listeners for drag
  useEffect(() => {
    if (isDragging) {
      document.addEventListener("mousemove", handleMouseMove);
      document.addEventListener("mouseup", handleMouseUp);
      document.body.style.cursor = "col-resize";
      document.body.style.userSelect = "none";
    } else {
      document.removeEventListener("mousemove", handleMouseMove);
      document.removeEventListener("mouseup", handleMouseUp);
      document.body.style.cursor = "";
      document.body.style.userSelect = "";
    }

    return () => {
      document.removeEventListener("mousemove", handleMouseMove);
      document.removeEventListener("mouseup", handleMouseUp);
      document.body.style.cursor = "";
      document.body.style.userSelect = "";
    };
  }, [isDragging, handleMouseMove, handleMouseUp]);

  const activeNote = notes.find((n) => n.id === selectedNoteId);

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
      if ((first as any).id && typeof (first as any).content === "string") {
        return blocks as any; // It's our new Block[]
      }
    }
    // Fallback for empty or legacy: Return empty array to let Editor initialize default
    return [];
  };

  const handleMigrationImport = async (blocks: any[], title: string) => {
    const newNote: Note = {
      id: Date.now().toString(),
      userId: user.id,
      title: title || "Imported Note",
      tags: ["Imported"],
      folder: "General",
      folderId: activeFolderId !== undefined ? activeFolderId : null,
      lastModified: Date.now(),
      document: { blocks },
      canvas: { elements: [] },
      elements: [],
      createdAt: Date.now(),
    };
    await StorageService.saveNote(newNote);
    setNotes([newNote, ...notes]);
    setShowMigrationHub(false);
    setSelectedNoteId(newNote.id);
  };

  const createNote = async () => {
    const newNote: Note = {
      id: Date.now().toString(),
      userId: user.id,
      title: "Untitled Note",
      tags: [],
      folder: "General",
      folderId: activeFolderId !== undefined ? activeFolderId : null,
      lastModified: Date.now(),
      document: { blocks: [] },
      canvas: { elements: [] },
      elements: [], // Legacy compat
      createdAt: Date.now(),
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

  const updateDocumentContent = useCallback(
    (newBlocks: any) => {
      if (!activeNote) return;

      // Optimistic update to local state first
      setNotes((prevNotes) => {
        const noteIndex = prevNotes.findIndex((n) => n.id === activeNote.id);
        if (noteIndex === -1) return prevNotes;

        const updated = {
          ...prevNotes[noteIndex],
          document: { blocks: newBlocks },
          lastModified: Date.now(),
        };

        return prevNotes.map((n, i) => (i === noteIndex ? updated : n));
      });

      const updatedStart = {
        ...activeNote,
        document: { blocks: newBlocks },
        lastModified: Date.now(),
      };

      console.log(
        "[Notes.tsx] updateDocumentContent - Saving updated note:",
        updatedStart,
      );
      StorageService.saveNote(updatedStart);
    },
    [activeNote],
  );

  const updateTitle = (title: string) => {
    if (!activeNote) return;
    const updatedNote = { ...activeNote, title, lastModified: Date.now() };
    console.log("[Notes.tsx] updateTitle - Saving updated title:", updatedNote);
    StorageService.saveNote(updatedNote);
    setNotes(notes.map((n) => (n.id === activeNote.id ? updatedNote : n)));
  };

  const updateNoteFolder = async (noteId: string, folderId: string | null) => {
    const note = notes.find((n) => n.id === noteId);
    if (!note) return;

    const folderName = folderId
      ? folders.find((f) => f.id === folderId)?.name || "General"
      : "General";

    const updatedNote = {
      ...note,
      folderId,
      folder: folderName,
      lastModified: Date.now(),
    };

    await StorageService.saveNote(updatedNote);
    setNotes(notes.map((n) => (n.id === noteId ? updatedNote : n)));
  };

  const handleTogglePublish = async () => {
    if (!activeNote) return;
    const newStatus = !activeNote.isPublic;
    const updatedNote = {
      ...activeNote,
      isPublic: newStatus,
      publishedAt: newStatus ? Date.now() : undefined,
    };

    // Optimistic update
    setNotes(notes.map((n) => (n.id === activeNote.id ? updatedNote : n)));

    // Persist
    if (newStatus) {
      await StorageService.publishNote(updatedNote);
    } else {
      await StorageService.unpublishNote(activeNote.id);
    }
  };

  const handleGenerateDiagram = async (selectedText: string, selectedBlockIds: string[]) => {
    if (!activeNote || !canvasBoardRef.current) return;

    if (!selectedText.trim()) {
      setDiagramError("Please select text first");
      return;
    }

    setIsGeneratingDiagram(true);
    setDiagramError(null);

    try {
      console.log("[Notes.tsx] Generating diagram from selected text:", selectedText.substring(0, 50) + "...");
      console.log("[Notes.tsx] Selected block IDs:", selectedBlockIds);

      const diagramSpec = await generateDiagramFromText(selectedText);

      if (!diagramSpec) {
        setDiagramError("Failed to generate diagram. Please try again with different text.");
        return;
      }

      console.log("[Notes.tsx] Diagram spec generated:", diagramSpec);

      if (!diagramSpec.nodes || diagramSpec.nodes.length === 0) {
        setDiagramError("No diagram elements could be generated. Try selecting more specific text.");
        return;
      }

      const shapes = convertSpecToShapes(diagramSpec);

      if (shapes.length === 0) {
        setDiagramError("No shapes generated from the specified text.");
        return;
      }

      // Add shapes to canvas
      canvasBoardRef.current.addShapes(shapes);

      // Switch to split or canvas view if in document-only mode
      if (viewMode === "document") {
        setViewMode("split");
      }

      console.log("[Notes.tsx] Successfully added", shapes.length, "shapes to canvas");

      // Show success message
      setDiagramSuccess(`Diagram created with ${shapes.length} elements!`);
      
      // Auto-hide success message after 3 seconds
      setTimeout(() => {
        setDiagramSuccess(null);
      }, 3000);

    } catch (error) {
      console.error("[Notes.tsx] Diagram generation error:", error);
      const errorMessage = error instanceof Error ? error.message : "An error occurred while generating the diagram.";
      setDiagramError(errorMessage);
    } finally {
      setIsGeneratingDiagram(false);
    }
  };

  // Filter notes based on active folder
  const filteredNotes = notes.filter((note) => {
    // Search filter
    if (search && !note.title.toLowerCase().includes(search.toLowerCase())) {
      return false;
    }

    // Folder filter
    if (activeFolderId === undefined) {
      // Show all notes
      return true;
    } else if (activeFolderId === null) {
      // Show uncategorized notes
      return !note.folderId || note.folderId === null;
    } else {
      // Show notes in specific folder
      return note.folderId === activeFolderId;
    }
  });

  // Get active folder name for display
  const getHeaderTitle = () => {
    if (activeFolderId === undefined) {
      return "My Notes";
    } else if (activeFolderId === null) {
      return "Uncategorized";
    } else {
      return (
        folders.find((f) => f.id === activeFolderId)?.name || "Unknown Folder"
      );
    }
  };

  if (!selectedNoteId) {
    return (
      <div className="p-8 h-full overflow-y-auto">
        <div className="flex justify-between items-center mb-8 max-w-6xl mx-auto">
          <div>
            <div className="flex items-center gap-3 mb-2">
              <h1 className="text-3xl font-bold text-white">
                {getHeaderTitle()}
              </h1>
              {activeFolderId !== undefined && (
                <button
                  onClick={() => onNavigate("notes")}
                  className="text-discord-textMuted hover:text-white transition-colors"
                  title="Clear filter"
                >
                  <X size={20} />
                </button>
              )}
            </div>
            {activeFolderId !== undefined && (
              <p className="text-discord-textMuted text-sm">
                {filteredNotes.length} note
                {filteredNotes.length !== 1 ? "s" : ""}
              </p>
            )}
          </div>
          <div className="flex gap-3">
            <button
              onClick={() => onNavigate("folders")}
              className="bg-[#2b2d31] hover:bg-[#3f4147] border border-white/5 text-white px-4 py-2 rounded-lg flex items-center gap-2 transition-all font-medium"
            >
              <FolderOpen size={18} /> Folders
            </button>
            <button
              onClick={() => onNavigate("store")}
              className="bg-[#2b2d31] hover:bg-[#3f4147] border border-white/5 text-white px-4 py-2 rounded-lg flex items-center gap-2 transition-all font-medium"
            >
              <Globe size={18} /> Community
            </button>
            <button
              onClick={() => setShowMigrationHub(true)}
              className="bg-[#2b2d31] hover:bg-[#3f4147] border border-white/5 text-white px-4 py-2 rounded-lg flex items-center gap-2 transition-all font-medium"
            >
              <Upload size={18} /> Import
            </button>
            <button
              onClick={createNote}
              className="bg-discord-accent hover:bg-discord-accentHover text-white px-4 py-2 rounded-lg flex items-center gap-2 transition-colors font-medium"
            >
              <Plus size={18} /> New Note
            </button>
          </div>
        </div>

        <div className="mb-6 relative max-w-6xl mx-auto">
          <Search
            className="absolute left-3 top-3 text-discord-textMuted"
            size={20}
          />
          <input
            className="w-full bg-discord-panel border border-white/5 rounded-lg pl-10 pr-4 py-3 text-white focus:outline-none focus:border-discord-accent transition-all"
            placeholder="Search notes..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 max-w-6xl mx-auto">
          {filteredNotes.map((note) => {
            const elements = getCanvasElements(note);
            const folderColor =
              note.folderId &&
              folders.find((f) => f.id === note.folderId)?.color;

            return (
              <div
                key={note.id}
                onClick={() => setSelectedNoteId(note.id)}
                className="bg-discord-panel aspect-video rounded-xl border border-white/5 hover:border-discord-accent/50 cursor-pointer transition-all group relative overflow-hidden shadow-sm hover:shadow-md flex flex-col"
              >
                {/* Folder Badge */}
                {note.folderId && (
                  <div
                    className="absolute top-3 left-3 px-2 py-1 rounded text-xs font-medium text-white z-20"
                    style={{
                      backgroundColor: folderColor || "#5865F2",
                    }}
                  >
                    {folders.find((f) => f.id === note.folderId)?.name ||
                      "Folder"}
                  </div>
                )}

                {/* Preview Area - Simple representation */}
                <div className="flex-1 bg-[#2b2d31] relative overflow-hidden">
                  {/* Mini Canvas Preview */}
                  <div className="absolute inset-0 opacity-50 scale-50 origin-top-left w-[200%] h-[200%] pointer-events-none">
                    {elements.slice(0, 5).map((el, i) => (
                      <div
                        key={i}
                        style={{
                          position: "absolute",
                          left: el.x,
                          top: el.y,
                          width: el.width,
                          height: el.height,
                          backgroundColor:
                            el.type === "text" ? "#fff" : el.color,
                          opacity: 0.2,
                        }}
                      />
                    ))}
                  </div>
                </div>

                <div className="p-4 bg-discord-panel z-10 border-t border-white/5">
                  <h3 className="font-bold text-lg text-white truncate">
                    {note.title}
                  </h3>
                  <div className="flex items-center gap-2 mt-1">
                    <span className="text-xs text-discord-textMuted">
                      {elements.length} canvas items
                    </span>
                    <span className="text-xs text-discord-textMuted">•</span>
                    <span className="text-xs text-discord-textMuted">
                      {new Date(note.lastModified).toLocaleDateString()}
                    </span>
                  </div>
                </div>

                <button
                  onClick={(e) => deleteNote(note.id, e)}
                  className="absolute top-3 right-3 p-2 bg-black/60 hover:bg-red-500 rounded-lg text-white opacity-0 group-hover:opacity-100 transition-all backdrop-blur-sm z-20"
                >
                  <Trash2 size={16} />
                </button>
              </div>
            );
          })}
        </div>

        {/* Empty State */}
        {filteredNotes.length === 0 && (
          <div className="text-center py-16 max-w-6xl mx-auto">
            <FileText
              className="mx-auto text-discord-textMuted mb-4"
              size={64}
            />
            <h3 className="text-xl font-bold text-white mb-2">
              {search ? "No notes found" : "No notes yet"}
            </h3>
            <p className="text-discord-textMuted mb-6">
              {search
                ? "Try a different search term"
                : activeFolderId !== undefined
                  ? "Create a note in this folder"
                  : "Create your first note to get started"}
            </p>
            {!search && (
              <button
                onClick={createNote}
                className="bg-discord-accent hover:bg-discord-accentHover text-white px-6 py-3 rounded-lg font-medium transition-colors"
              >
                Create Note
              </button>
            )}
          </div>
        )}

        {showMigrationHub && (
          <MigrationHub
            onImport={handleMigrationImport}
            onClose={() => setShowMigrationHub(false)}
          />
        )}
      </div>
    );
  }

  if (!activeNote) return null;

  const viewModes: Array<{ mode: ViewMode; icon: any; label: string }> = [
    { mode: "document", icon: FileText, label: "Document" },
    { mode: "split", icon: SplitSquareHorizontal, label: "Split" },
    { mode: "canvas", icon: ImageIcon, label: "Canvas" },
  ];

  return (
    <div className="h-full flex flex-col bg-[#1e1f22] overflow-hidden">
      {/* Header */}
      <div className="h-14 border-b border-white/[0.06] flex items-center justify-between gap-4 px-4 bg-[#1a1b1e] shrink-0 z-50">
        <div className="flex items-center gap-2 min-w-0 flex-1">
          <button
            onClick={() => setSelectedNoteId(null)}
            title="Back to all notes"
            className="text-discord-textMuted hover:text-white transition-colors p-2 hover:bg-white/5 rounded-lg shrink-0"
          >
            <ChevronLeft size={18} />
          </button>

          <input
            value={activeNote.title}
            onChange={(e) => updateTitle(e.target.value)}
            onFocus={() => setIsEditingTitle(true)}
            onBlur={() => setIsEditingTitle(false)}
            className={`bg-transparent text-white font-semibold text-base focus:outline-none min-w-0 flex-1 max-w-sm px-2.5 py-1.5 rounded-lg transition-all border border-transparent
                ${isEditingTitle ? "bg-black/25 border-white/10" : "hover:bg-white/5"}
            `}
            placeholder="Untitled Note"
          />

          {/* Folder Selector */}
          <select
            value={activeNote.folderId || ""}
            onChange={(e) =>
              updateNoteFolder(activeNote.id, e.target.value || null)
            }
            title="Move to folder"
            className="hidden md:block shrink-0 bg-transparent border border-white/10 rounded-lg px-2.5 py-1.5 text-discord-textMuted text-xs hover:text-white hover:border-white/20 focus:outline-none focus:border-discord-accent transition-all max-w-[9rem]"
          >
            <option value="">Uncategorized</option>
            {folders.map((folder) => (
              <option key={folder.id} value={folder.id}>
                {folder.name}
              </option>
            ))}
          </select>

          {/* Inline diagram status — kept out of the toolbar so nothing shifts */}
          {isGeneratingDiagram && (
            <span className="hidden lg:flex items-center gap-2 px-2.5 py-1 rounded-lg bg-blue-500/10 text-blue-300 text-xs shrink-0">
              <Loader2 size={13} className="animate-spin" />
              Generating diagram…
            </span>
          )}
          {diagramError && (
            <span
              className="hidden lg:flex items-center gap-2 px-2.5 py-1 rounded-lg bg-red-500/10 text-red-300 text-xs shrink-0 max-w-xs"
              title={diagramError}
            >
              <span className="truncate">{diagramError}</span>
              <button onClick={() => setDiagramError(null)} className="hover:text-red-200">
                <X size={12} />
              </button>
            </span>
          )}
        </div>

        <div className="flex items-center gap-2 shrink-0">
          {!user.isGuest && (
            <button
              onClick={handleTogglePublish}
              className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-medium transition-all border ${
                activeNote.isPublic
                  ? "bg-green-500/15 border-green-500/30 text-green-300 hover:bg-green-500/25"
                  : "border-white/10 text-discord-textMuted hover:text-white hover:border-white/20"
              }`}
              title={
                activeNote.isPublic
                  ? "Published to Community (click to unpublish)"
                  : "Publish to Community"
              }
            >
              <Globe size={14} />
              <span className="hidden sm:inline">
                {activeNote.isPublic ? "Published" : "Publish"}
              </span>
            </button>
          )}

          {/* Segmented view switcher */}
          <div className="flex items-center gap-0.5 bg-black/25 p-1 rounded-xl border border-white/[0.06]">
            {viewModes.map(({ mode, icon: Icon, label }) => (
              <button
                key={mode}
                onClick={() => setViewMode(mode)}
                title={`${label} view`}
                aria-pressed={viewMode === mode}
                className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-medium transition-all ${
                  viewMode === mode
                    ? "bg-discord-accent text-white shadow-sm shadow-discord-accent/30"
                    : "text-discord-textMuted hover:text-white hover:bg-white/5"
                }`}
              >
                <Icon size={15} />
                <span className="hidden xl:inline">{label}</span>
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Loading Overlay for Diagram Generation */}
      {isGeneratingDiagram && (
        <div className="absolute inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center">
          <div className="bg-[#2b2d31] p-8 rounded-2xl shadow-2xl flex flex-col items-center gap-4 border border-white/10 max-w-md mx-4">
            <div className="relative">
              <div className="w-16 h-16 border-4 border-blue-500/30 rounded-full"></div>
              <div className="absolute top-0 left-0 w-16 h-16 border-4 border-blue-500 rounded-full animate-spin border-t-transparent"></div>
            </div>
            <div className="text-center">
              <h3 className="text-xl font-bold text-white mb-2">Generating Diagram</h3>
              <p className="text-discord-textMuted text-sm">
                AI is analyzing your text and creating shapes...
              </p>
            </div>
            <div className="flex items-center gap-2 text-blue-400 text-sm">
              <Loader2 size={16} className="animate-spin" />
              <span>Processing</span>
            </div>
          </div>
        </div>
      )}

      {/* Success Message Toast */}
      {diagramSuccess && (
        <div className="absolute top-20 left-1/2 -translate-x-1/2 z-50 animate-in fade-in slide-in-from-top-4">
          <div className="bg-green-600/90 backdrop-blur-sm text-white px-6 py-3 rounded-xl shadow-lg flex items-center gap-3">
            <div className="w-6 h-6 bg-white/20 rounded-full flex items-center justify-center">
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
            </div>
            <span className="font-medium">{diagramSuccess}</span>
            <button onClick={() => setDiagramSuccess(null)} className="ml-2 hover:bg-white/20 rounded p-1">
              <X size={14} />
            </button>
          </div>
        </div>
      )}

      {/* Content Area */}
      <div
        ref={containerRef}
        className={`flex-1 flex overflow-hidden relative bg-[#151619] ${viewMode === "split" ? "p-2 gap-0" : ""}`}
      >
        {/* Document Section */}
        {(viewMode === "document" || viewMode === "split") && (
          <div
            className={`bg-[#1e1f22] flex flex-col overflow-hidden ${
              viewMode === "split" ? "rounded-2xl border border-white/[0.06] shadow-lg shadow-black/20" : ""
            }`}
            style={{
              width:
                viewMode === "split"
                  ? `calc(${splitPosition}% - 7px)`
                  : "100%",
            }}
          >
            <DocumentEditor
              content={getDocumentContent(activeNote)}
              onUpdate={updateDocumentContent}
              onGenerateDiagram={!isGeneratingDiagram ? handleGenerateDiagram : undefined}
              compact={viewMode === "split"}
            />
          </div>
        )}

        {/* Resizable Divider - Only in split mode */}
        {viewMode === "split" && (
          <div
            role="separator"
            aria-orientation="vertical"
            aria-label="Resize document and canvas panes"
            aria-valuenow={Math.round(splitPosition)}
            aria-valuemin={20}
            aria-valuemax={80}
            tabIndex={0}
            className="group w-[14px] shrink-0 cursor-col-resize flex items-center justify-center focus:outline-none"
            onMouseDown={(e) => {
              e.preventDefault();
              setIsDragging(true);
            }}
            onDoubleClick={() => setSplitPosition(50)}
            onKeyDown={(e) => {
              if (e.key === "ArrowLeft") {
                e.preventDefault();
                nudgeSplit(-2);
              } else if (e.key === "ArrowRight") {
                e.preventDefault();
                nudgeSplit(2);
              } else if (e.key === "Home") {
                e.preventDefault();
                setSplitPosition(50);
              }
            }}
            title="Drag to resize · double-click to reset"
          >
            <div
              className={`w-1 h-10 rounded-full transition-all ${
                isDragging
                  ? "bg-discord-accent h-16"
                  : "bg-white/15 group-hover:bg-discord-accent/70 group-hover:h-14 group-focus:bg-discord-accent"
              }`}
            />
          </div>
        )}

        {/* Canvas Section */}
        {(viewMode === "canvas" || viewMode === "split") && (
          <div
            className={`bg-[#1e1f22] overflow-hidden ${
              viewMode === "split" ? "rounded-2xl border border-white/[0.06] shadow-lg shadow-black/20" : ""
            }`}
            style={{
              width:
                viewMode === "split"
                  ? `calc(${100 - splitPosition}% - 7px)`
                  : "100%",
            }}
          >
            <CanvasBoard canvasId={activeNote.id} readOnly={false} ref={canvasBoardRef} />
          </div>
        )}
      </div>

      {/* Notes Chatbot */}
      <NoteChatbot
        notes={notes}
        user={user}
        onNavigateToNote={(noteId) => setSelectedNoteId(noteId)}
      />
    </div>
  );
};

export default Notes;
