/**
 * SessionManager — wrapping component that tracks session activity and
 * surfaces foreground/visibility events for app-specific data refresh.
 *
 * Generic — does NOT couple to events/food-trucks/enums. Apps that need to
 * refetch on foreground subscribe to the `app-foreground` window event.
 */

import React, { useEffect, useRef } from 'react';
import { AppState, AppStateStatus, Platform } from 'react-native';
import { useRouter } from 'expo-router';
import Toast from 'react-native-toast-message';

import { useAuth } from '../../hooks/useAuth';
import { supabase } from '../../lib/supabase';
import { updateLastActivity } from '../../lib/storage';

interface Props {
  children: React.ReactNode;
}

const isWeb = Platform.OS === 'web' || typeof window !== 'undefined';

const STORAGE_EVENT_DEBOUNCE = 1000;

export function SessionManager({ children }: Props): React.JSX.Element {
  const { user } = useAuth();
  const router = useRouter();
  const userRef = useRef(user);
  useEffect(() => {
    userRef.current = user;
  });

  // ── Web visibility change → re-check session, dispatch foreground event ──
  useEffect(() => {
    if (!isWeb || typeof document === 'undefined') return;

    const handleVisibility = async () => {
      if (document.visibilityState !== 'visible' || !userRef.current) return;
      try {
        const { data: { session } } = await supabase.auth.getSession();
        if (!session) {
          Toast.show({
            type: 'info',
            text1: 'Session Expired',
            text2: 'Please sign in again',
            visibilityTime: 5000,
          });
          router.replace('/(auth)/login');
          return;
        }
        void updateLastActivity();
        window.dispatchEvent(new CustomEvent('app-foreground'));
      } catch {
        // Network blip — let supabase auto-refresh handle it
      }
    };

    document.addEventListener('visibilitychange', handleVisibility);
    return () => document.removeEventListener('visibilitychange', handleVisibility);
  }, [router]);

  // ── Native AppState foreground → dispatch event ────────────────────────────
  useEffect(() => {
    let previous: AppStateStatus = AppState.currentState;
    const sub = AppState.addEventListener('change', next => {
      if (next === 'active' && previous.match(/inactive|background/)) {
        void updateLastActivity();
        if (isWeb && typeof window !== 'undefined') {
          window.dispatchEvent(new CustomEvent('app-foreground'));
        }
      }
      previous = next;
    });
    return () => sub.remove();
  }, []);

  // ── Multi-tab storage events (web) → dispatch foreground event ─────────────
  useEffect(() => {
    if (!isWeb || typeof window === 'undefined') return;
    let timeout: ReturnType<typeof setTimeout> | null = null;

    const handleStorage = (e: StorageEvent) => {
      // Ignore our own session/activity writes — they'd cause a loop
      if (!userRef.current) return;
      if (!e.key || e.key.includes('last_activity') || e.key.includes('user_session')) {
        return;
      }
      if (timeout) clearTimeout(timeout);
      timeout = setTimeout(() => {
        window.dispatchEvent(new CustomEvent('app-foreground'));
      }, STORAGE_EVENT_DEBOUNCE);
    };

    window.addEventListener('storage', handleStorage);
    return () => {
      window.removeEventListener('storage', handleStorage);
      if (timeout) clearTimeout(timeout);
    };
  }, []);

  return <>{children}</>;
}
