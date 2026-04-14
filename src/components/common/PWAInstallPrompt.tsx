/**
 * PWAInstallPrompt — shows browser install-to-home-screen prompt
 * Adapted from brew-events PWA install logic
 */
import React, { useState, useEffect } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Platform } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

import { useTheme } from '../../context/ThemeProvider';
import { APP_CONFIG } from '../../constants/appConfig';

export function PWAInstallPrompt(): React.JSX.Element | null {
  const { theme } = useTheme();
  const [deferredPrompt, setDeferredPrompt] = useState<any>(null);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    if (Platform.OS !== 'web' || typeof window === 'undefined') return;

    // Don't show if already installed
    const isStandalone = window.matchMedia('(display-mode: standalone)').matches ||
      (window.navigator as any).standalone === true;
    if (isStandalone) return;

    // Check if user dismissed before
    const dismissed = localStorage.getItem('pwa_install_dismissed');
    if (dismissed) return;

    const handler = (e: any) => {
      e.preventDefault();
      setDeferredPrompt(e);
      setVisible(true);
    };

    window.addEventListener('beforeinstallprompt', handler);
    return () => window.removeEventListener('beforeinstallprompt', handler);
  }, []);

  if (!visible || !deferredPrompt) return null;

  const handleInstall = async () => {
    deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;
    if (outcome === 'accepted') {
      setVisible(false);
    }
    setDeferredPrompt(null);
  };

  const handleDismiss = () => {
    setVisible(false);
    localStorage.setItem('pwa_install_dismissed', '1');
  };

  return (
    <View style={[styles.banner, { backgroundColor: theme.colors.surface, borderTopColor: theme.colors.border }]}>
      <Ionicons name="phone-portrait-outline" size={20} color={theme.colors.primary} />
      <View style={styles.text}>
        <Text style={[styles.title, { color: theme.colors.text }]}>Install {APP_CONFIG.shortName}</Text>
        <Text style={[styles.subtitle, { color: theme.colors.textSecondary }]}>
          Add to home screen for the best experience
        </Text>
      </View>
      <TouchableOpacity style={[styles.btn, { backgroundColor: theme.colors.primary }]} onPress={handleInstall}>
        <Text style={styles.btnText}>Install</Text>
      </TouchableOpacity>
      <TouchableOpacity onPress={handleDismiss} style={styles.close}>
        <Ionicons name="close" size={18} color={theme.colors.textMuted} />
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  banner: {
    position: 'absolute' as const,
    bottom: 0,
    left: 0,
    right: 0,
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    gap: 10,
    borderTopWidth: StyleSheet.hairlineWidth,
  },
  text: { flex: 1 },
  title: { fontSize: 14, fontWeight: '600' },
  subtitle: { fontSize: 12, marginTop: 2 },
  btn: { borderRadius: 6, paddingHorizontal: 12, paddingVertical: 6 },
  btnText: { color: '#fff', fontSize: 13, fontWeight: '600' },
  close: { padding: 4 },
});
