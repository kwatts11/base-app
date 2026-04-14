/**
 * Root layout — providers, navigation stack, PWA wiring
 */
import { useEffect } from 'react';
import { SplashScreen, Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import Toast from 'react-native-toast-message';
import { View, ActivityIndicator, StyleSheet } from 'react-native';
import { useFonts } from 'expo-font';
import { Ionicons } from '@expo/vector-icons';
import React from 'react';

import { ThemeProvider, useTheme } from '../src/context/ThemeProvider';
import { EnumProvider } from '../src/context/EnumProvider';
import { useAuth } from '../src/hooks/useAuth';
import {
  SessionManager,
  AppInitializer,
  PWAInstallPrompt,
  PWAUpdateNotification,
  ServiceWorkerRegistration,
} from '../src/components/common';

SplashScreen.preventAutoHideAsync();

function LoadingScreen(): React.JSX.Element {
  const { theme } = useTheme();
  return (
    <View style={[styles.loading, { backgroundColor: theme.colors.background }]}>
      <ActivityIndicator size="large" color={theme.colors.primary} />
    </View>
  );
}

function RootLayoutInner(): React.JSX.Element {
  const { theme } = useTheme();
  const { initializing } = useAuth();

  const [fontsLoaded] = useFonts({ ...Ionicons.font });

  useEffect(() => {
    if (!initializing && fontsLoaded) {
      SplashScreen.hideAsync();
    }
  }, [initializing, fontsLoaded]);

  if (initializing || !fontsLoaded) {
    return <LoadingScreen />;
  }

  return (
    <>
      <StatusBar style="light" />
      <Stack screenOptions={{ headerShown: false }}>
        <Stack.Screen name="index" />
        <Stack.Screen name="(auth)" />
        <Stack.Screen name="(tabs)" />
        <Stack.Screen
          name="(modal)"
          options={{ presentation: 'modal', animation: 'slide_from_bottom' }}
        />
      </Stack>
      <Toast />
      <SessionManager />
      <AppInitializer />
      <PWAInstallPrompt />
      <PWAUpdateNotification />
      <ServiceWorkerRegistration />
    </>
  );
}

export default function RootLayout(): React.JSX.Element {
  return (
    <SafeAreaProvider>
      <ThemeProvider>
        <EnumProvider>
          <RootLayoutInner />
        </EnumProvider>
      </ThemeProvider>
    </SafeAreaProvider>
  );
}

const styles = StyleSheet.create({
  loading: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
});
