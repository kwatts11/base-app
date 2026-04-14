import { Stack } from 'expo-router';
import React from 'react';

export default function AuthLayout(): React.JSX.Element {
  return (
    <Stack screenOptions={{ headerShown: false }}>
      <Stack.Screen name="login" />
      <Stack.Screen name="forgot-password" />
      <Stack.Screen name="reset-password" />
      <Stack.Screen name="accept-invite" />
      <Stack.Screen name="auth-redirect" />
    </Stack>
  );
}
