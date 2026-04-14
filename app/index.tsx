/**
 * Root index — auth redirect
 * Unauthenticated → /(auth)/login
 * Authenticated → /(tabs)/home
 */
import { useEffect } from 'react';
import { useRouter } from 'expo-router';
import { View, ActivityIndicator, StyleSheet } from 'react-native';
import React from 'react';

import { useAuth } from '../src/hooks/useAuth';
import { useTheme } from '../src/context/ThemeProvider';

export default function IndexScreen(): React.JSX.Element {
  const { user, initializing } = useAuth();
  const { theme } = useTheme();
  const router = useRouter();

  useEffect(() => {
    if (initializing) return;
    if (user) {
      router.replace('/(tabs)/home');
    } else {
      router.replace('/(auth)/login');
    }
  }, [user, initializing, router]);

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
