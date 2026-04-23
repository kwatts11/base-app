/**
 * Cross-platform storage — session persistence with optional Remember Me extended sessions.
 *
 * Platform: web → localStorage, native → AsyncStorage. No encryption (Supabase
 * handles token security; this layer only stores session metadata + cache).
 *
 * Session model: 24h normal, 30d when rememberMe is set. Activity tracking is
 * for analytics only — it does NOT invalidate sessions. Supabase manages token
 * refresh; this layer just adds an upper bound and device binding.
 */

import { Platform } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import type { User } from '@supabase/supabase-js';

import { UserRole, UserProfileRow } from '../types/database';
import { validateDeviceFingerprint } from '../utils/deviceFingerprint';

// ── Constants ────────────────────────────────────────────────────────────────
const KEY_PREFIX = '@BaseApp:';

export const STORAGE_KEYS = {
  USER_SESSION: `${KEY_PREFIX}user_session`,
  LAST_ACTIVITY: `${KEY_PREFIX}last_activity`,
  CACHE_TIMESTAMP: `${KEY_PREFIX}cache_timestamp`,
} as const;

const SESSION_CONFIG = {
  /** 24 hours — upper bound on a normal session. */
  SESSION_TIMEOUT: 24 * 60 * 60 * 1000,
  /** 30 days — upper bound when rememberMe is set. */
  EXTENDED_SESSION_TIMEOUT: 30 * 24 * 60 * 60 * 1000,
  CACHE_TIMEOUT: 5 * 60 * 1000,
  /** Periodic session validity check (web only). */
  ACTIVITY_CHECK_INTERVAL: 60 * 1000,
} as const;

// ── Types ────────────────────────────────────────────────────────────────────
export interface SessionData {
  user: User;
  userRole: UserRole | null;
  userProfile: UserProfileRow | null;
  expiresAt: number;
  lastActivity: number;
  rememberMe?: boolean;
  deviceId?: string;
  sessionExtended?: boolean;
}

interface StorageItem<T> {
  value: T;
  timestamp: number;
  expiresAt?: number;
}

interface CacheItem<T> {
  data: T;
  timestamp: number;
  expiresAt: number;
}

// ── Platform-agnostic storage ────────────────────────────────────────────────
const isWeb = (): boolean =>
  Platform.OS === 'web' && typeof window !== 'undefined';

const storage = {
  async getItem(key: string): Promise<string | null> {
    if (isWeb()) {
      try {
        return window.localStorage.getItem(key);
      } catch {
        return null;
      }
    }
    return AsyncStorage.getItem(key);
  },
  async setItem(key: string, value: string): Promise<void> {
    if (isWeb()) {
      try {
        window.localStorage.setItem(key, value);
      } catch (e) {
        console.warn('storage.setItem failed:', e);
      }
      return;
    }
    return AsyncStorage.setItem(key, value);
  },
  async removeItem(key: string): Promise<void> {
    if (isWeb()) {
      try {
        window.localStorage.removeItem(key);
      } catch {
        // ignore
      }
      return;
    }
    return AsyncStorage.removeItem(key);
  },
};

// ── Generic item helpers ─────────────────────────────────────────────────────
async function setItem<T>(
  key: string,
  value: T,
  expiresIn?: number
): Promise<void> {
  const item: StorageItem<T> = {
    value,
    timestamp: Date.now(),
    expiresAt: expiresIn ? Date.now() + expiresIn : undefined,
  };
  try {
    await storage.setItem(key, JSON.stringify(item));
  } catch (e) {
    console.warn(`Failed to write ${key}:`, e);
  }
}

async function getItem<T>(key: string): Promise<T | null> {
  try {
    const raw = await storage.getItem(key);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as StorageItem<T>;
    if (parsed.expiresAt && Date.now() > parsed.expiresAt) {
      await storage.removeItem(key);
      return null;
    }
    return parsed.value;
  } catch {
    return null;
  }
}

async function removeItem(key: string): Promise<void> {
  await storage.removeItem(key);
}

// ── Session management ───────────────────────────────────────────────────────
export async function setSessionData(
  data: Omit<SessionData, 'expiresAt' | 'lastActivity' | 'sessionExtended'>
): Promise<void> {
  const now = Date.now();
  const timeout = data.rememberMe
    ? SESSION_CONFIG.EXTENDED_SESSION_TIMEOUT
    : SESSION_CONFIG.SESSION_TIMEOUT;

  const full: SessionData = {
    ...data,
    expiresAt: now + timeout,
    lastActivity: now,
    sessionExtended: data.rememberMe ?? false,
  };

  await Promise.all([
    setItem(STORAGE_KEYS.USER_SESSION, full, timeout),
    setItem(STORAGE_KEYS.LAST_ACTIVITY, now),
  ]);
}

export async function getSessionData(): Promise<SessionData | null> {
  const session = await getItem<SessionData>(STORAGE_KEYS.USER_SESSION);
  if (!session) return null;
  if (Date.now() > session.expiresAt) {
    await clearSessionData();
    return null;
  }
  return session;
}

export async function updateLastActivity(): Promise<void> {
  const session = await getSessionData();
  if (!session) return;
  session.lastActivity = Date.now();
  await setItem(STORAGE_KEYS.USER_SESSION, session, session.expiresAt - Date.now());
  await setItem(STORAGE_KEYS.LAST_ACTIVITY, Date.now());
}

