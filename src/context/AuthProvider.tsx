/**
 * AuthProvider — single shared auth state for the whole app.
 *
 * Replaces the legacy `useAuth` hook pattern where every consumer created its
 * own state and ran its own bootstrap. Without this, Strict Mode and Expo
 * Router group remounts caused: duplicate session fetches, sign-in spinner
 * sticking, infinite splash loops, and torn-down realtime channels.
 *
 * Module-level state (`lastAuthStateSnapshot`, `authBootstrapPromise`) survives
 * React remounts so a remount during/after sign-in doesn't reset to
 * `initializing: true` and re-run bootstrap.
 */

import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import { Platform } from 'react-native';
import Toast from 'react-native-toast-message';
import { User } from '@supabase/supabase-js';

import {
  supabase,
  signOut as supabaseSignOut,
  resetPassword as supabaseResetPassword,
  fetchUserData,
  clearRoleFetchCache,
  clearUserDataFetchCache,
  isAuthSessionDeadError,
  logDatabaseError,
} from '../lib/supabase';
import {
  setSessionData,
  getSessionData,
  clearSessionData,
  clearAllAppData,
  setupActivityMonitoring,
  initializeStorage,
} from '../lib/storage';
import { generateDeviceFingerprint } from '../utils/deviceFingerprint';
import { withTimeout } from '../utils/asyncUtils';
import {
  UserRole,
  UserProfileRow,
  SessionInvalidationRow,
} from '../types/database';
import {
  canManageUsers,
  canManageContent,
  canViewReports,
  canPerformAdminFunctions,
  hasMinimumRole,
  checkPermission,
  PermissionCategory,
} from '../utils/rolePermissions';

// ── Types ────────────────────────────────────────────────────────────────────
export interface AuthState {
  user: User | null;
  userRole: UserRole | null;
  userProfile: UserProfileRow | null;
  loading: boolean;
  initializing: boolean;
  error: string | null;
}

export type AuthHookReturn = AuthState & {
  isAuthenticated: boolean;
  isAdmin: boolean;
  isManagerOrAdmin: boolean;
  canManageUsers: boolean;
  canManageContent: boolean;
  canViewReports: boolean;
  canPerformAdmin: boolean;
  hasMinimumRole: (min: UserRole) => boolean;
  checkPermission: (category: PermissionCategory) => boolean;
  signIn: (
    email: string,
    password: string,
    rememberMe?: boolean
  ) => Promise<{ success: boolean; error?: string }>;
  signOut: () => Promise<{ success: boolean; error?: string }>;
  resetPassword: (email: string) => Promise<{ success: boolean; error?: string }>;
  refreshProfile: () => Promise<void>;
  clearError: () => void;
};

// ── Module-level state (survives remounts) ───────────────────────────────────
const isWeb = Platform.OS === 'web' || typeof window !== 'undefined';

let activityCleanup: (() => void) | null = null;

/** Single-flight bootstrap — Strict Mode remount must await same promise. */
let authBootstrapPromise: Promise<void> | null = null;

/**
 * Last-known auth state. Survives React remounts so a remount during/after
 * sign-in doesn't reset to `initializing: true` and re-run the entire
 * bootstrap (which would tear down subscriptions, etc.). Cleared by signOut
 * and session expiration.
 */
let lastAuthStateSnapshot: AuthState | null = null;

const INITIAL_STATE: AuthState = {
  user: null,
  userRole: null,
  userProfile: null,
  loading: false,
  initializing: true,
  error: null,
};

// ── Context ──────────────────────────────────────────────────────────────────
// eslint-disable-next-line @typescript-eslint/naming-convention
const AuthContext = createContext<AuthHookReturn | null>(null);

