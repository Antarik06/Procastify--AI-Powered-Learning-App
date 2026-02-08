import React, { useState } from "react";
import { ViewState, Folder } from "../types";
import {
  LayoutDashboard,
  FileText,
  BookOpen,
  Clock,
  BrainCircuit,
  Gamepad2,
  LogOut,
  Flame,
  Globe,
  PanelLeftClose,
  PanelLeftOpen,
  FolderPlus,
  Folder as FolderIcon,
  ChevronRight,
  ChevronDown,
  Edit2,
  Trash2,
  Check,
  X,
} from "lucide-react";

interface SidebarProps {
  currentView: ViewState;
  onNavigate: (view: ViewState) => void;
  onLogout: () => void;
  collapsed: boolean;
  onToggleCollapse: () => void;
  // Folder management props
  folders?: Folder[];
  selectedFolderId?: string | null;
  onSelectFolder?: (folderId: string | null) => void;
  onCreateFolder?: (name: string, color?: string) => void;
  onUpdateFolder?: (folderId: string, updates: Partial<Folder>) => void;
  onDeleteFolder?: (folderId: string) => void;
}

const Sidebar: React.FC<SidebarProps> = ({
  currentView,
  onNavigate,
  onLogout,
  collapsed,
  onToggleCollapse,
  folders = [],
  selectedFolderId,
  onSelectFolder,
  onCreateFolder,
  onUpdateFolder,
  onDeleteFolder,
}) => {
  const [showFolders, setShowFolders] = useState(true);
  const [isCreatingFolder, setIsCreatingFolder] = useState(false);
  const [newFolderName, setNewFolderName] = useState("");
  const [editingFolderId, setEditingFolderId] = useState<string | null>(null);
  const [editingName, setEditingName] = useState("");

  const FOLDER_COLORS = [
    "#5865F2", // Discord Blue
    "#57F287", // Green
    "#FEE75C", // Yellow
    "#EB459E", // Pink
    "#ED4245", // Red
    "#F26522", // Orange
  ];

  const NavItem = ({
    view,
    icon: Icon,
    label,
  }: {
    view: ViewState;
    icon: any;
    label: string;
  }) => {
    const active = currentView === view;
    return (
      <button
        onClick={() => onNavigate(view)}
        className={`w-full flex items-center ${collapsed ? "justify-center px-2" : "gap-3 px-4"} py-3 rounded-xl transition-all duration-300 font-medium group relative overflow-hidden flex-1 max-h-16
          ${
            active
              ? "bg-gradient-to-r from-discord-panel to-discord-panel/80 text-white shadow-lg shadow-discord-accent/20 border border-discord-accent/30"
              : "text-discord-textMuted hover:bg-gradient-to-r hover:from-discord-hover hover:to-discord-hover/80 hover:text-white hover:scale-105"
          }`}
        title={collapsed ? label : undefined}
      >
        {active && (
          <div className="absolute inset-0 bg-gradient-to-r from-discord-accent/10 to-purple-500/10 rounded-xl"></div>
        )}
        <Icon
          size={20}
          className={`transition-all duration-300 relative z-10 ${collapsed ? "flex-shrink-0" : ""} ${
            active
              ? "text-discord-accent drop-shadow-sm"
              : "text-discord-textMuted group-hover:text-white group-hover:scale-110"
          }`}
        />
        {!collapsed && (
          <>
            <span className="relative z-10 group-hover:translate-x-1 transition-transform duration-300">
              {label}
            </span>
            {active && (
              <div className="absolute right-2 w-2 h-2 bg-discord-accent rounded-full animate-pulse"></div>
            )}
          </>
        )}
      </button>
    );
  };

  const handleCreateFolder = () => {
    if (newFolderName.trim() && onCreateFolder) {
      const randomColor =
        FOLDER_COLORS[Math.floor(Math.random() * FOLDER_COLORS.length)];
      onCreateFolder(newFolderName.trim(), randomColor);
      setNewFolderName("");
      setIsCreatingFolder(false);
    }
  };

  const handleUpdateFolder = (folderId: string) => {
    if (editingName.trim() && onUpdateFolder) {
      onUpdateFolder(folderId, { name: editingName.trim() });
      setEditingFolderId(null);
      setEditingName("");
    }
  };

  const handleDeleteFolder = (folderId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (
      onDeleteFolder &&
      confirm('Delete this folder? Notes will be moved to "General".')
    ) {
      onDeleteFolder(folderId);
    }
  };

  return (
    <div
      className={`${collapsed ? "w-20" : "w-64"} bg-gradient-to-b from-[#111214] to-[#0a0b0c] flex flex-col h-screen fixed left-0 top-0 border-r border-white/10 z-50 backdrop-blur-sm transition-all duration-300 ease-in-out`}
    >
      {/* Header */}
      <div
        className={`flex items-center border-b border-white/5 bg-[#111214]/50 transition-all duration-300 ${collapsed ? "p-4 justify-center" : "px-5 py-5 justify-between"}`}
      >
        {!collapsed ? (
          <>
            <div className="flex items-center">
              <div className="w-8 h-8 bg-gradient-to-br from-discord-accent to-purple-600 rounded-lg flex items-center justify-center shadow-lg shadow-discord-accent/30 hover:shadow-discord-accent/50 transition-all duration-300 hover:scale-110 group">
                <BrainCircuit
                  className="text-white group-hover:rotate-12 transition-transform duration-300"
                  size={18}
                />
              </div>
              <h1 className="text-xl font-bold text-white tracking-tight hover:text-discord-accent transition-colors duration-300 cursor-default ml-3 font-display">
                Procastify
              </h1>
            </div>
            <button
              onClick={onToggleCollapse}
              className="flex items-center justify-center w-8 h-8 text-discord-textMuted hover:text-white hover:bg-discord-hover rounded-lg transition-all duration-300 group"
              title="Collapse sidebar"
            >
              <PanelLeftClose
                size={18}
                className="group-hover:scale-110 transition-transform"
              />
            </button>
          </>
        ) : (
          <div className="w-10 h-10 bg-gradient-to-br from-discord-accent to-purple-600 rounded-xl flex items-center justify-center shadow-lg shadow-discord-accent/30 hover:shadow-discord-accent/50 transition-all duration-300 hover:scale-110 group">
            <BrainCircuit
              className="text-white group-hover:rotate-12 transition-transform duration-300"
              size={24}
            />
          </div>
        )}
      </div>

      {/* Toggle Button (Collapsed Only) */}
      {collapsed && (
        <div className="px-4 pt-4 flex justify-center">
          <button
            onClick={onToggleCollapse}
            className="flex items-center justify-center w-10 h-10 text-discord-textMuted hover:text-white hover:bg-discord-hover rounded-lg transition-all duration-300 group"
            title="Expand sidebar"
          >
            <PanelLeftOpen
              size={20}
              className="group-hover:scale-110 transition-transform"
            />
          </button>
        </div>
      )}

      {/* Navigation */}
      <nav className="flex-1 px-3 py-4 flex flex-col gap-1 overflow-y-auto no-scrollbar">
        <NavItem view="dashboard" icon={LayoutDashboard} label="Dashboard" />
        <NavItem view="summarizer" icon={FileText} label="Summarizer" />
        <NavItem view="notes" icon={BookOpen} label="My Notes" />

        {/* Folders Section - Only show when not collapsed and on notes view */}
        {!collapsed && currentView === "notes" && onSelectFolder && (
          <div className="mt-2 mb-2">
            <div className="flex items-center justify-between px-2 py-2">
              <button
                onClick={() => setShowFolders(!showFolders)}
                className="flex items-center gap-2 text-discord-textMuted hover:text-white transition-colors text-sm font-semibold"
              >
                {showFolders ? (
                  <ChevronDown size={16} />
                ) : (
                  <ChevronRight size={16} />
                )}
                <FolderIcon size={16} />
                <span>Folders</span>
              </button>
              <button
                onClick={() => setIsCreatingFolder(true)}
                className="p-1 text-discord-textMuted hover:text-white hover:bg-discord-hover rounded transition-all"
                title="Create folder"
              >
                <FolderPlus size={16} />
              </button>
            </div>

            {showFolders && (
              <div className="space-y-1 ml-2">
                {/* All Notes */}
                <button
                  onClick={() => onSelectFolder(null)}
                  className={`w-full flex items-center gap-2 px-3 py-2 rounded-lg transition-all text-sm ${
                    selectedFolderId === null
                      ? "bg-discord-panel text-white"
                      : "text-discord-textMuted hover:bg-discord-hover hover:text-white"
                  }`}
                >
                  <BookOpen size={14} />
                  <span>All Notes</span>
                </button>

                {/* Folder List */}
                {folders.map((folder) => (
                  <div key={folder.id} className="relative group">
                    {editingFolderId === folder.id ? (
                      <div className="flex items-center gap-1 px-2 py-1">
                        <div
                          className="w-3 h-3 rounded-full flex-shrink-0"
                          style={{ backgroundColor: folder.color || "#5865F2" }}
                        />
                        <input
                          type="text"
                          value={editingName}
                          onChange={(e) => setEditingName(e.target.value)}
                          onKeyDown={(e) => {
                            if (e.key === "Enter")
                              handleUpdateFolder(folder.id);
                            if (e.key === "Escape") setEditingFolderId(null);
                          }}
                          className="flex-1 bg-discord-panel border border-discord-accent rounded px-2 py-1 text-xs text-white focus:outline-none"
                          autoFocus
                        />
                        <button
                          onClick={() => handleUpdateFolder(folder.id)}
                          className="p-1 hover:bg-green-500/20 rounded text-green-400"
                        >
                          <Check size={12} />
                        </button>
                        <button
                          onClick={() => setEditingFolderId(null)}
                          className="p-1 hover:bg-red-500/20 rounded text-red-400"
                        >
                          <X size={12} />
                        </button>
                      </div>
                    ) : (
                      <div className="relative">
                        <div
                          onClick={() => onSelectFolder(folder.id)}
                          className={`w-full flex items-center gap-2 px-3 py-2 rounded-lg transition-all text-sm cursor-pointer ${
                            selectedFolderId === folder.id
                              ? "bg-discord-panel text-white"
                              : "text-discord-textMuted hover:bg-discord-hover hover:text-white"
                          }`}
                        >
                          <div
                            className="w-3 h-3 rounded-full flex-shrink-0"
                            style={{
                              backgroundColor: folder.color || "#5865F2",
                            }}
                          />
                          <span className="flex-1 text-left truncate">
                            {folder.name}
                          </span>
                        </div>
                        {/* Action buttons - separate from folder button */}
                        <div className="absolute right-2 top-2 opacity-0 group-hover:opacity-100 flex gap-1 pointer-events-none group-hover:pointer-events-auto">
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              setEditingFolderId(folder.id);
                              setEditingName(folder.name);
                            }}
                            className="p-1 hover:bg-discord-accent/20 rounded z-10"
                          >
                            <Edit2 size={12} />
                          </button>
                          <button
                            onClick={(e) => handleDeleteFolder(folder.id, e)}
                            className="p-1 hover:bg-red-500/20 rounded text-red-400 z-10"
                          >
                            <Trash2 size={12} />
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
                ))}

                {/* New Folder Input */}
                {isCreatingFolder && (
                  <div className="flex items-center gap-1 px-2 py-1">
                    <FolderIcon size={14} className="text-discord-textMuted" />
                    <input
                      type="text"
                      value={newFolderName}
                      onChange={(e) => setNewFolderName(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === "Enter") handleCreateFolder();
                        if (e.key === "Escape") {
                          setIsCreatingFolder(false);
                          setNewFolderName("");
                        }
                      }}
                      placeholder="Folder name..."
                      className="flex-1 bg-discord-panel border border-discord-accent rounded px-2 py-1 text-xs text-white placeholder-discord-textMuted focus:outline-none"
                      autoFocus
                    />
                    <button
                      onClick={handleCreateFolder}
                      className="p-1 hover:bg-green-500/20 rounded text-green-400"
                    >
                      <Check size={12} />
                    </button>
                    <button
                      onClick={() => {
                        setIsCreatingFolder(false);
                        setNewFolderName("");
                      }}
                      className="p-1 hover:bg-red-500/20 rounded text-red-400"
                    >
                      <X size={12} />
                    </button>
                  </div>
                )}
              </div>
            )}
          </div>
        )}

        <NavItem view="feed" icon={Flame} label="Learning Feed" />
        <NavItem view="quiz" icon={Gamepad2} label="Quiz Arena" />
        <NavItem view="routine" icon={Clock} label="Routine" />
        <NavItem view="focus" icon={BrainCircuit} label="Focus Mode" />
      </nav>

      {/* Logout Button */}
      <div
        className={`${collapsed ? "p-3 mb-4" : "p-4 mx-4 mb-4"} border-t border-white/10 mt-auto`}
      >
        <button
          onClick={onLogout}
          className={`w-full flex items-center ${collapsed ? "justify-center px-2" : "gap-3 px-4"} py-3 text-red-400 hover:text-red-300 hover:bg-red-500/10 rounded-xl transition-all duration-300 font-medium group hover:scale-105 border border-transparent hover:border-red-500/20`}
          title={collapsed ? "Log Out" : undefined}
        >
          <LogOut
            size={20}
            className="group-hover:rotate-12 transition-transform duration-300 flex-shrink-0"
          />
          {!collapsed && (
            <span className="group-hover:translate-x-1 transition-transform duration-300">
              Log Out
            </span>
          )}
        </button>
      </div>
    </div>
  );
};

export default Sidebar;
