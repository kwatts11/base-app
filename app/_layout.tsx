/**
 * Root layout — provider tree + navigation stack + PWA wiring.
 *
 * Order matters: AuthProvider must wrap AppInitializer (which reads auth
 * state). EnumProvider depends on auth (only fetches once authenticated) so
 * it sits inside AppInitializer. SessionManager wraps the rendered tree so
 * its foreground/visibility hooks observe the actual screens.
 */
import { useEffect, useState } from 'react';
import { SplashScreen, Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import Toast from 'react-native-toast-message';
import {
  View,
  ActivityIndicator,
  StyleSheet,
  Text,
  TouchableOpacity,
  Platform,
} from 'react-native';
import { useFonts } from 'expo-font';
import { Ionicons } from '@expo/vector-icons';
import React from 'react';

import { ThemeProvider, useTheme } from '../src/context/ThemeProvider';
import { EnumProvider } from '../src/context/EnumProvider';
import { AuthProvider } from '../src/context/AuthProvider';
import { useAuth } from '../src/hooks/useAuth';
import {
  SessionManager,
  AppInitializer,
  AuthErrorBoundary,
  PWAInstallPrompt,
  PWAUpdateNotification,
  ServiceWorkerRegistration,
} from '../src/components/common';

SplashScreen.preventAutoHideAsync();

const isWeb = Platform.OS === 'web' || typeof window !== 'undefined';

/**
 * Splash with web recovery escape hatch — if init hangs >8s on web, surface
 * a "Reset app" button that wipes localStorage and reloads. Saves the user
 * from a corrupted-token soft-brick without devtools.
 */
function SplashWithRecovery({ message }: { message?: string }): React.JSX.Element {
  const { theme } = useTheme();
  const [showRecovery, setShowRecovery] = useState(false);

  useEffect(() => {
    if (!isWeb) return;
    const t = setTimeout(() => setShowRecovery(true), 8000);
    return () => clearTimeout(t);
  }, []);

  const handleReset = () => {
    if (!isWeb || typeof window === 'undefined') return;
    try {
      window.localStorage.clear();
    } catch {
      // ignore
    }
    window.location.reload();
  };

  return (
    <View style={[styles.loading, { backgroundColor: theme.colors.background }]}>
      <ActivityIndicator size="large" color={theme.colors.primary} />
      {message && (
        <Text style={[styles.message, { color: theme.colors.textSecondary }]}>
          {message}
        </Text>
      )}
      {showRecovery && (
        <TouchableOpacity
          onPress={handleReset}
          style={[styles.resetButton, { borderColor: theme.colors.border }]}
        >
          <Text style={[styles.resetText, { color: theme.colors.text }]}>
            Reset app
          </Text>
        </TouchableOpacity>
      )}
    </View>
  );
}

function RootLayoutInner(): React.JSX.Element {
  const { initializing } = useAuth();
  const [fontsLoaded] = useFonts({ ...Ionicons.font });

  useEffect(() => {
    if (!initializing && fontsLoaded) {
      SplashScreen.hideAsync();
    }
  }, [initializing, fontsLoaded]);

  if (!fontsLoaded) {
    return <SplashWithRecovery message="Loading fonts…" />;
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
        <AuthErrorBoundary>
          <AuthProvider>
            <AppInitializer>
              <EnumProvider>
                <SessionManager>
                  <RootLayoutInner />
                </SessionManager>
              </EnumProvider>
            </AppInitializer>
          </AuthProvider>
        </AuthErrorBoundary>
      </ThemeProvider>
    </SafeAreaProvider>
  );
}

const styles = StyleSheet.create({
  loading: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  message: {
    marginTop: 12,
    fontSize: 13,
  },
  resetButton: {
    marginTop: 24,
    paddingVertical: 10,
    paddingHorizontal: 20,
    borderRadius: 8,
    borderWidth: 1,
  },
  resetText: {
    fontSize: 14,
    fontWeight: '600',
  },
});
