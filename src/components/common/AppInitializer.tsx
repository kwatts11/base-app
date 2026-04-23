/**
 * AppInitializer — wrapping component that gates rendering until storage init
 * + auth bootstrap complete. Module-level `appInitComplete` survives remounts.
 *
 * Order: storage → auth (delegated to AuthProvider) → validation → ready.
 *
 * Stable refs for auth values prevent the cascade where signing in changed
 * useCallback identities, reset isComplete, and unmounted the entire children
 * tree (which closed realtime channels and showed a post-login spinner).
 */

import React, { useCallback, useEffect, useRef, useState } from 'react';
import { ActivityIndicator, Platform, StyleSheet, Text, View } from 'react-native';

import { useAuth } from '../../hooks/useAuth';
import { useTheme } from '../../context/ThemeProvider';
import { initializeStorage, isSessionValid, clearAllAppData } from '../../lib/storage';

interface Props {
  children: React.ReactNode;
}

const isWeb = Platform.OS === 'web' || typeof window !== 'undefined';

/**
 * Module-level flag — survives React remounts (only resets on full reload).
 * Storage init is idempotent; without this flag a remount shows the splash again.
 */
let appInitComplete = false;

export function AppInitializer({ children }: Props): React.JSX.Element {
  const { theme } = useTheme();
  const { user, loading: authLoading, initializing: authInitializing } = useAuth();

  const [phase, setPhase] = useState<'storage' | 'auth' | 'validation' | 'complete'>(
    () => (appInitComplete ? 'complete' : 'storage')
  );
  const [error, setError] = useState<string | null>(null);

  // Stable refs so callbacks don't re-fire on auth changes
  const userRef = useRef(user);
  const authLoadingRef = useRef(authLoading);
  const authInitializingRef = useRef(authInitializing);
  useEffect(() => {
    userRef.current = user;
    authLoadingRef.current = authLoading;
    authInitializingRef.current = authInitializing;
  });

  const visibilityHandlerRef = useRef<(() => void) | null>(null);

  // ── Storage phase ──────────────────────────────────────────────────────────
  useEffect(() => {
    if (appInitComplete) return;
    let mounted = true;

    (async () => {
      try {
        await initializeStorage();

        if (isWeb && typeof document !== 'undefined') {
          const handleVisibility = () => {
            if (document.visibilityState !== 'visible' || !userRef.current) return;
            void isSessionValid().then(valid => {
              if (!valid) {
                void clearAllAppData();
              }
            });
          };
          if (visibilityHandlerRef.current) {
            document.removeEventListener('visibilitychange', visibilityHandlerRef.current);
          }
          document.addEventListener('visibilitychange', handleVisibility);
          visibilityHandlerRef.current = handleVisibility;
        }

        if (mounted) setPhase('auth');
      } catch (e) {
        if (mounted) setError(e instanceof Error ? e.message : 'Storage init failed');
      }
    })();

    return () => {
      mounted = false;
      if (isWeb && visibilityHandlerRef.current) {
        document.removeEventListener('visibilitychange', visibilityHandlerRef.current);
        visibilityHandlerRef.current = null;
      }
    };
  }, []);

  // ── Auth → validation → complete ───────────────────────────────────────────
  const finish = useCallback(async () => {
    try {
      // Validate persisted session matches a live Supabase token
      if (userRef.current) {
        await isSessionValid();
      }
      appInitComplete = true;
      setPhase('complete');
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Validation failed');
    }
  }, []);

  useEffect(() => {
    // Don't gate on authLoading — sign-in/refresh can flip it true and cause
    // cold-start to hang here forever
    if (!authInitializing && phase === 'auth') {
      void (async () => {
        setPhase('validation');
        await finish();
      })();
    }
  }, [authInitializing, phase, finish]);

  // ── Render ─────────────────────────────────────────────────────────────────
  if (phase !== 'complete') {
    return (
      <View
        style={[styles.container, { backgroundColor: theme.colors.background }]}
      >
        <ActivityIndicator size="large" color={theme.colors.primary} />
        {error && (
          <Text style={[styles.error, { color: theme.colors.error }]}>
            {error}
          </Text>
        )}
      </View>
    );
  }

  return <>{children}</>;
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  error: {
    marginTop: 12,
    fontSize: 13,
    textAlign: 'center',
  },
});
