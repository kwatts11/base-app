/**
 * ServiceWorkerRegistration — registers the PWA service worker on web
 */
import { useEffect } from 'react';
import { Platform } from 'react-native';

export function ServiceWorkerRegistration(): null {
  useEffect(() => {
    if (Platform.OS !== 'web' || typeof window === 'undefined' || !('serviceWorker' in navigator)) {
      return;
    }

    window.addEventListener('load', () => {
      navigator.serviceWorker
        .register('/sw.js', { scope: '/' })
        .then(reg => {
          console.log('[SW] Registered:', reg.scope);
          reg.update();
        })
        .catch(err => {
          console.warn('[SW] Registration failed:', err);
        });
    });
  }, []);

  return null;
}
