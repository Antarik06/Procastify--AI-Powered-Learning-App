import React, { useState } from 'react';
import { BrainCircuit, LogOut, Menu, X } from 'lucide-react';
import { getHomeView, getNavItems, isNavItemActive } from '../navigation/navItems';
import type { AppView, UserRole } from '../../types';

interface SidebarProps {
  currentView: AppView;
  onNavigate: (view: AppView) => void;
  onLogout: () => void;
  userRole?: UserRole;
  user?: { name: string; avatarUrl?: string };
}

/**
 * Floating vertical rail. Icon-only on desktop with hover labels; on mobile it
 * slides in from the left with the labels always visible.
 */
const Sidebar: React.FC<SidebarProps> = ({
  currentView,
  onNavigate,
  onLogout,
  userRole = 'student',
  user,
}) => {
  const [mobileOpen, setMobileOpen] = useState(false);

  const navItems = getNavItems(userRole);

  const handleNavigate = (view: AppView) => {
    onNavigate(view);
    setMobileOpen(false);
  };

  const RailButton = ({
    icon: Icon,
    label,
    active = false,
    danger = false,
    onClick,
  }: {
    icon: any;
    label: string;
    active?: boolean;
    danger?: boolean;
    onClick: () => void;
  }) => (
    <button
      onClick={onClick}
      aria-label={label}
      aria-current={active ? 'page' : undefined}
      className={`group relative flex items-center rounded-2xl transition-all duration-200
        ${mobileOpen ? 'w-full gap-3 px-3 py-2.5 justify-start' : 'w-11 h-11 justify-center'}
        ${
          active
            ? 'bg-discord-accent text-white shadow-lg shadow-discord-accent/30'
            : danger
              ? 'text-red-400 hover:text-red-300 hover:bg-red-500/10'
              : 'text-discord-textMuted hover:text-white hover:bg-white/[0.07]'
        }`}
    >
      {/* Active indicator notch on the rail edge (desktop only) */}
      {active && !mobileOpen && (
        <span className="absolute -left-[13px] top-1/2 -translate-y-1/2 w-[3px] h-5 rounded-r-full bg-discord-accent" />
      )}

      <Icon size={20} className="flex-shrink-0" />

      {mobileOpen ? (
        <span className="text-sm font-medium">{label}</span>
      ) : (
        /* Hover tooltip */
        <span
          className="pointer-events-none absolute left-full ml-3 z-50 whitespace-nowrap rounded-lg border border-white/10 bg-[#111214] px-2.5 py-1.5 text-xs font-medium text-white opacity-0 shadow-xl transition-all duration-150 -translate-x-1 group-hover:translate-x-0 group-hover:opacity-100"
        >
          {label}
        </span>
      )}
    </button>
  );

  return (
    <>
      {/* Mobile trigger */}
      {!mobileOpen && (
        <button
          onClick={() => setMobileOpen(true)}
          className="lg:hidden fixed top-4 left-4 z-40 flex h-11 w-11 items-center justify-center rounded-2xl border border-white/10 bg-[#16171a]/90 text-white shadow-xl backdrop-blur-xl transition-all hover:bg-white/10"
          aria-label="Open menu"
        >
          <Menu size={20} />
        </button>
      )}

      {/* Mobile backdrop */}
      {mobileOpen && (
        <div
          className="lg:hidden fixed inset-0 z-40 bg-black/60 backdrop-blur-sm"
          onClick={() => setMobileOpen(false)}
        />
      )}

      <aside
        className={`fixed left-3 top-1/2 z-50 flex -translate-y-1/2 flex-col gap-1 rounded-[28px] border border-white/10 bg-[#16171a]/90 p-2.5 shadow-2xl shadow-black/50 backdrop-blur-xl transition-transform duration-300
          ${
            mobileOpen
              ? 'w-56 items-stretch translate-x-0'
              : 'w-[68px] items-center -translate-x-[130%] lg:translate-x-0'
          }`}
      >
        {/* Brand */}
        <div className={`flex items-center ${mobileOpen ? 'justify-between px-1 pb-1' : 'justify-center'}`}>
          <button
            onClick={() => handleNavigate(getHomeView(userRole))}
            className="flex items-center gap-2.5"
            aria-label="Procastify home"
          >
            <span className="flex h-10 w-10 items-center justify-center rounded-2xl bg-gradient-to-br from-discord-accent to-purple-600 shadow-lg shadow-discord-accent/30 transition-transform hover:scale-105">
              <BrainCircuit size={20} className="text-white" />
            </span>
            {mobileOpen && (
              <span className="text-base font-bold tracking-tight text-white">Procastify</span>
            )}
          </button>
          {mobileOpen && (
            <button
              onClick={() => setMobileOpen(false)}
              className="rounded-lg p-1.5 text-discord-textMuted transition-colors hover:bg-white/5 hover:text-white"
              aria-label="Close menu"
            >
              <X size={18} />
            </button>
          )}
        </div>

        <div className={`my-1.5 h-px bg-white/10 ${mobileOpen ? 'w-full' : 'w-8'}`} />

        {/* Navigation */}
        <nav className={`flex flex-col gap-1 ${mobileOpen ? 'w-full' : 'items-center'}`}>
          {navItems.map((item) => (
            <RailButton
              key={item.view}
              icon={item.icon}
              label={item.label}
              active={isNavItemActive(item, currentView)}
              onClick={() => handleNavigate(item.view)}
            />
          ))}
        </nav>

        <div className={`my-1.5 h-px bg-white/10 ${mobileOpen ? 'w-full' : 'w-8'}`} />

        {/* User + logout */}
        <div className={`flex flex-col gap-1 ${mobileOpen ? 'w-full' : 'items-center'}`}>
          {user && (
            <div
              className={`group relative flex items-center ${
                mobileOpen ? 'w-full gap-3 px-3 py-2' : 'h-11 w-11 justify-center'
              }`}
            >
              <span className="h-8 w-8 flex-shrink-0 overflow-hidden rounded-full border border-white/15">
                {user.avatarUrl ? (
                  <img
                    src={user.avatarUrl}
                    alt={`${user.name}'s avatar`}
                    className="h-full w-full object-cover"
                  />
                ) : (
                  <span className="flex h-full w-full items-center justify-center bg-discord-accent/20 text-xs font-bold text-white">
                    {user.name.charAt(0).toUpperCase()}
                  </span>
                )}
              </span>
              {mobileOpen ? (
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-sm font-medium text-white">{user.name}</span>
                  <span className="block text-xs capitalize text-discord-textMuted">{userRole}</span>
                </span>
              ) : (
                <span className="pointer-events-none absolute left-full ml-3 z-50 whitespace-nowrap rounded-lg border border-white/10 bg-[#111214] px-2.5 py-1.5 text-xs font-medium text-white opacity-0 shadow-xl transition-all duration-150 -translate-x-1 group-hover:translate-x-0 group-hover:opacity-100">
                  {user.name} · <span className="capitalize text-discord-textMuted">{userRole}</span>
                </span>
              )}
            </div>
          )}

          <RailButton
            icon={LogOut}
            label="Log Out"
            danger
            onClick={() => {
              onLogout();
              setMobileOpen(false);
            }}
          />
        </div>
      </aside>
    </>
  );
};

export default Sidebar;
