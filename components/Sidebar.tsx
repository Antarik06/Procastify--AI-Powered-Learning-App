import React from 'react';
import { ViewState, UserRole } from '../types';
import { LayoutDashboard, FileText, BookOpen, Clock, BrainCircuit, Gamepad2, LogOut, Flame, Globe, PanelLeftClose, PanelLeftOpen, Users, GraduationCap } from 'lucide-react';
import { ThemeToggle } from './ThemeToggle';

interface SidebarProps {
  currentView: ViewState;
  onNavigate: (view: ViewState) => void;
  onLogout: () => void;
  collapsed: boolean;
  onToggleCollapse: () => void;
  userRole?: UserRole;
}

const Sidebar: React.FC<SidebarProps> = ({
  currentView,
  onNavigate,
  onLogout,
  collapsed,
  onToggleCollapse,
  userRole = "student",
}) => {
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
        className={`w-full flex items-center ${collapsed ? 'justify-center px-2' : 'gap-3 px-4'} py-3 rounded-xl transition-all duration-300 font-medium group relative overflow-hidden flex-1 max-h-16
          ${active
            ? 'bg-gradient-to-r from-app-panel to-app-panel/80 text-gray-900 dark:text-white shadow-lg shadow-app-accent/20 border border-app-accent/30'
            : 'text-app-textMuted hover:bg-gradient-to-r hover:from-app-hover hover:to-app-hover/80 hover:text-gray-900 dark:hover:text-white hover:scale-105'
          }`}
        title={collapsed ? label : undefined}
      >
        {active && (
          <div className="absolute inset-0 bg-gradient-to-r from-app-accent/10 to-purple-500/10 rounded-xl"></div>
        )}
        <Icon size={20} className={`transition-all duration-300 relative z-10 ${collapsed ? 'flex-shrink-0' : ''} ${active
          ? 'text-app-accent drop-shadow-sm'
          : 'text-app-textMuted group-hover:text-gray-900 dark:group-hover:text-white group-hover:scale-110'
          }`} />
        {!collapsed && (
          <>
            <span className="relative z-10 group-hover:translate-x-1 transition-transform duration-300">
              {label}
            </span>
            {active && (
              <div className="absolute right-2 w-2 h-2 bg-app-accent rounded-full animate-pulse"></div>
            )}
          </>
        )}
      </button>
    );
  };

  return (
    <div
      className={`${collapsed ? 'w-20' : 'w-64'} bg-gradient-to-b from-app-panel to-app-bg flex flex-col h-screen fixed left-0 top-0 border-r border-app-border z-50 backdrop-blur-sm transition-all duration-300 ease-in-out`}
    >
      {/* Header */}
      <div className={`flex items-center border-b border-app-border/50 bg-app-panel/50 transition-all duration-300 ${collapsed ? 'p-4 justify-center' : 'px-5 py-5 justify-between'}`}>
        {!collapsed ? (
          <>
            <div className="flex items-center">
              <div className="w-8 h-8 bg-gradient-to-br from-app-accent to-purple-600 rounded-lg flex items-center justify-center shadow-lg shadow-app-accent/30 hover:shadow-app-accent/50 transition-all duration-300 hover:scale-110 group">
                <BrainCircuit className="text-white group-hover:rotate-12 transition-transform duration-300" size={18} />
              </div>
              <h1 className="text-xl font-bold text-app-text tracking-tight hover:text-app-accent transition-colors duration-300 cursor-default ml-3 font-display">Procastify</h1>
            </div>
            <button
              onClick={onToggleCollapse}
              className="flex items-center justify-center w-8 h-8 text-app-textMuted hover:text-app-text hover:bg-app-hover rounded-lg transition-all duration-300 group"
              title="Collapse sidebar"
            >
              <PanelLeftClose
                size={18}
                className="group-hover:scale-110 transition-transform"
              />
            </button>
          </>
        ) : (
          <div className="w-10 h-10 bg-gradient-to-br from-app-accent to-purple-600 rounded-xl flex items-center justify-center shadow-lg shadow-app-accent/30 hover:shadow-app-accent/50 transition-all duration-300 hover:scale-110 group">
            <BrainCircuit className="text-white group-hover:rotate-12 transition-transform duration-300" size={24} />
          </div>
        )}
      </div>

      {/* Toggle Button (Collapsed Only) */}
      {collapsed && (
        <div className="px-4 pt-4 flex justify-center">
          <button
            onClick={onToggleCollapse}
            className="flex items-center justify-center w-10 h-10 text-app-textMuted hover:text-app-text hover:bg-app-hover rounded-lg transition-all duration-300 group"
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
      <nav className="flex-1 px-3 py-4 flex flex-col justify-evenly gap-1 overflow-y-auto no-scrollbar">
        <NavItem view="dashboard" icon={LayoutDashboard} label="Dashboard" />
        
        {userRole === "teacher" ? (
          <>
            <NavItem view="classrooms" icon={GraduationCap} label="My Classrooms" />
            <NavItem view="notes" icon={BookOpen} label="My Notes" />
          </>
        ) : (
          <>
            <NavItem view="summarizer" icon={FileText} label="Summarizer" />
            <NavItem view="notes" icon={BookOpen} label="My Notes" />
            <NavItem view="studentClassrooms" icon={Users} label="Classrooms" />
            <NavItem view="feed" icon={Flame} label="Learning Feed" />
            <NavItem view="quiz" icon={Gamepad2} label="Quiz Arena" />
            <NavItem view="routine" icon={Clock} label="Routine" />
            <NavItem view="focus" icon={BrainCircuit} label="Focus Mode" />
          </>
        )}
      </nav>

      {/* Theme Toggle */}
      <div className={`${collapsed ? 'px-3 py-2' : 'px-4 py-2'}`}>
        <ThemeToggle collapsed={collapsed} />
      </div>

      {/* Logout Button */}
      <div className={`${collapsed ? 'p-3 mb-4' : 'p-4 mx-4 mb-4'} border-t border-app-border`}>
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
