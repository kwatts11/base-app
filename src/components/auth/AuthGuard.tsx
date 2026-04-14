/**
 * AuthGuard — redirects unauthenticated users to login
 */
import React, { useEffect } from 'react';
import { View, ActivityIndicator, StyleSheet } from 'react-native';
import { useRouter } from 'expo-router';

import { useAuth } from '../../hooks/useAuth';
import { useTheme } from '../../context/ThemeProvider';

interface Props {
  children: React.ReactNode;
}

export function AuthGuard({ children }: Props): React.JSX.Element {
  const { user, initializing } = useAuth();
  const { theme } = useTheme();
  const router = useRouter();

  useEffect(() => {
    if (!initializing && !user) {
      router.replace('/(auth)/login');
    }
  }, [user, initializing, router]);

  if (initializing) {
    return (
      <View style={[styles.center, { backgroundColor: theme.colors.background }]}>
        <ActivityIndicator size="large" color={theme.colors.primary} />
      </View>
    );
  }

  if (!user) return <View style={{ flex: 1 }} />;

  return <>{children}</>;
}

const styles = StyleSheet.create({
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
});
