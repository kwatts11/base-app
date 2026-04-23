/**
 * SplashScreen — themed full-screen spinner. Shared by AppInitializer and
 * any auth-gated screen that needs a loading state during transitions.
 */
import React from 'react';
import { ActivityIndicator, StyleSheet, Text, View } from 'react-native';

import { useTheme } from '../../context/ThemeProvider';

interface Props {
  message?: string;
}

export function SplashScreen({ message }: Props): React.JSX.Element {
  const { theme } = useTheme();
  return (
    <View style={[styles.container, { backgroundColor: theme.colors.background }]}>
      <ActivityIndicator size="large" color={theme.colors.primary} />
      {message && (
        <Text style={[styles.message, { color: theme.colors.textSecondary }]}>
          {message}
        </Text>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  message: {
    marginTop: 12,
    fontSize: 13,
    textAlign: 'center',
  },
});
