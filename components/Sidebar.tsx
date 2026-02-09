import React, { useEffect, useCallback, useRef, useState } from 'react';
import { ViewState } from '../types';
import { motion, AnimatePresence } from 'framer-motion';
import { LayoutDashboard, FileText, BookOpen, Clock, BrainCircuit, Gamepad2, LogOut, Flame, Globe, PanelLeftClose, PanelLeftOpen, X } from 'lucide-react';

interface SidebarProps {
  currentView: ViewState;
  onNavigate: (view: ViewState) => void;
  onLogout: () => void;
  collapsed: boolean;
  onToggleCollapse: () => void;
  mobileOpen: boolean;
  onMobileToggle: () => void;
  userName?: string;
}

// Navigation config — single source of truth, exported for bottom tab bar in App.tsx
const NAV_ITEMS: { view: ViewState; icon: any; label: string; primary?: boolean }[] = [
  { view: 'dashboard',  icon: LayoutDashboard, label: 'Dashboard',     primary: true },
  { view: 'summarizer', icon: FileText,        label: 'Summarizer'     },
  { view: 'notes',      icon: BookOpen,        label: 'My Notes',      primary: true },
  { view: 'feed',       icon: Flame,           label: 'Learning Feed'  },
  { view: 'quiz',       icon: Gamepad2,        label: 'Quiz Arena',    primary: true },
  { view: 'routine',    icon: Clock,           label: 'Routine',       primary: true },
  { view: 'focus',      icon: BrainCircuit,    label: 'Focus Mode'     },
];

// --- Framer Motion Variants ---
const drawerVariants = {
  hidden: { x: '-100%', transition: { type: 'spring' as const, stiffness: 400, damping: 40 } },
  visible: { x: 0, transition: { type: 'spring' as const, stiffness: 400, damping: 40, staggerChildren: 0.04, delayChildren: 0.1 } },
};

const backdropVariants = {
  hidden: { opacity: 0 },
  visible: { opacity: 1 },
};

const navItemVariants = {
  hidden: { x: -24, opacity: 0 },
  visible: { x: 0, opacity: 1, transition: { type: 'spring' as const, stiffness: 500, damping: 30 } },
};