// ── Persistence helpers ──────────────────────────────────────────────────────
async function persistAuthData(
  user: User | null,
  userRole: UserRole | null,
  userProfile: UserProfileRow | null,
  rememberMe?: boolean,
  deviceId?: string
): Promise<void> {
  try {
    if (user && userRole) {
      await setSessionData({ user, userRole, userProfile, rememberMe, deviceId });
      // Defer activity monitoring so it doesn't block initial render
      if (isWeb && !activityCleanup) {
        setTimeout(() => {
          activityCleanup = setupActivityMonitoring();
        }, 0);
      }
    } else {
      await clearSessionData();
    }
  } catch (e) {
    logDatabaseError('persistAuthData', e);
  }
}

async function clearPersistedAuthData(): Promise<void> {
  try {
    await clearAllAppData();
    if (activityCleanup) {
      activityCleanup();
      activityCleanup = null;
    }
  } catch (e) {
    logDatabaseError('clearPersistedAuthData', e);
  }
}

// ── Internal hook (the actual implementation) ────────────────────────────────
function useAuthInternal(): AuthHookReturn {
  const [authState, setAuthState] = useState<AuthState>(
    () => lastAuthStateSnapshot ?? INITIAL_STATE
  );

  // Seed `isComplete` from snapshot so a remount short-circuits the bootstrap.
  const initRef = useRef({
    isComplete: lastAuthStateSnapshot !== null && !lastAuthStateSnapshot.initializing,
  });

  const stateRef = useRef(authState);
  useEffect(() => {
    stateRef.current = authState;
    if (!authState.initializing) {
      lastAuthStateSnapshot = authState;
    }
  }, [authState]);

  // ── Profile refresh ────────────────────────────────────────────────────────
  const refreshProfile = useCallback(async (): Promise<void> => {
    const { user } = stateRef.current;
    if (!user) return;
    setAuthState(prev => ({ ...prev, loading: true }));
    try {
      const data = await fetchUserData(user.id);
      setAuthState(prev => ({
        ...prev,
        userProfile: data?.profile ?? prev.userProfile,
        userRole: data?.role ?? prev.userRole,
        loading: false,
      }));
    } catch (e) {
      logDatabaseError('refreshProfile', e);
      setAuthState(prev => ({ ...prev, loading: false }));
    }
  }, []);

  // ── Sign in ────────────────────────────────────────────────────────────────
  const signIn = useCallback(
    async (
      email: string,
      password: string,
      rememberMe?: boolean
    ): Promise<{ success: boolean; error?: string }> => {
      setAuthState(prev => ({ ...prev, loading: true, error: null }));
      try {
        const { data, error } = await supabase.auth.signInWithPassword({
          email: email.trim().toLowerCase(),
          password,
        });
        if (error) {
          setAuthState(prev => ({ ...prev, loading: false, error: error.message }));
          Toast.show({ type: 'error', text1: 'Sign In Failed', text2: error.message });
          return { success: false, error: error.message };
        }

        const user = data.user;
        let userRole: UserRole = UserRole.Employee;
        let userProfile: UserProfileRow | null = null;

        if (user) {
          try {
            const userData = await withTimeout(fetchUserData(user.id), 5000);
            if (userData) {
              userRole = userData.role;
              userProfile = userData.profile;
            }
          } catch {
            // fall through with defaults
          }

          if (userProfile && !userProfile.active) {
            await supabaseSignOut();
            const msg = 'Your account has been deactivated. Contact an administrator.';
            setAuthState({ ...INITIAL_STATE, initializing: false, error: msg });
            lastAuthStateSnapshot = null;
            Toast.show({ type: 'error', text1: 'Account Deactivated', text2: msg });
            return { success: false, error: msg };
          }

          const deviceId = rememberMe ? generateDeviceFingerprint() ?? undefined : undefined;
          await persistAuthData(user, userRole, userProfile, rememberMe, deviceId);
        }

        setAuthState({
          user,
          userRole,
          userProfile,
          loading: false,
          initializing: false,
          error: null,
        });
        Toast.show({
          type: 'success',
          text1: 'Welcome!',
          text2: `Signed in as ${userProfile?.name ?? email}`,
        });
        return { success: true };
      } catch (e: any) {
        const msg = e?.message ?? 'Unexpected error during sign in';
        setAuthState(prev => ({ ...prev, loading: false, error: msg }));
        Toast.show({ type: 'error', text1: 'Sign In Error', text2: msg });
        return { success: false, error: msg };
      }
    },
    []
  );

  // ── Sign out ───────────────────────────────────────────────────────────────
  const signOut = useCallback(async (): Promise<{ success: boolean; error?: string }> => {
    setAuthState(prev => ({ ...prev, loading: true, error: null }));
    try {
      const { error } = await supabaseSignOut();
      await clearPersistedAuthData();
      clearRoleFetchCache();
      clearUserDataFetchCache();
      lastAuthStateSnapshot = null;

      if (error) {
        setAuthState(prev => ({ ...prev, loading: false, error: error.message }));
        return { success: false, error: error.message };
      }

      setAuthState({ ...INITIAL_STATE, initializing: false });
      Toast.show({ type: 'info', text1: 'Signed Out' });
      return { success: true };
    } catch (e: any) {
      const msg = e?.message ?? 'Unexpected error during sign out';
      setAuthState(prev => ({ ...prev, loading: false, error: msg }));
      return { success: false, error: msg };
    }
  }, []);

  // ── Reset password ─────────────────────────────────────────────────────────
  const resetPassword = useCallback(
    async (email: string): Promise<{ success: boolean; error?: string }> => {
      setAuthState(prev => ({ ...prev, loading: true, error: null }));
      try {
        const { error } = await supabaseResetPassword(email);
        setAuthState(prev => ({ ...prev, loading: false }));
        if (error) {
          Toast.show({ type: 'error', text1: 'Reset Failed', text2: error.message });
          return { success: false, error: error.message };
        }
        Toast.show({ type: 'success', text1: 'Reset Email Sent', text2: `Check ${email}` });
        return { success: true };
      } catch {
        setAuthState(prev => ({ ...prev, loading: false }));
        return { success: false, error: 'Unexpected error' };
      }
    },
    []
  );

  const clearError = useCallback(() => {
    setAuthState(prev => ({ ...prev, error: null }));
  }, []);

  // ── Bootstrap (single-flight, remount-safe) ────────────────────────────────
  useEffect(() => {
    if (initRef.current.isComplete) return;

    let cancelled = false;

    const runBootstrap = async () => {
      // Reuse in-flight promise if a parallel mount started first
      if (!authBootstrapPromise) {
        authBootstrapPromise = (async () => {
          try {
            await initializeStorage();

            const { data: { session }, error } = await supabase.auth.getSession();

            if (error && isAuthSessionDeadError(error)) {
              await clearPersistedAuthData();
              return;
            }
            if (error || !session?.user) return;

            const user = session.user;
            let userRole: UserRole = UserRole.Employee;
            let userProfile: UserProfileRow | null = null;

            try {
              const data = await withTimeout(fetchUserData(user.id), 5000);
              if (data) {
                userRole = data.role;
                userProfile = data.profile;
              }
            } catch (e) {
              if (isAuthSessionDeadError(e)) {
                await clearPersistedAuthData();
                return;
              }
              // Network blip — proceed with defaults; profile refresh will retry
            }

            if (userProfile && !userProfile.active) {
              await supabaseSignOut();
              await clearPersistedAuthData();
              return;
            }

            // Restore device binding from prior session if present
            const stored = await getSessionData();
            await persistAuthData(
              user,
              userRole,
              userProfile,
              stored?.rememberMe,
              stored?.deviceId
            );

            if (!cancelled) {
              lastAuthStateSnapshot = {
                user,
                userRole,
                userProfile,
                loading: false,
                initializing: false,
                error: null,
              };
            }
          } catch (e) {
            logDatabaseError('auth bootstrap', e);
          }
        })();
      }

      try {
        await authBootstrapPromise;
      } finally {
        // Hold the resolved promise so subsequent remounts get a no-op await.
      }

      if (cancelled) return;

      const snapshot = lastAuthStateSnapshot ?? { ...INITIAL_STATE, initializing: false };
      setAuthState(snapshot);
      initRef.current.isComplete = true;
    };

    // Safety net: if bootstrap hangs, unblock the splash after 6s
    const safety = setTimeout(() => {
      if (cancelled || initRef.current.isComplete) return;
      setAuthState(prev => ({ ...prev, initializing: false }));
      initRef.current.isComplete = true;
    }, 6000);

    runBootstrap().finally(() => clearTimeout(safety));

    return () => {
      cancelled = true;
      clearTimeout(safety);
    };
  }, []);

  // ── Auth state change listener (token expiry / external sign-out) ──────────
  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange(async event => {
      if (!initRef.current.isComplete) return;
      if (event === 'SIGNED_OUT' || (event as string) === 'TOKEN_REFRESH_FAILED') {
        await clearPersistedAuthData();
        clearRoleFetchCache();
        clearUserDataFetchCache();
        lastAuthStateSnapshot = null;
        setAuthState({ ...INITIAL_STATE, initializing: false });
        Toast.show({
          type: 'info',
          text1: 'Session Expired',
          text2: 'Please sign in again',
        });
      }
    });
    return () => subscription.unsubscribe();
  }, []);

  // ── Session invalidation listener (admin-forced logout) ────────────────────
  useEffect(() => {
    const userId = authState.user?.id;
    if (!userId) return;

    const channel = supabase
      .channel('session-invalidations')
      .on(
        'postgres_changes' as any,
        {
          event: 'INSERT',
          schema: 'public',
          table: 'session_invalidations',
          filter: `user_id=eq.${userId}`,
        },
        async (payload: any) => {
          const inv = payload.new as SessionInvalidationRow;
          if (inv.user_id !== userId || inv.processed) return;
          try {
            await (supabase.from('session_invalidations') as any)
              .update({ processed: true })
              .eq('id', inv.id);
          } catch {
            // ignore
          }
          await clearPersistedAuthData();
          lastAuthStateSnapshot = null;
          setAuthState({ ...INITIAL_STATE, initializing: false });
          Toast.show({
            type: 'info',
            text1: 'Session Ended',
            text2: inv.reason ?? 'Please sign in again.',
            visibilityTime: 8000,
          });
        }
      )
      .subscribe();

    return () => {
      channel.unsubscribe();
    };
  }, [authState.user?.id]);

  // ── Computed permissions ───────────────────────────────────────────────────
  const computed = useMemo(
    () => ({
      isAuthenticated: !!authState.user,
      isAdmin: authState.userRole === UserRole.Admin,
      isManagerOrAdmin:
        authState.userRole === UserRole.Admin || authState.userRole === UserRole.Manager,
      canManageUsers: canManageUsers(authState.userRole),
      canManageContent: canManageContent(authState.userRole),
      canViewReports: canViewReports(authState.userRole),
      canPerformAdmin: canPerformAdminFunctions(authState.userRole),
      hasMinimumRole: (min: UserRole) => hasMinimumRole(authState.userRole, min),
      checkPermission: (cat: PermissionCategory) =>
        checkPermission(authState.userRole, cat).allowed,
    }),
    [authState.user, authState.userRole]
  );

  return {
    ...authState,
    ...computed,
    signIn,
    signOut,
    resetPassword,
    refreshProfile,
    clearError,
  };
}

// ── Provider + consumer hook ─────────────────────────────────────────────────
export function AuthProvider({ children }: { children: React.ReactNode }): React.JSX.Element {
  const value = useAuthInternal();
  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthHookReturn {
  const ctx = useContext(AuthContext);
  if (!ctx) {
    throw new Error('useAuth must be used inside <AuthProvider>');
  }
  return ctx;
}
