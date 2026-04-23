/**
 * Root index — auth-aware redirect with session-expired handling.
 */
import { useEffect, useReducer } from 'react';
import { useRouter } from 'expo-router';
import { View, ActivityIndicator, StyleSheet, Platform } from 'react-native';
import Toast from 'react-native-toast-message';
import React from 'react';

import { useAuth } from '../src/hooks/useAuth';
import { useTheme } from '../src/context/ThemeProvider';

const isWeb = Platform.OS === 'web' || typeof window !== 'undefined';

export default function IndexScreen(): React.JSX.Element {
  const { user, initializing, loading } = useAuth();
  const { theme } = useTheme();
  const router = useRouter();
  const [, forceRerender] = useReducer((x: number) => x + 1, 0);

  // Listen for session-expired so we re-render and route back to login
  useEffect(() => {
    if (!isWeb || typeof window === 'undefined') return;
    const handleExpired = (e: Event) => {
      const detail = (e as CustomEvent).detail as { reason?: string } | undefined;
      Toast.show({
        type: 'info',
        text1: 'Session Expired',
        text2: detail?.reason ?? 'Please sign in again',
        visibilityTime: 5000,
      });
      forceRerender();
    };
    window.addEventListener('session-expired', handleExpired);
    return () => window.removeEventListener('session-expired', handleExpired);
  }, []);

  useEffect(() => {
    if (initializing || loading) return;
    const target = user ? '/(tabs)/home' : '/(auth)/login';
    try {
      router.replace(target);
    } catch {
      // Fallback for stale router instances after a remount
      try {
        router.push(target);
      } catch {
        // give up — splash will still be visible
      }
    }
  }, [user, initializing, loading, router]);

  return (
    <View style={[styles.container, { backgroundColor: theme.colors.background }]}>
      <ActivityIndicator size="large" color={theme.colors.primary} />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
});
