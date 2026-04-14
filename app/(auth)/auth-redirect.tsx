/**
 * Auth redirect — handles Supabase magic link / recovery URL hash
 * Parses the URL hash and routes to the appropriate screen
 */
import { useEffect } from 'react';
import { View, ActivityIndicator, StyleSheet } from 'react-native';
import { useRouter } from 'expo-router';
import React from 'react';

import { supabase } from '../../src/lib/supabase';
import { useTheme } from '../../src/context/ThemeProvider';

export default function AuthRedirectScreen(): React.JSX.Element {
  const router = useRouter();
  const { theme } = useTheme();

  useEffect(() => {
    const handleRedirect = async () => {
      const { data: { session } } = await supabase.auth.getSession();

      if (!session) {
        router.replace('/(auth)/login');
        return;
      }

      // Check URL for recovery type (password reset)
      if (typeof window !== 'undefined') {
        const hash = window.location.hash;
        if (hash.includes('type=recovery')) {
          router.replace('/(auth)/reset-password');
          return;
        }
        if (hash.includes('type=invite')) {
          router.replace('/(auth)/accept-invite');
          return;
        }
      }

      // Default: authenticated, go to app
      router.replace('/(tabs)/home');
    };

    handleRedirect();
  }, [router]);

  return (
    <View style={[styles.container, { backgroundColor: theme.colors.background }]}>
      <ActivityIndicator size="large" color={theme.colors.primary} />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, justifyContent: 'center', alignItems: 'center' },
});
