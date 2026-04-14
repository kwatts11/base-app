/**
 * Authentication hook — session management, role resolution, login/logout
 * Adapted from brew-events with app-specific logic removed
 */
import { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import Toast from 'react-native-toast-message';
import { User } from '@supabase/supabase-js';

import {
  supabase,
  signIn as supabaseSignIn,
  signOut as supabaseSignOut,
  resetPassword as supabaseResetPassword,
  fetchUserData,
  getCurrentUser,
  getCurrentUserRole,
  clearRoleFetchCache,
  clearUserDataFetchCache,
  logDatabaseError,
} from '../lib/supabase';
import { UserRole, UserProfileRow, SessionInvalidationRow } from '../types/database';
import {
  checkPermission,
  hasMinimumRole,
  canManageUsers,
  canManageContent,
  canViewReports,
  canPerformAdminFunctions,
  PermissionCategory,
} from '../utils/rolePermissions';

// ── Types ─────────────────────────────────────────────────────────────────────
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
  signIn: (email: string, password: string) => Promise<{ success: boolean; error?: string }>;
  signOut: () => Promise<{ success: boolean; error?: string }>;
  resetPassword: (email: string) => Promise<{ success: boolean; error?: string }>;
  refreshProfile: () => Promise<void>;
  clearError: () => void;
};

