/**
 * Device fingerprinting — bind sessions to a device class to deter token replay.
 *
 * Web-only (returns null on native). Uses stable characteristics (platform,
 * touch support, hardware concurrency, color depth) — enough to distinguish
 * phone vs tablet vs laptop vs desktop without invalidating sessions on
 * routine drift (browser updates, multi-monitor, DST/VPN).
 */

import { Platform } from 'react-native';

export interface DeviceCharacteristics {
  userAgent: string;
  platform: string;
  pixelRatio: number;
  hardwareConcurrency: number;
  colorDepth: number;
  touchSupport: boolean;
}

export interface FingerprintValidation {
  isValid: boolean;
  confidence: number;
  mismatches: string[];
  /** Stored fingerprint uses an older format and was accepted as a soft match. */
  legacy?: boolean;
}

function isWeb(): boolean {
  return Platform.OS === 'web' && typeof window !== 'undefined';
}

export function collectDeviceCharacteristics(): DeviceCharacteristics | null {
  if (!isWeb()) return null;
  try {
    const nav = window.navigator;
    const screen = window.screen;
    return {
      userAgent: nav.userAgent,
      platform: nav.platform,
      pixelRatio: window.devicePixelRatio || 1,
      hardwareConcurrency: (nav as any).hardwareConcurrency || 0,
      colorDepth: screen.colorDepth,
      touchSupport: 'ontouchstart' in window || navigator.maxTouchPoints > 0,
    };
  } catch {
    return null;
  }
}

function simpleHash(text: string): string {
  let hash = 0;
  for (let i = 0; i < text.length; i++) {
    hash = ((hash << 5) - hash) + text.charCodeAt(i);
    hash = hash & hash;
  }
  return Math.abs(hash).toString(36);
}

export function generateDeviceFingerprint(): string | null {
  const c = collectDeviceCharacteristics();
  if (!c) return null;

  // Stable components only — see file header for rationale.
  const components = [
    c.platform,
    c.touchSupport ? '1' : '0',
    c.hardwareConcurrency.toString(),
    c.colorDepth.toString(),
  ];
  return `v2_${simpleHash(components.join('|'))}`;
}

export function validateDeviceFingerprint(
  storedFingerprint: string | null | undefined
): FingerprintValidation {
  if (!storedFingerprint) {
    return { isValid: true, confidence: 1.0, mismatches: [] };
  }

  const current = generateDeviceFingerprint();
  if (!current) {
    // Native or fingerprinting unavailable — trust Supabase session.
    return { isValid: true, confidence: 1.0, mismatches: [] };
  }

  // Legacy v1 inputs aren't reproducible across browser updates.
  // Accept softly so caller can re-persist with current format.
  if (storedFingerprint.startsWith('v1_')) {
    return { isValid: true, confidence: 0.5, mismatches: [], legacy: true };
  }

  if (current === storedFingerprint) {
    return { isValid: true, confidence: 1.0, mismatches: [] };
  }

  return {
    isValid: false,
    confidence: 0.0,
    mismatches: ['Device fingerprint does not match stored value'],
  };
}

export function getDeviceInfo(): {
  browser: string;
  os: string;
  device: string;
} | null {
  const c = collectDeviceCharacteristics();
  if (!c) return null;

  const ua = c.userAgent;
  let browser = 'Unknown';
  if (ua.includes('Edg')) browser = 'Edge';
  else if (ua.includes('Chrome')) browser = 'Chrome';
  else if (ua.includes('Safari')) browser = 'Safari';
  else if (ua.includes('Firefox')) browser = 'Firefox';

  let os = 'Unknown';
  if (ua.includes('Windows')) os = 'Windows';
  else if (ua.includes('Mac')) os = 'macOS';
  else if (ua.includes('Linux')) os = 'Linux';
  else if (ua.includes('iPhone') || ua.includes('iPad')) os = 'iOS';
  else if (ua.includes('Android')) os = 'Android';

  const device = c.touchSupport ? 'Mobile/Tablet' : 'Desktop';
  return { browser, os, device };
}
