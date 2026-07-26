import React from 'react';
import Sidebar from './Sidebar';
import { GuestBanner } from './GuestBanner';
import { useNavigation } from '../providers/NavigationProvider';
import { useSession } from '../providers/SessionProvider';
import type { AppView } from '../../types';

/**
 * Chrome around every signed-in view: the floating rail, the guest banner and
 * the single scroll container pages live in.
 *
 * Pages that manage their own layout (note editor, canvas) use `h-full`; the
 * rest simply scroll inside this container.
 */
export const AppShell: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { user, logout } = useSession();
  const { view, navigate } = useNavigation();

  if (!user) return null;

  return (
    <div className="flex min-h-screen bg-[#151619]">
      <Sidebar
        currentView={view}
        onNavigate={(next: AppView) => navigate(next)}
        onLogout={logout}
        userRole={user.role}
        user={{ name: user.name, avatarUrl: user.avatarUrl }}
      />

      <main className="relative flex h-screen max-h-screen flex-1 flex-col overflow-hidden transition-all duration-300 ease-in-out lg:ml-[92px]">
        {user.isGuest && <GuestBanner onSignUp={() => navigate('auth')} />}
        <div className="min-h-0 flex-1 overflow-y-auto">{children}</div>
      </main>
    </div>
  );
};