// ── Hook ──────────────────────────────────────────────────────────────────────
export function useAuth(): AuthHookReturn {
  const [state, setState] = useState<AuthState>({
    user: null,
    userRole: null,
    userProfile: null,
    loading: false,
    initializing: true,
    error: null,
  });

  const initRef = useRef({ started: false, done: false });
  const stateRef = useRef(state);
  useEffect(() => { stateRef.current = state; }, [state]);

  // ── Profile refresh ─────────────────────────────────────────────────────────
  const refreshProfile = useCallback(async (): Promise<void> => {
    const user = getCurrentUser();
    if (!user) return;
    setState(prev => ({ ...prev, loading: true }));
    try {
      const userData = await fetchUserData(user.id);
      setState(prev => ({
        ...prev,
        userProfile: userData?.profile ?? null,
        userRole: userData?.role ?? null,
        loading: false,
      }));
    } catch (e) {
      logDatabaseError('Refresh profile', e);
      setState(prev => ({ ...prev, loading: false }));
    }
  }, []);

  // ── Sign in ────────────────────────────────────────────────────────────────
  const signIn = useCallback(async (
    email: string,
    password: string
  ): Promise<{ success: boolean; error?: string }> => {
    setState(prev => ({ ...prev, loading: true, error: null }));
    try {
      const { data, error } = await supabase.auth.signInWithPassword({ email, password });
      if (error) {
        setState(prev => ({ ...prev, loading: false, error: error.message }));
        Toast.show({ type: 'error', text1: 'Sign In Failed', text2: error.message });
        return { success: false, error: error.message };
      }

      const user = data.user;
      let userRole: UserRole = UserRole.Employee;
      let userProfile: UserProfileRow | null = null;

      if (user) {
        try {
          const userData = await Promise.race([
            fetchUserData(user.id),
            new Promise<null>((_, reject) => setTimeout(() => reject(new Error('timeout')), 5000)),
          ]);
          if (userData) {
            userRole = userData.role;
            userProfile = userData.profile;
          }
        } catch {
          userRole = UserRole.Employee;
        }

        if (userProfile && !userProfile.active) {
          await supabaseSignOut();
          const msg = 'Your account has been deactivated. Contact an administrator.';
          setState(prev => ({ ...prev, user: null, userRole: null, userProfile: null, loading: false, error: msg }));
          Toast.show({ type: 'error', text1: 'Account Deactivated', text2: msg });
          return { success: false, error: msg };
        }
      }

      setState(prev => ({ ...prev, user, userRole, userProfile, loading: false, error: null }));
      Toast.show({ type: 'success', text1: 'Welcome!', text2: `Signed in as ${userProfile?.name ?? email}` });
      return { success: true };
    } catch (e: any) {
      const msg = e.message ?? 'Unexpected error during sign in';
      setState(prev => ({ ...prev, loading: false, error: msg }));
      Toast.show({ type: 'error', text1: 'Sign In Error', text2: msg });
      return { success: false, error: msg };
    }
  }, []);

  // ── Sign out ───────────────────────────────────────────────────────────────
  const signOut = useCallback(async (): Promise<{ success: boolean; error?: string }> => {
    setState(prev => ({ ...prev, loading: true, error: null }));
    try {
      const { error } = await supabaseSignOut();
      if (error) {
        setState(prev => ({ ...prev, loading: false, error: error.message }));
        return { success: false, error: error.message };
      }
      setState({ user: null, userRole: null, userProfile: null, loading: false, initializing: false, error: null });
      clearRoleFetchCache();
      clearUserDataFetchCache();
      Toast.show({ type: 'info', text1: 'Signed Out' });
      return { success: true };
    } catch (e: any) {
      const msg = 'Unexpected error during sign out';
      setState(prev => ({ ...prev, loading: false, error: msg }));
      return { success: false, error: msg };
    }
  }, []);

  // ── Reset password ─────────────────────────────────────────────────────────
  const resetPassword = useCallback(async (
    email: string
  ): Promise<{ success: boolean; error?: string }> => {
    setState(prev => ({ ...prev, loading: true, error: null }));
    try {
      const { error } = await supabaseResetPassword(email);
      setState(prev => ({ ...prev, loading: false }));
      if (error) {
        Toast.show({ type: 'error', text1: 'Reset Failed', text2: error.message });
        return { success: false, error: error.message };
      }
      Toast.show({ type: 'success', text1: 'Reset Email Sent', text2: `Check ${email}` });
      return { success: true };
    } catch (e: any) {
      setState(prev => ({ ...prev, loading: false }));
      return { success: false, error: 'Unexpected error' };
    }
  }, []);

  const clearError = useCallback(() => {
    setState(prev => ({ ...prev, error: null }));
  }, []);

  // ── Initialization ─────────────────────────────────────────────────────────
  useEffect(() => {
    if (initRef.current.started) return;
    initRef.current.started = true;

    const safetyTimer = setTimeout(() => {
      if (!initRef.current.done) {
        setState(prev => ({ ...prev, loading: false, initializing: false }));
        initRef.current.done = true;
      }
    }, 6000);

    const init = async () => {
      try {
        const { data: { session }, error } = await supabase.auth.getSession();
        if (error || !session?.user) {
          setState(prev => ({ ...prev, loading: false, initializing: false }));
          initRef.current.done = true;
          return;
        }

        const user = session.user;
        let userRole: UserRole = UserRole.Employee;
        let userProfile: UserProfileRow | null = null;

        try {
          const userData = await fetchUserData(user.id);
          if (userData) {
            userRole = userData.role;
            userProfile = userData.profile;
          }
        } catch { /* use defaults */ }

        if (userProfile && !userProfile.active) {
          await supabaseSignOut();
          setState({ user: null, userRole: null, userProfile: null, loading: false, initializing: false, error: 'Account deactivated.' });
          initRef.current.done = true;
          return;
        }

        setState({ user, userRole, userProfile, loading: false, initializing: false, error: null });
        initRef.current.done = true;
      } catch {
        setState(prev => ({ ...prev, loading: false, initializing: false }));
        initRef.current.done = true;
      } finally {
        clearTimeout(safetyTimer);
      }
    };

    init();
    return () => clearTimeout(safetyTimer);
  }, []);

  // ── Auth state change listener (handles background token expiry) ──────────
  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event) => {
      if (!initRef.current.done) return;
      if (event === 'SIGNED_OUT' || (event as string) === 'TOKEN_REFRESH_FAILED') {
        setState({ user: null, userRole: null, userProfile: null, loading: false, initializing: false, error: null });
        Toast.show({ type: 'info', text1: 'Session Expired', text2: 'Please sign in again' });
      }
    });
    return () => subscription.unsubscribe();
  }, []);

  // ── Session invalidation listener ──────────────────────────────────────────
  useEffect(() => {
    if (!state.user) return;
    const channel = supabase
      .channel('session-invalidations')
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'session_invalidations', filter: `user_id=eq.${state.user.id}` },
        async (payload) => {
          const inv = payload.new as SessionInvalidationRow;
          if (inv.user_id === state.user?.id && !inv.processed) {
            // Mark processed
            try {
              await supabase.from('session_invalidations').update({ processed: true }).eq('id', inv.id);
            } catch { /* ignore */ }
            // Force logout
            setState({ user: null, userRole: null, userProfile: null, loading: false, initializing: false, error: null });
            Toast.show({ type: 'info', text1: 'Session Ended', text2: inv.reason ?? 'Please sign in again.', visibilityTime: 8000 });
          }
        }
      )
      .subscribe();

    return () => { channel.unsubscribe(); };
  }, [state.user?.id]);

  // ── Computed values ────────────────────────────────────────────────────────
  const computed = useMemo(() => ({
    isAuthenticated: !!state.user,
    isAdmin: state.userRole === UserRole.Admin,
    isManagerOrAdmin: state.userRole === UserRole.Admin || state.userRole === UserRole.Manager,
    canManageUsers: canManageUsers(state.userRole),
    canManageContent: canManageContent(state.userRole),
    canViewReports: canViewReports(state.userRole),
    canPerformAdmin: canPerformAdminFunctions(state.userRole),
    hasMinimumRole: (min: UserRole) => hasMinimumRole(state.userRole, min),
    checkPermission: (cat: PermissionCategory) => checkPermission(state.userRole, cat).allowed,
  }), [state.user, state.userRole]);

  return {
    ...state,
    ...computed,
    signIn,
    signOut,
    resetPassword,
    refreshProfile,
    clearError,
  };
}
