import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import {
  onAuthStateChanged,
  signInWithPopup,
  signOut,
  type User,
} from 'firebase/auth';
import {
  doc,
  getDoc,
  onSnapshot,
  serverTimestamp,
  setDoc,
  updateDoc,
} from 'firebase/firestore';
import {
  auth,
  clampString,
  db,
  googleAuthProvider,
  handleFirestoreError,
  OperationType,
} from '../lib/firebase';
import {
  BaseCurrency,
  DashboardWidgetId,
  GuidanceMode,
  useWorkspaceStore,
  WorkspaceDensity,
  WorkspaceTheme,
} from '../store/useWorkspaceStore';

export interface FirebaseAuthContextValue {
  user: User | null;
  authReady: boolean;
  idToken: string | null;
  signingIn: boolean;
  authError: string | null;
  signInWithGoogle: () => Promise<User | null>;
  signOutUser: () => Promise<void>;
  syncWorkspacePreferencesToCloud: (overrides?: Partial<{
    theme: WorkspaceTheme;
    density: WorkspaceDensity;
    guidanceMode: GuidanceMode;
    baseCurrency: BaseCurrency;
    pinnedWidgets: DashboardWidgetId[];
  }>) => Promise<void>;
}

const FirebaseAuthContext = createContext<FirebaseAuthContextValue | null>(null);

export function FirebaseAuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [authReady, setAuthReady] = useState(false);
  const [idToken, setIdToken] = useState<string | null>(null);
  const [signingIn, setSigningIn] = useState(false);
  const [authError, setAuthError] = useState<string | null>(null);

  const hydrateFromProfile = useWorkspaceStore((s) => s.hydrateFromProfile);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (nextUser) => {
      setUser(nextUser);
      if (nextUser) {
        try {
          const token = await nextUser.getIdToken();
          setIdToken(token);
        } catch {
          setIdToken(null);
        }
      } else {
        setIdToken(null);
      }
      setAuthReady(true);
    });
    return unsubscribe;
  }, []);

  // Attach user profile Firestore listener strictly when authenticated & ready
  useEffect(() => {
    if (!authReady || !user) return;
    const profilePath = `users/${user.uid}`;
    const ref = doc(db, 'users', user.uid);

    let active = true;

    const ensureProfileExists = async () => {
      try {
        const snap = await getDoc(ref);
        if (!active) return;
        if (!snap.exists() && user.emailVerified) {
          const current = useWorkspaceStore.getState();
          await setDoc(ref, {
            ownerId: user.uid,
            displayName: clampString(user.displayName || 'Financia Investor', 100),
            theme: current.theme,
            density: current.density,
            guidanceMode: current.guidanceMode,
            baseCurrency: current.baseCurrency,
            pinnedWidgets: current.pinnedWidgets.slice(0, 12),
            createdAt: serverTimestamp(),
            updatedAt: serverTimestamp(),
          });
        }
      } catch (err) {
        console.warn('[Financia Auth] Profile bootstrap skipped:', err instanceof Error ? err.message : err);
      }
    };

    void ensureProfileExists();

    const unsub = onSnapshot(
      ref,
      (snap) => {
        if (!snap.exists()) return;
        const data = snap.data() as {
          theme?: WorkspaceTheme;
          density?: WorkspaceDensity;
          guidanceMode?: GuidanceMode;
          baseCurrency?: BaseCurrency;
          pinnedWidgets?: string[];
        };
        hydrateFromProfile(data);
      },
      (error) => {
        handleFirestoreError(error, OperationType.GET, profilePath);
      }
    );

    return () => {
      active = false;
      unsub();
    };
  }, [authReady, user, hydrateFromProfile]);

  const signInWithGoogle = useCallback(async () => {
    setSigningIn(true);
    setAuthError(null);
    try {
      const result = await signInWithPopup(auth, googleAuthProvider);
      const token = await result.user.getIdToken();
      setIdToken(token);
      return result.user;
    } catch (err) {
      const message =
        err instanceof Error ? err.message : 'Unable to complete Google Sign-In.';
      setAuthError(message);
      return null;
    } finally {
      setSigningIn(false);
    }
  }, []);

  const signOutUser = useCallback(async () => {
    try {
      await signOut(auth);
      setIdToken(null);
    } catch (err) {
      console.error('Sign out failed:', err);
    }
  }, []);

  const syncWorkspacePreferencesToCloud = useCallback(
    async (
      overrides?: Partial<{
        theme: WorkspaceTheme;
        density: WorkspaceDensity;
        guidanceMode: GuidanceMode;
        baseCurrency: BaseCurrency;
        pinnedWidgets: DashboardWidgetId[];
      }>
    ) => {
      if (!user || !user.emailVerified) return;
      const current = useWorkspaceStore.getState();
      const profilePath = `users/${user.uid}`;
      const ref = doc(db, 'users', user.uid);
      const payload = {
        theme: overrides?.theme ?? current.theme,
        density: overrides?.density ?? current.density,
        guidanceMode: overrides?.guidanceMode ?? current.guidanceMode,
        baseCurrency: overrides?.baseCurrency ?? current.baseCurrency,
        pinnedWidgets: (overrides?.pinnedWidgets ?? current.pinnedWidgets).slice(0, 12),
        updatedAt: serverTimestamp(),
      };

      try {
        await updateDoc(ref, payload);
      } catch (err) {
        try {
          await setDoc(ref, {
            ownerId: user.uid,
            displayName: clampString(user.displayName || 'Financia Investor', 100),
            ...payload,
            createdAt: serverTimestamp(),
          });
        } catch (setErr) {
          handleFirestoreError(setErr ?? err, OperationType.WRITE, profilePath);
        }
      }
    },
    [user]
  );

  const value = useMemo<FirebaseAuthContextValue>(
    () => ({
      user,
      authReady,
      idToken,
      signingIn,
      authError,
      signInWithGoogle,
      signOutUser,
      syncWorkspacePreferencesToCloud,
    }),
    [
      user,
      authReady,
      idToken,
      signingIn,
      authError,
      signInWithGoogle,
      signOutUser,
      syncWorkspacePreferencesToCloud,
    ]
  );

  return <FirebaseAuthContext.Provider value={value}>{children}</FirebaseAuthContext.Provider>;
}

export function useFirebaseAuth(): FirebaseAuthContextValue {
  const ctx = useContext(FirebaseAuthContext);
  if (!ctx) {
    throw new Error('useFirebaseAuth must be used inside FirebaseAuthProvider');
  }
  return ctx;
}
