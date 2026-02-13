import React, { useState, useEffect } from "react";
import { Folder, Note, UserPreferences } from "../types";
import {
  Plus,
  FolderOpen,
  Edit2,
  Trash2,
  Check,
  X,
  Search,
  ChevronRight,
  FileText,
} from "lucide-react";
import { StorageService } from "../services/storageService";

interface FoldersProps {
  folders: Folder[];
  setFolders: (folders: Folder[]) => void;
  notes: Note[];
  user: UserPreferences;
  onNavigate: (view: any, folderId?: string | null) => void;
}

const FOLDER_COLORS = [
  "#5865F2", // Discord Blue
  "#EB459E", // Pink
  "#57F287", // Green
  "#FEE75C", // Yellow
  "#ED4245", // Red
  "#9B59B6", // Purple
  "#3498DB", // Light Blue
  "#E67E22", // Orange
];

const Folders: React.FC<FoldersProps> = ({
  folders,
  setFolders,
  notes,
  user,
  onNavigate,
}) => {
  const [search, setSearch] = useState("");
  const [editingFolderId, setEditingFolderId] = useState<string | null>(null);
  const [editingName, setEditingName] = useState("");
  const [isCreating, setIsCreating] = useState(false);
  const [newFolderName, setNewFolderName] = useState("");
  const [sortBy, setSortBy] = useState<"name" | "count" | "recent">("name");

  // Calculate note counts for each folder
  const folderNoteCounts = folders.map((folder) => ({
    ...folder,
    noteCount: notes.filter((n) => n.folderId === folder.id).length,
  }));

  const createFolder = async () => {
    if (!newFolderName.trim()) return;

    const newFolder: Folder = {
      id: Date.now().toString(),
      userId: user.id,
      name: newFolderName.trim(),
      color: FOLDER_COLORS[folders.length % FOLDER_COLORS.length],
      createdAt: Date.now(),
      updatedAt: Date.now(),
    };

    await StorageService.saveFolder(newFolder);
    setFolders([...folders, newFolder]);
    setNewFolderName("");
    setIsCreating(false);
  };

  const startEdit = (folder: Folder) => {
    setEditingFolderId(folder.id);
    setEditingName(folder.name);
  };

  const saveEdit = async () => {
    if (!editingFolderId || !editingName.trim()) return;

    const updatedFolders = folders.map((f) =>
      f.id === editingFolderId
        ? { ...f, name: editingName.trim(), updatedAt: Date.now() }
        : f,
    );

    const folderToSave = updatedFolders.find((f) => f.id === editingFolderId);
    if (folderToSave) {
      await StorageService.saveFolder(folderToSave);
    }

    setFolders(updatedFolders);
    setEditingFolderId(null);
    setEditingName("");
  };

  const deleteFolder = async (folderId: string) => {
    const folderToDelete = folders.find((f) => f.id === folderId);
    if (!folderToDelete) return;

    const notesInFolder = notes.filter((n) => n.folderId === folderId);

    if (notesInFolder.length > 0) {
      const confirmMsg = `This folder contains ${notesInFolder.length} note${notesInFolder.length > 1 ? "s" : ""}. These notes will be moved to "Uncategorized". Continue?`;
      if (!window.confirm(confirmMsg)) return;

      // Move notes to uncategorized (folderId = null)
      for (const note of notesInFolder) {
        const updatedNote = { ...note, folderId: null, folder: "General" };
        await StorageService.saveNote(updatedNote);
      }
    }

    await StorageService.deleteFolder(folderId);
    setFolders(folders.filter((f) => f.id !== folderId));
  };

  const filteredFolders = folderNoteCounts.filter((f) =>
    f.name.toLowerCase().includes(search.toLowerCase()),
  );

  const sortedFolders = [...filteredFolders].sort((a, b) => {
    switch (sortBy) {
      case "name":
        return a.name.localeCompare(b.name);
      case "count":
        return (b.noteCount || 0) - (a.noteCount || 0);
      case "recent":
        return b.updatedAt - a.updatedAt;
      default:
        return 0;
    }
  });

  // Count uncategorized notes
  const uncategorizedCount = notes.filter(
    (n) => !n.folderId || n.folderId === null,
  ).length;

  return (
    <div className="p-8 h-full overflow-y-auto">
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="flex justify-between items-center mb-8">
          <div>
            <h1 className="text-3xl font-bold text-app-text mb-2">Folders</h1>
            <p className="text-app-textMuted">
              Organize your notes into folders
            </p>
          </div>
          <button
            onClick={() => setIsCreating(true)}
            className="bg-app-accent hover:bg-app-accent/80 text-white px-4 py-2 rounded-lg flex items-center gap-2 transition-colors font-medium"
          >
            <Plus size={18} /> New Folder
          </button>
        </div>

        {/* Search & Sort */}
        <div className="flex gap-4 mb-6">
          <div className="flex-1 relative">
            <Search
              className="absolute left-3 top-3 text-app-textMuted"
              size={20}
            />
            <input
              className="w-full bg-app-panel border border-app-border rounded-lg pl-10 pr-4 py-3 text-app-text focus:outline-none focus:border-app-accent transition-all"
              placeholder="Search folders..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
          <select
            value={sortBy}
            onChange={(e) =>
              setSortBy(e.target.value as "name" | "count" | "recent")
            }
            className="bg-app-panel border border-app-border rounded-lg px-4 py-3 text-app-text focus:outline-none focus:border-app-accent transition-all"
          >
            <option value="name">Sort by Name</option>
            <option value="count">Sort by Note Count</option>
            <option value="recent">Sort by Recent</option>
          </select>
        </div>

        {/* Create Folder Form */}
        {isCreating && (
          <div className="bg-app-panel border border-app-border rounded-xl p-6 mb-6 animate-in fade-in">
            <h3 className="text-app-text font-bold mb-4">Create New Folder</h3>
            <div className="flex gap-3">
              <input
                type="text"
                value={newFolderName}
                onChange={(e) => setNewFolderName(e.target.value)}
                placeholder="Folder name..."
                className="flex-1 bg-app-bg border border-app-border rounded-lg px-4 py-2 text-app-text focus:outline-none focus:border-app-accent"
                onKeyDown={(e) => {
                  if (e.key === "Enter") createFolder();
                  if (e.key === "Escape") setIsCreating(false);
                }}
                autoFocus
              />
              <button
                onClick={createFolder}
                className="bg-app-accent hover:bg-app-accent/80 text-white px-4 py-2 rounded-lg transition-colors"
              >
                <Check size={20} />
              </button>
              <button
                onClick={() => {
                  setIsCreating(false);
                  setNewFolderName("");
                }}
                className="bg-app-hover hover:bg-app-border text-app-text px-4 py-2 rounded-lg transition-colors"
              >
                <X size={20} />
              </button>
            </div>
          </div>
        )}

        {/* Uncategorized Section */}
        <div
          className="bg-app-panel border border-app-border rounded-xl p-6 mb-4 hover:border-app-accent/50 cursor-pointer transition-all group"
          onClick={() => onNavigate("notes", null)}
        >
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 bg-gray-500 rounded-lg flex items-center justify-center">
                <FileText className="text-white" size={24} />
              </div>
              <div>
                <h3 className="text-app-text font-bold text-lg">Uncategorized</h3>
                <p className="text-app-textMuted text-sm">
                  Notes without a folder
                </p>
              </div>
            </div>
            <div className="flex items-center gap-4">
              <span className="text-app-textMuted">
                {uncategorizedCount} note{uncategorizedCount !== 1 ? "s" : ""}
              </span>
              <ChevronRight
                className="text-app-textMuted group-hover:text-app-text group-hover:translate-x-1 transition-all"
                size={20}
              />
            </div>
          </div>
        </div>

        {/* Folders Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {sortedFolders.map((folder) => (
            <div
              key={folder.id}
              className="bg-app-panel border border-app-border rounded-xl p-6 hover:border-app-accent/50 transition-all group relative"
            >
              {/* Folder Content */}
              <div
                className="cursor-pointer"
                onClick={() => onNavigate("notes", folder.id)}
              >
                <div className="flex items-start gap-4 mb-4">
                  <div
                    className="w-12 h-12 rounded-lg flex items-center justify-center flex-shrink-0"
                    style={{ backgroundColor: folder.color }}
                  >
                    <FolderOpen className="text-white" size={24} />
                  </div>
                  <div className="flex-1 min-w-0">
                    {editingFolderId === folder.id ? (
                      <input
                        type="text"
                        value={editingName}
                        onChange={(e) => setEditingName(e.target.value)}
                        onClick={(e) => e.stopPropagation()}
                        onKeyDown={(e) => {
                          e.stopPropagation();
                          if (e.key === "Enter") saveEdit();
                          if (e.key === "Escape") setEditingFolderId(null);
                        }}
                        className="w-full bg-app-bg border border-app-accent rounded px-2 py-1 text-app-text text-lg font-bold focus:outline-none"
                        autoFocus
                      />
                    ) : (
                      <h3 className="text-app-text font-bold text-lg truncate">
                        {folder.name}
                      </h3>
                    )}
                    <p className="text-app-textMuted text-sm mt-1">
                      {folder.noteCount || 0} note
                      {folder.noteCount !== 1 ? "s" : ""}
                    </p>
                  </div>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    startEdit(folder);
                  }}
                  className="flex-1 bg-blue-600/20 hover:bg-blue-600/40 text-blue-400 px-3 py-2 rounded-lg transition-all flex items-center justify-center gap-2"
                >
                  <Edit2 size={16} />
                  <span className="text-sm">Rename</span>
                </button>
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    deleteFolder(folder.id);
                  }}
                  className="flex-1 bg-red-600/20 hover:bg-red-600/40 text-red-400 px-3 py-2 rounded-lg transition-all flex items-center justify-center gap-2"
                >
                  <Trash2 size={16} />
                  <span className="text-sm">Delete</span>
                </button>
              </div>

              {/* Save/Cancel for Edit Mode */}
              {editingFolderId === folder.id && (
                <div className="flex gap-2 mt-2">
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      saveEdit();
                    }}
                    className="flex-1 bg-app-accent hover:bg-app-accent/80 text-white px-3 py-2 rounded-lg transition-colors flex items-center justify-center gap-2"
                  >
                    <Check size={16} />
                    Save
                  </button>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      setEditingFolderId(null);
                    }}
                    className="flex-1 bg-app-hover hover:bg-app-border text-app-text px-3 py-2 rounded-lg transition-colors flex items-center justify-center gap-2"
                  >
                    <X size={16} />
                    Cancel
                  </button>
                </div>
              )}
            </div>
          ))}
        </div>

        {/* Empty State */}
        {sortedFolders.length === 0 && !isCreating && (
          <div className="text-center py-16">
            <FolderOpen
              className="mx-auto text-app-textMuted mb-4"
              size={64}
            />
            <h3 className="text-xl font-bold text-app-text mb-2">
              No folders yet
            </h3>
            <p className="text-app-textMuted mb-6">
              {search
                ? "No folders match your search"
                : "Create your first folder to organize your notes"}
            </p>
            {!search && (
              <button
                onClick={() => setIsCreating(true)}
                className="bg-app-accent hover:bg-app-accent/80 text-white px-6 py-3 rounded-lg font-medium transition-colors"
              >
                Create Folder
              </button>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default Folders;
