/**
 * PWAUpdateNotification — notifies user when a new app version is available
 * Works with the service worker update lifecycle described in docs/PWA_UPDATE_SYSTEM.md
 */
import React, { useState, useEffect } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Platform } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

import { useTheme } from '../../context/ThemeProvider';

export function PWAUpdateNotification(): React.JSX.Element | null {
  const { theme } = useTheme();
  const [updateAvailable, setUpdateAvailable] = useState(false);
  const [registration, setRegistration] = useState<ServiceWorkerRegistration | null>(null);

  useEffect(() => {
    if (Platform.OS !== 'web' || typeof window === 'undefined' || !('serviceWorker' in navigator)) return;

    navigator.serviceWorker.ready.then(reg => {
      setRegistration(reg);

      // Listen for waiting service worker
      if (reg.waiting) {
        setUpdateAvailable(true);
      }

      reg.addEventListener('updatefound', () => {
        const newWorker = reg.installing;
        if (!newWorker) return;
        newWorker.addEventListener('statechange', () => {
          if (newWorker.state === 'installed' && navigator.serviceWorker.controller) {
            setUpdateAvailable(true);
          }
        });
      });
    });

    // Detect controller change (new SW activated) → reload
    let refreshing = false;
    navigator.serviceWorker.addEventListener('controllerchange', () => {
      if (!refreshing) {
        refreshing = true;
        window.location.reload();
      }
    });
  }, []);

  const handleUpdate = () => {
    if (registration?.waiting) {
      registration.waiting.postMessage({ type: 'SKIP_WAITING' });
    }
    setUpdateAvailable(false);
  };

  if (!updateAvailable) return null;

  return (
    <View style={[styles.banner, { backgroundColor: theme.colors.primary }]}>
      <Ionicons name="refresh-circle-outline" size={20} color="#fff" />
      <Text style={styles.text}>A new version is available</Text>
      <TouchableOpacity style={styles.btn} onPress={handleUpdate}>
        <Text style={styles.btnText}>Update</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  banner: {
    position: 'absolute' as const,
    top: 0,
    left: 0,
    right: 0,
    flexDirection: 'row',
    alignItems: 'center',
    padding: 10,
    gap: 8,
    zIndex: 9998,
  },
  text: { flex: 1, color: '#fff', fontSize: 13, fontWeight: '500' },
  btn: { backgroundColor: 'rgba(255,255,255,0.25)', borderRadius: 6, paddingHorizontal: 10, paddingVertical: 5 },
  btnText: { color: '#fff', fontSize: 13, fontWeight: '700' },
});
