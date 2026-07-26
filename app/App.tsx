import React, { useCallback, useEffect, useState } from 'react';
import Landing from '../features/auth/LandingPage';
import Auth from '../features/auth/AuthPage';
import RoleSelection from '../features/auth/RoleSelectionPage';
import { LoadingScreen } from '../components/ui';
import { StorageService } from '../services/storageService';
import { ActivityTracker } from '../services/activityTracker';
import { AppProviders, useSession, useWorkspace } from './providers';
import { NavigationProvider, useNavigation } from './providers/NavigationProvider';
import { AppShell } from './components/AppShell';
import { AppRouter, FocusRoute } from './AppRouter';
import { getHomeView } from './navigation/navItems';
import { useStudyTracking } from './hooks/useStudyTracking';
import type { AppView, UserRole } from '../types';

/**
 * Root component. Responsibilities are split across:
 *  - providers/  : session, workspace data, toasts
 *  - AppShell    : sidebar + layout chrome
 *  - AppRouter   : which screen renders and with what props
 */
const App: React.FC = () => (
  <AppProviders>
    <AppEntry />
  </AppProviders>
);

/** Chooses between the pre-login screens and the authenticated app. */
const AppEntry: React.FC = () => {
  const { user, loading, selectRole, continueAsGuest } = useSession();
  const [preAuthView, setPreAuthView] = useState<'landing' | 'auth'>('landing');

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[#151619]">
        <LoadingScreen label="Loading Procastify…" />
      </div>
    );
  }

  if (!user) {
    if (preAuthView === 'auth') {
      return (
        <Auth
          onLoginSuccess={() => setPreAuthView('landing')}
          onGuestAccess={() => {
            continueAsGuest();
            setPreAuthView('landing');
          }}
          onBack={() => setPreAuthView('landing')}
        />
      );
    }

    return (
      <Landing onLogin={() => setPreAuthView('auth')} onGuestAccess={continueAsGuest} />
    );
  }

  if (!user.role && !user.isGuest) {
    return <RoleSelection onRoleSelected={(role: UserRole) => void selectRole(role)} />;
  }

  return (
    <NavigationProvider initialView={getHomeView(user.role)}>
      <AuthenticatedApp />
    </NavigationProvider>
  );
};

/** The signed-in experience: shell, routing and session-wide side effects. */
const AuthenticatedApp: React.FC = () => {
  const { user } = useSession();
  const { refreshStats } = useWorkspace();
  const { view, navigate } = useNavigation();
  const [showAuth, setShowAuth] = useState(false);

  useStudyTracking(user?.id, view, refreshStats);

  // Keep the dashboard's numbers current when the user lands on it.
  useEffect(() => {
    if (view !== 'dashboard') return;
    void ActivityTracker.flushNow().then(refreshStats);
  }, [view, refreshStats]);

  const handleFocusExit = useCallback(
    (minutesSpent: number) => {
      if (minutesSpent > 0) {
        void StorageService.logStudyTime(minutesSpent).then(refreshStats);
      }
      navigate('routine');
    },
    [navigate, refreshStats],
  );

  // Guests can open the sign-up screen from the banner without losing the app.
  useEffect(() => {
    if (view === 'auth') setShowAuth(true);
  }, [view]);

  if (showAuth) {
    return (
      <Auth
        onLoginSuccess={() => {
          setShowAuth(false);
          navigate(getHomeView(user?.role) as AppView);
        }}
        onGuestAccess={() => setShowAuth(false)}
        onBack={() => {
          setShowAuth(false);
          navigate(getHomeView(user?.role) as AppView);
        }}
      />
    );
  }

  if (view === 'focus') {
    return <FocusRoute onExit={handleFocusExit} />;
  }

  return (
    <AppShell>
      <AppRouter />
    </AppShell>
  );
};

export default App;
