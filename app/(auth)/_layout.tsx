import { Stack } from 'expo-router';
import React from 'react';

import { useTheme } from '../../src/context/ThemeProvider';

export default function AuthLayout(): React.JSX.Element {
  const { theme } = useTheme();
  return (
    <Stack
      screenOptions={{
        headerShown: false,
        contentStyle: { backgroundColor: theme.colors.background },
      }}
    >
      <Stack.Screen name="login" />
      <Stack.Screen name="forgot-password" />
      <Stack.Screen name="reset-password" />
      <Stack.Screen name="accept-invite" />
      <Stack.Screen name="auth-redirect" />
    </Stack>
  );
}
