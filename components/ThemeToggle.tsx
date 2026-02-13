import React from 'react';
import { Sun, Moon } from 'lucide-react';
import { useTheme } from '../contexts/ThemeContext';

interface ThemeToggleProps {
  collapsed?: boolean;
}

export const ThemeToggle: React.FC<ThemeToggleProps> = ({ collapsed = false }) => {
  const { theme, toggleTheme } = useTheme();

  return (
    <button
      onClick={toggleTheme}
      className={`flex items-center ${collapsed ? 'justify-center px-2' : 'gap-3 px-4'} py-3 rounded-xl transition-all duration-300 font-medium group relative overflow-hidden
        text-app-textMuted hover:bg-gradient-to-r hover:from-app-hover hover:to-app-hover/80 hover:text-app-text hover:scale-105
      `}
      title={collapsed ? (theme === 'light' ? 'Switch to Dark Mode' : 'Switch to Light Mode') : undefined}
    >
      {theme === 'light' ? (
        <Moon size={20} className="transition-all duration-300 relative z-10 text-app-textMuted group-hover:text-app-text group-hover:scale-110" />
      ) : (
        <Sun size={20} className="transition-all duration-300 relative z-10 text-app-textMuted group-hover:text-app-text group-hover:scale-110" />
      )}
      {!collapsed && (
        <span className="relative z-10 group-hover:translate-x-1 transition-transform duration-300">
          {theme === 'light' ? 'Dark Mode' : 'Light Mode'}
        </span>
      )}
    </button>
  );
};