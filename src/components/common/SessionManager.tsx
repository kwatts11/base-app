/**
 * SessionManager — handles tab visibility changes, forces re-validation of session
 * Prevents stale sessions after device sleep or tab backgrounding
 */
import { useEffect } from 'react';
import { Platform } from 'react-native';
import { useRouter } from 'expo-router';
import Toast from 'react-native-toast-message';

import { supabase } from '../../lib/supabase';
import { useAuth } from '../../hooks/useAuth';

export function SessionManager(): null {
  const { user } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (Platform.OS !== 'web' || typeof document === 'undefined') return;

    const handleVisibilityChange = async () => {
      if (document.visibilityState !== 'visible') return;
      if (!user) return;

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
        }
      } catch {
        // Network error — allow user to continue, Supabase will handle refresh
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    return () => document.removeEventListener('visibilitychange', handleVisibilityChange);
  }, [user, router]);

  return null;
}