export async function clearSessionData(): Promise<void> {
  clearSessionValidationCache();
  await Promise.all([
    removeItem(STORAGE_KEYS.USER_SESSION),
    removeItem(STORAGE_KEYS.LAST_ACTIVITY),
  ]);
}

// ── Session validation (cached) ──────────────────────────────────────────────
let sessionValidationCache: {
  isValid: boolean;
  timestamp: number;
  userId: string | null;
} | null = null;
const SESSION_VALIDATION_CACHE_TTL = 30000;

export function clearSessionValidationCache(): void {
  sessionValidationCache = null;
}

/**
 * Validates session against local storage + Supabase + (optional) device fingerprint.
 * Cached for 30s to avoid hammering Supabase during activity spikes.
 */
export async function isSessionValid(): Promise<boolean> {
  try {
    const session = await getSessionData();
    if (!session) {
      clearSessionValidationCache();
      return false;
    }

    if (session.deviceId) {
      const validation = validateDeviceFingerprint(session.deviceId);
      if (!validation.isValid) {
        if (typeof window !== 'undefined') {
          window.dispatchEvent(
            new CustomEvent('session-security-warning', {
              detail: {
                reason: 'Device fingerprint mismatch',
                mismatches: validation.mismatches,
              },
            })
          );
        }
        await clearSessionData();
        return false;
      }
      // Legacy match: AuthProvider will re-persist with current format on next save.
    }

    const userId = session.user?.id ?? null;
    if (
      sessionValidationCache &&
      sessionValidationCache.userId === userId &&
      Date.now() - sessionValidationCache.timestamp < SESSION_VALIDATION_CACHE_TTL
    ) {
      return sessionValidationCache.isValid;
    }

    // Dynamic import avoids circular dep with supabase.ts
    const { supabase } = await import('./supabase');
    const { data: { session: sbSession }, error } = await supabase.auth.getSession();

    if (error || !sbSession) {
      if (typeof window !== 'undefined') {
        const reason = session.rememberMe
          ? 'Your 30-day session has expired. Please sign in again.'
          : 'Your session has expired. Please sign in again.';
        window.dispatchEvent(
          new CustomEvent('session-expired', {
            detail: { reason, wasExtended: !!session.rememberMe },
          })
        );
      }
      await clearSessionData();
      return false;
    }

    sessionValidationCache = { isValid: true, timestamp: Date.now(), userId };
    return true;
  } catch (e) {
    console.warn('isSessionValid error:', e);
    await clearSessionData();
    return false;
  }
}

// ── Cache helpers ────────────────────────────────────────────────────────────
export async function setCacheItem<T>(
  key: string,
  data: T,
  expiresIn: number = SESSION_CONFIG.CACHE_TIMEOUT
): Promise<void> {
  const item: CacheItem<T> = {
    data,
    timestamp: Date.now(),
    expiresAt: Date.now() + expiresIn,
  };
  await setItem(key, item, expiresIn);
}

export async function getCacheItem<T>(key: string): Promise<T | null> {
  const item = await getItem<CacheItem<T>>(key);
  if (!item) return null;
  if (Date.now() > item.expiresAt) {
    await removeItem(key);
    return null;
  }
  return item.data;
}

// ── Activity monitoring (web only) ───────────────────────────────────────────
export function setupActivityMonitoring(): (() => void) | null {
  if (!isWeb()) return null;

  const events = ['mousedown', 'keydown', 'scroll', 'touchstart'];
  const handleActivity = () => {
    void updateLastActivity();
  };

  events.forEach(e =>
    document.addEventListener(e, handleActivity, { passive: true })
  );

  const intervalId = setInterval(async () => {
    try {
      const valid = await isSessionValid();
      if (!valid && typeof window !== 'undefined') {
        window.dispatchEvent(new CustomEvent('session-expired'));
      }
    } catch {
      // Network blips during periodic check — ignore.
    }
  }, SESSION_CONFIG.ACTIVITY_CHECK_INTERVAL);

  return () => {
    events.forEach(e => document.removeEventListener(e, handleActivity));
    clearInterval(intervalId);
  };
}

// ── Init / teardown ──────────────────────────────────────────────────────────
export async function initializeStorage(): Promise<void> {
  // Currently a no-op stub for symmetry with brew-events. Apps may extend
  // (e.g., warm caches, generate CSRF tokens) without changing the call site.
}

/**
 * Wipe all app session/cache data + Supabase auth tokens. Used on logout/reset.
 * Preserves non-app keys in localStorage.
 */
export async function clearAllAppData(): Promise<void> {
  await clearSessionData();
  await Promise.all(
    Object.values(STORAGE_KEYS).map(k => removeItem(k))
  );

  if (isWeb()) {
    try {
      const keysToRemove: string[] = [];
      for (let i = 0; i < window.localStorage.length; i++) {
        const k = window.localStorage.key(i);
        if (k && (k.startsWith(KEY_PREFIX) || /^sb-.*-auth-token/.test(k))) {
          keysToRemove.push(k);
        }
      }
      keysToRemove.forEach(k => window.localStorage.removeItem(k));
    } catch (e) {
      console.warn('clearAllAppData web cleanup failed:', e);
    }
  }
}