const Sidebar: React.FC<SidebarProps> = ({ currentView, onNavigate, onLogout, collapsed, onToggleCollapse, mobileOpen, onMobileToggle, userName }) => {

  // --- Swipe-to-close gesture tracking ---
  const drawerRef = useRef<HTMLDivElement>(null);
  const touchStartX = useRef<number | null>(null);
  const touchDeltaX = useRef(0);
  const [swipeOffset, setSwipeOffset] = useState(0);

  const handleTouchStart = useCallback((e: React.TouchEvent) => {
    touchStartX.current = e.touches[0].clientX;
    touchDeltaX.current = 0;
  }, []);

  const handleTouchMove = useCallback((e: React.TouchEvent) => {
    if (touchStartX.current === null) return;
    const delta = e.touches[0].clientX - touchStartX.current;
    // Only track leftward swipes (closing gesture)
    if (delta < 0) {
      touchDeltaX.current = delta;
      setSwipeOffset(delta);
    }
  }, []);

  const handleTouchEnd = useCallback(() => {
    // If swiped left more than 80px, close the drawer
    if (touchDeltaX.current < -80) {
      onMobileToggle();
    }
    touchStartX.current = null;
    touchDeltaX.current = 0;
    setSwipeOffset(0);
  }, [onMobileToggle]);

  // Close mobile menu on Escape key
  useEffect(() => {
    const handleEsc = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && mobileOpen) onMobileToggle();
    };
    document.addEventListener('keydown', handleEsc);
    return () => document.removeEventListener('keydown', handleEsc);
  }, [mobileOpen, onMobileToggle]);

  // Prevent body scroll when mobile menu is open
  useEffect(() => {
    if (mobileOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => { document.body.style.overflow = ''; };
  }, [mobileOpen]);

  const handleNavClick = useCallback((view: ViewState) => {
    onNavigate(view);
    if (mobileOpen) onMobileToggle();
  }, [onNavigate, mobileOpen, onMobileToggle]);

  const handleLogoutClick = useCallback(() => {
    onLogout();
    if (mobileOpen) onMobileToggle();
  }, [onLogout, mobileOpen, onMobileToggle]);

  // --- Desktop NavItem (unchanged from original) ---
  const DesktopNavItem = ({ view, icon: Icon, label }: { view: ViewState; icon: any; label: string }) => {
    const active = currentView === view;
    return (
      <button
        onClick={() => onNavigate(view)}
        className={`w-full flex items-center ${collapsed ? 'justify-center px-2' : 'gap-3 px-4'} py-3 rounded-xl transition-all duration-300 font-medium group relative overflow-hidden flex-1 max-h-16
          ${active
            ? 'bg-gradient-to-r from-discord-panel to-discord-panel/80 text-white shadow-lg shadow-discord-accent/20 border border-discord-accent/30'
            : 'text-discord-textMuted hover:bg-gradient-to-r hover:from-discord-hover hover:to-discord-hover/80 hover:text-white hover:scale-105'
          }`}
        title={collapsed ? label : undefined}
      >
        {active && <div className="absolute inset-0 bg-gradient-to-r from-discord-accent/10 to-purple-500/10 rounded-xl"></div>}
        <Icon size={20} className={`transition-all duration-300 relative z-10 ${collapsed ? 'flex-shrink-0' : ''} ${active ? 'text-discord-accent drop-shadow-sm' : 'text-discord-textMuted group-hover:text-white group-hover:scale-110'}`} />
        {!collapsed && (
          <>
            <span className="relative z-10 group-hover:translate-x-1 transition-transform duration-300">{label}</span>
            {active && <div className="absolute right-2 w-2 h-2 bg-discord-accent rounded-full animate-pulse"></div>}
          </>
        )}
      </button>
    );
  };

  // --- Mobile NavItem with staggered entrance + animated accent bar ---
  const MobileNavItem = ({ view, icon: Icon, label }: { view: ViewState; icon: any; label: string }) => {
    const active = currentView === view;
    return (
      <motion.button
        variants={navItemVariants}
        onClick={() => handleNavClick(view)}
        className={`w-full flex items-center gap-4 px-4 py-3.5 rounded-2xl transition-colors duration-200 font-medium group relative touch-manipulation active:scale-[0.97]
          ${active
            ? 'bg-discord-accent/15 text-white'
            : 'text-discord-textMuted hover:bg-white/5 hover:text-white active:bg-white/10'
          }`}
      >
        {/* Animated active indicator bar */}
        {active && (
          <motion.div
            layoutId="mobile-active-indicator"
            className="absolute left-0 top-1/2 -translate-y-1/2 w-1 h-8 bg-discord-accent rounded-r-full"
            transition={{ type: 'spring' as const, stiffness: 500, damping: 35 }}
          />
        )}
        <div className={`w-9 h-9 rounded-xl flex items-center justify-center transition-all duration-200 ${active ? 'bg-discord-accent/20 shadow-lg shadow-discord-accent/10' : 'bg-white/5 group-hover:bg-white/10'}`}>
          <Icon size={18} className={`transition-all duration-200 ${active ? 'text-discord-accent' : 'text-discord-textMuted group-hover:text-white'}`} />
        </div>
        <span className={`text-[15px] tracking-wide ${active ? 'font-semibold' : 'font-medium'}`}>{label}</span>
        {active && <div className="ml-auto w-2 h-2 bg-discord-accent rounded-full animate-pulse"></div>}
      </motion.button>
    );
  };

  return (
    <>
      {/* ========== MOBILE DRAWER (< md) ========== */}
      <AnimatePresence>
        {mobileOpen && (
          <>
            {/* Backdrop */}
            <motion.div
              key="mobile-backdrop"
              variants={backdropVariants}
              initial="hidden"
              animate="visible"
              exit="hidden"
              transition={{ duration: 0.25 }}
              className="md:hidden fixed inset-0 bg-black/60 backdrop-blur-sm z-[54]"
              onClick={onMobileToggle}
              aria-hidden="true"
            />

            {/* Drawer Panel */}
            <motion.div
              key="mobile-drawer"
              ref={drawerRef}
              variants={drawerVariants}
              initial="hidden"
              animate="visible"
              exit="hidden"
              style={{ x: swipeOffset < 0 ? swipeOffset : 0 }}
              onTouchStart={handleTouchStart}
              onTouchMove={handleTouchMove}
              onTouchEnd={handleTouchEnd}
              className="md:hidden fixed left-0 top-0 w-[300px] max-w-[85vw] h-screen z-[55] bg-gradient-to-b from-[#111214] to-[#0a0b0c] border-r border-white/10 flex flex-col overflow-hidden"
            >
              {/* Drawer Header */}
              <div className="px-5 pt-5 pb-4 border-b border-white/5">
                <div className="flex items-center justify-between mb-5">
                  <div className="flex items-center gap-3">
                    <div className="w-9 h-9 bg-gradient-to-br from-discord-accent to-purple-600 rounded-xl flex items-center justify-center shadow-lg shadow-discord-accent/30">
                      <BrainCircuit className="text-white" size={18} />
                    </div>
                    <h1 className="text-lg font-bold text-white tracking-tight">Procastify</h1>
                  </div>
                  <button
                    onClick={onMobileToggle}
                    className="w-9 h-9 rounded-xl bg-white/5 flex items-center justify-center text-discord-textMuted hover:text-white hover:bg-white/10 transition-colors active:scale-95"
                    aria-label="Close menu"
                  >
                    <X size={18} />
                  </button>
                </div>
                {/* User greeting avatar */}
                {userName && (
                  <motion.div variants={navItemVariants} className="flex items-center gap-3 px-1">
                    <div className="w-10 h-10 rounded-full bg-gradient-to-br from-discord-accent/60 to-purple-500/60 flex items-center justify-center text-white font-bold text-sm shadow-inner">
                      {userName.charAt(0).toUpperCase()}
                    </div>
                    <div>
                      <p className="text-sm font-semibold text-white leading-tight">{userName}</p>
                      <p className="text-xs text-discord-textMuted">Keep going!</p>
                    </div>
                  </motion.div>
                )}
              </div>

              {/* Swipe hint indicator */}
              <div className="flex justify-center py-1.5">
                <div className="w-8 h-1 rounded-full bg-white/10"></div>
              </div>

              {/* Navigation */}
              <nav className="flex-1 px-3 py-2 flex flex-col gap-0.5 overflow-y-auto mobile-drawer-scroll">
                <motion.p variants={navItemVariants} className="text-[11px] uppercase tracking-widest text-discord-textMuted/60 font-semibold px-4 pt-2 pb-1">Navigate</motion.p>
                {NAV_ITEMS.map((item) => (
                  <MobileNavItem key={item.view} view={item.view} icon={item.icon} label={item.label} />
                ))}
              </nav>

              {/* Logout */}
              <motion.div variants={navItemVariants} className="p-4 border-t border-white/5">
                <button
                  onClick={handleLogoutClick}
                  className="w-full flex items-center gap-3 px-4 py-3 text-red-400 hover:text-red-300 hover:bg-red-500/10 rounded-2xl transition-all duration-200 font-medium group active:scale-[0.97] touch-manipulation"
                >
                  <div className="w-9 h-9 rounded-xl bg-red-500/10 flex items-center justify-center group-hover:bg-red-500/20 transition-colors">
                    <LogOut size={18} className="group-hover:rotate-12 transition-transform duration-300" />
                  </div>
                  <span>Log Out</span>
                </button>
              </motion.div>
            </motion.div>
          </>
        )}
      </AnimatePresence>

      {/* ========== DESKTOP SIDEBAR (>= md) — fully preserved ========== */}
      <div
        className={`hidden md:flex ${collapsed ? 'w-20' : 'w-64'} bg-gradient-to-b from-[#111214] to-[#0a0b0c] flex-col h-screen fixed left-0 top-0 border-r border-white/10 z-50 backdrop-blur-sm transition-all duration-300 ease-in-out`}
      >
        {/* Header */}
        <div className={`flex items-center border-b border-white/5 bg-[#111214]/50 transition-all duration-300 ${collapsed ? 'p-4 justify-center' : 'px-5 py-5 justify-between'}`}>
          {!collapsed ? (
            <>
              <div className="flex items-center">
                <div className="w-8 h-8 bg-gradient-to-br from-discord-accent to-purple-600 rounded-lg flex items-center justify-center shadow-lg shadow-discord-accent/30 hover:shadow-discord-accent/50 transition-all duration-300 hover:scale-110 group">
                  <BrainCircuit className="text-white group-hover:rotate-12 transition-transform duration-300" size={18} />
                </div>
                <h1 className="text-xl font-bold text-white tracking-tight hover:text-discord-accent transition-colors duration-300 cursor-default ml-3 font-display">Procastify</h1>
              </div>
              <button
                onClick={onToggleCollapse}
                className="flex items-center justify-center w-8 h-8 text-discord-textMuted hover:text-white hover:bg-discord-hover rounded-lg transition-all duration-300 group"
                title="Collapse sidebar"
              >
                <PanelLeftClose size={18} className="group-hover:scale-110 transition-transform" />
              </button>
            </>
          ) : (
            <div className="w-10 h-10 bg-gradient-to-br from-discord-accent to-purple-600 rounded-xl flex items-center justify-center shadow-lg shadow-discord-accent/30 hover:shadow-discord-accent/50 transition-all duration-300 hover:scale-110 group">
              <BrainCircuit className="text-white group-hover:rotate-12 transition-transform duration-300" size={24} />
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
              <PanelLeftOpen size={20} className="group-hover:scale-110 transition-transform" />
            </button>
          </div>
        )}

        {/* Navigation */}
        <nav className="flex-1 px-3 py-4 flex flex-col justify-evenly gap-1 overflow-y-auto no-scrollbar">
          {NAV_ITEMS.map((item) => (
            <DesktopNavItem key={item.view} view={item.view} icon={item.icon} label={item.label} />
          ))}
        </nav>

        {/* Logout Button */}
        <div className={`${collapsed ? 'p-3 mb-4' : 'p-4 mx-4 mb-4'} border-t border-white/10 mt-auto`}>
          <button
            onClick={onLogout}
            className={`w-full flex items-center ${collapsed ? 'justify-center px-2' : 'gap-3 px-4'} py-3 text-red-400 hover:text-red-300 hover:bg-red-500/10 rounded-xl transition-all duration-300 font-medium group hover:scale-105 border border-transparent hover:border-red-500/20`}
            title={collapsed ? "Log Out" : undefined}
          >
            <LogOut size={20} className="group-hover:rotate-12 transition-transform duration-300 flex-shrink-0" />
            {!collapsed && <span className="group-hover:translate-x-1 transition-transform duration-300">Log Out</span>}
          </button>
        </div>
      </div>
    </>
  );
};

export { NAV_ITEMS };
export default Sidebar;
