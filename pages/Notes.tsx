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

    setIsGeneratingDiagram(true);
    setDiagramError(null);

    try {
      console.log("[Notes.tsx] Generating diagram from selected text:", selectedText.substring(0, 100) + "...");

      const diagramSpec = await generateDiagramFromText(selectedText);

      if (!diagramSpec) {
        setDiagramError("Failed to generate diagram. Please try again.");
        return;
      }

      console.log("[Notes.tsx] Diagram spec generated:", diagramSpec);

      const shapes = convertSpecToShapes(diagramSpec);

      if (shapes.length === 0) {
        setDiagramError("No diagram elements generated from the text.");
        return;
      }

      canvasBoardRef.current.addShapes(shapes);

      // Switch to canvas view if not already visible
      if (viewMode === "document") {
        setViewMode("split");
      }

      console.log("[Notes.tsx] Successfully added", shapes.length, "shapes to canvas");

      setTimeout(() => {
        alert(`Generated ${shapes.length} diagram elements!`);
      }, 100);

    } catch (error) {
      console.error("[Notes.tsx] Diagram generation error:", error);
      setDiagramError("An error occurred while generating the diagram.");
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

  return (
    <div className="h-screen flex flex-col bg-[#1e1f22] overflow-hidden">
      {/* Header */}
      <div className="h-16 border-b border-white/10 flex items-center justify-between px-6 bg-discord-panel shrink-0 z-50 shadow-sm">
        <div className="flex items-center gap-4">
          <button
            onClick={() => setSelectedNoteId(null)}
            className="text-discord-textMuted hover:text-white transition-colors p-2 hover:bg-white/5 rounded-lg"
          >
            <ChevronLeft size={20} />
          </button>

          <div className="h-6 w-[1px] bg-white/10"></div>

          <input
            value={activeNote.title}
            onChange={(e) => updateTitle(e.target.value)}
            onFocus={() => setIsEditingTitle(true)}
            onBlur={() => setIsEditingTitle(false)}
            className={`bg-transparent text-white font-bold text-xl focus:outline-none w-64 px-3 py-1.5 rounded-lg transition-all border border-transparent
                ${isEditingTitle ? "bg-black/20 border-white/10" : "hover:bg-white/5 hover:border-white/5"}
            `}
            placeholder="Untitled Note"
          />

          {/* Folder Selector */}
          <select
            value={activeNote.folderId || ""}
            onChange={(e) =>
              updateNoteFolder(activeNote.id, e.target.value || null)
            }
            className="bg-black/20 border border-white/10 rounded-lg px-3 py-1.5 text-white text-sm focus:outline-none focus:border-discord-accent transition-all"
          >
            <option value="">Uncategorized</option>
            {folders.map((folder) => (
              <option key={folder.id} value={folder.id}>
                {folder.name}
              </option>
            ))}
          </select>
        </div>

        {/* View Toggles */}
        <div className="flex bg-black/20 p-1 rounded-lg border border-white/5 items-center">
          {!user.isGuest && (
            <>
              <button
                onClick={handleTogglePublish}
                className={`p-2 rounded-md transition-all flex items-center gap-2 ${activeNote.isPublic ? "bg-green-600 text-white" : "text-discord-textMuted hover:text-white hover:bg-white/5"}`}
                title={
                  activeNote.isPublic
                    ? "Published (Click to unpublish)"
                    : "Publish to Community"
                }
              >
                <Globe size={18} />
              </button>
              <div className="w-[1px] h-6 bg-white/10 mx-1"></div>
            </>
          )}

          {isGeneratingDiagram && (
            <div className="flex items-center gap-2 px-3 text-blue-400">
              <Loader2 size={18} className="animate-spin" />
              <span className="text-sm">Generating Diagram...</span>
            </div>
          )}

          {diagramError && (
            <div className="flex items-center gap-2 px-3 text-red-400" title={diagramError}>
              <span className="text-sm">{diagramError}</span>
              <button onClick={() => setDiagramError(null)} className="hover:text-red-300">
                <X size={14} />
              </button>
            </div>
          )}

          {!isGeneratingDiagram && !diagramError && (
            <>
              <button
                onClick={() => setViewMode("document")}
                className={`p-2 rounded-md transition-all flex items-center gap-2 ${viewMode === "document" ? "bg-[#5865F2] text-white" : "text-discord-textMuted hover:text-white"}`}
                title="Document Only"
              >
                <FileText size={18} />
              </button>
              <div className="w-[1px] bg-white/10 my-1 mx-1"></div>
              <button
                onClick={() => setViewMode("split")}
                className={`p-2 rounded-md transition-all flex items-center gap-2 ${viewMode === "split" ? "bg-[#5865F2] text-white" : "text-discord-textMuted hover:text-white"}`}
                title="Split View"
              >
                <SplitSquareHorizontal size={18} />
              </button>
              <div className="w-[1px] bg-white/10 my-1 mx-1"></div>
              <button
                onClick={() => setViewMode("canvas")}
                className={`p-2 rounded-md transition-all flex items-center gap-2 ${viewMode === "canvas" ? "bg-[#5865F2] text-white" : "text-discord-textMuted hover:text-white"}`}
                title="Canvas Only"
              >
                <ImageIcon size={18} />
              </button>
            </>
          )}
        </div>
      </div>

      {/* Content Area */}
      <div ref={containerRef} className="flex-1 flex overflow-hidden relative">
        {/* Document Section */}
        {(viewMode === "document" || viewMode === "split") && (
          <div
            className={`bg-[#1e1f22] flex flex-col overflow-hidden`}
            style={{
              width: viewMode === "split" ? `${splitPosition}%` : "100%",
            }}
          >
            <DocumentEditor
              content={getDocumentContent(activeNote)}
              onUpdate={updateDocumentContent}
              onGenerateDiagram={!isGeneratingDiagram ? handleGenerateDiagram : undefined}
            />
          </div>
        )}

        {/* Resizable Divider - Only in split mode */}
        {viewMode === "split" && (
          <div
            className={`w-2 bg-[#2b2d31] hover:bg-discord-accent/50 cursor-col-resize flex items-center justify-center transition-colors group ${isDragging ? "bg-discord-accent" : ""}`}
            onMouseDown={(e) => {
              e.preventDefault();
              setIsDragging(true);
            }}
          >
            <div
              className={`w-1 h-12 rounded-full transition-colors ${isDragging ? "bg-discord-accent" : "bg-white/20 group-hover:bg-discord-accent/70"}`}
            />
          </div>
        )}

        {/* Canvas Section */}
        {(viewMode === "canvas" || viewMode === "split") && (
          <div
            className={`bg-[#1e1f22] overflow-hidden`}
            style={{
              width: viewMode === "split" ? `${100 - splitPosition}%` : "100%",
            }}
          >
            <CanvasBoard canvasId={activeNote.id} readOnly={false} ref={canvasBoardRef} />
          </div>
        )}
      </div>
    </div>
  );
};

export default Notes;
