import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { onAuthStateChanged, signOut } from 'firebase/auth';
import { auth } from '../../firebaseConfig';
import { StorageService } from '../../services/storageService';
import type { UserPreferences, UserRole } from '../../types';

/** Session-scoped storage key for the guest profile. */
const GUEST_SESSION_KEY = 'procastify_session';

interface SessionContextValue {
  user: UserPreferences | null;
  loading: boolean;
  /** True once auth resolved and no profile exists. */
  isSignedOut: boolean;
  setUser: (user: UserPreferences) => void;
  updateProfile: (patch: Partial<UserPreferences>) => Promise<void>;
  selectRole: (role: UserRole) => Promise<void>;
  continueAsGuest: () => UserPreferences;
  logout: () => Promise<void>;
}

const SessionContext = createContext<SessionContextValue | null>(null);

const deriveName = (email?: string | null) => (email ? email.split('@')[0] : 'User');

const avatarFor = (seed: string) =>
  `https://api.dicebear.com/7.x/notionists/svg?seed=${encodeURIComponent(seed)}`;

/**
 * Owns "who is using the app": Firebase auth, the persisted profile and guest
 * sessions. Everything downstream reads the user from here.
 */
export const SessionProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUserState] = useState<UserPreferences | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
      try {
        if (firebaseUser) {
          const profile = await resolveFirebaseProfile(firebaseUser);
          StorageService.setSession(profile);
          setUserState(profile);
        } else {
          const guest = StorageService.getGuestSession();
          if (guest) {
            StorageService.setSession(guest);
            setUserState(guest);
          } else {
            setUserState(null);
          }
        }
      } catch (error) {
        console.error('[Session] Failed to resolve user:', error);
        setUserState(null);
      } finally {
        setLoading(false);
      }
    });

    return () => unsubscribe();
  }, []);

  const setUser = useCallback((next: UserPreferences) => {
    StorageService.setSession(next);
    setUserState(next);
  }, []);

  const updateProfile = useCallback(
    async (patch: Partial<UserPreferences>) => {
      if (!user) return;
      const next = { ...user, ...patch };
      await StorageService.saveUserProfile(next);
      setUser(next);
    },
    [user, setUser],
  );

  const selectRole = useCallback(
    async (role: UserRole) => {
      await updateProfile({ role });
    },
    [updateProfile],
  );

  const continueAsGuest = useCallback(() => {
    const guest = StorageService.createGuestUser();
    StorageService.saveUserProfile(guest);
    setUser(guest);
    return guest;
  }, [setUser]);

  const logout = useCallback(async () => {
    if (user?.isGuest) {
      localStorage.removeItem(GUEST_SESSION_KEY);
      setUserState(null);
      return;
    }
    await signOut(auth);
  }, [user]);

  const value = useMemo<SessionContextValue>(
    () => ({
      user,
      loading,
      isSignedOut: !loading && !user,
      setUser,
      updateProfile,
      selectRole,
      continueAsGuest,
      logout,
    }),
    [user, loading, setUser, updateProfile, selectRole, continueAsGuest, logout],
  );

  return <SessionContext.Provider value={value}>{children}</SessionContext.Provider>;
};

export function useSession(): SessionContextValue {
  const context = useContext(SessionContext);
  if (!context) throw new Error('useSession must be used inside <SessionProvider>');
  return context;
}

/** Loads the stored profile for a Firebase user, creating/backfilling as needed. */
async function resolveFirebaseProfile(firebaseUser: {
  uid: string;
  email: string | null;
  displayName: string | null;
  photoURL: string | null;
}): Promise<UserPreferences> {
  const existing = await StorageService.getUserProfile(firebaseUser.uid);

  if (!existing) {
    const profile: UserPreferences = {
      id: firebaseUser.uid,
      isGuest: false,
      name: firebaseUser.displayName || deriveName(firebaseUser.email),
      email: firebaseUser.email || undefined,
      avatarUrl:
        firebaseUser.photoURL ||
        avatarFor(firebaseUser.displayName || firebaseUser.email || firebaseUser.uid),
      freeTimeHours: 2,
      energyPeak: 'morning',
      goal: 'Productivity',
      distractionLevel: 'medium',
    };
    await StorageService.saveUserProfile(profile);
    return profile;
  }

  // Backfill fields that older profiles may be missing.
  const patched = { ...existing };
  let needsUpdate = false;

  if (!patched.email && firebaseUser.email) {
    patched.email = firebaseUser.email;
    needsUpdate = true;
  }
  if (!patched.avatarUrl) {
    patched.avatarUrl = firebaseUser.photoURL || avatarFor(patched.name);
    needsUpdate = true;
  }
  if (needsUpdate) await StorageService.saveUserProfile(patched);

  return patched;
}
