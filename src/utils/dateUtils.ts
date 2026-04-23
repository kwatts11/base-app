/**
 * Date / time utilities — UTC storage, device-local display.
 *
 * Convention:
 *   • All DB columns are `timestamptz` (UTC).
 *   • All `Date` values in code are UTC instants.
 *   • Format for display via `formatLocal*` helpers (device's resolved zone).
 *   • Form input from a date picker is local wall-clock — convert to UTC
 *     with `localWallClockToUtc` before persisting.
 *
 * Never set a global default zone (luxon-style). Different users in different
 * zones must see their own local time, not the developer's.
 */

import { format } from 'date-fns';
import { toZonedTime, fromZonedTime } from 'date-fns-tz';

/** Device's resolved IANA zone, falling back to UTC if unavailable (e.g., very old engines). */
export function getDeviceTimeZone(): string {
  try {
    return Intl.DateTimeFormat().resolvedOptions().timeZone || 'UTC';
  } catch {
    return 'UTC';
  }
}

export function nowUtc(): Date {
  return new Date();
}

/**
 * Format a UTC instant in the device's local zone.
 * Accepts Date or ISO string (DB rows come back as strings).
 */
export function formatLocal(utc: Date | string, fmt: string): string {
  const date = typeof utc === 'string' ? new Date(utc) : utc;
  if (isNaN(date.getTime())) return '';
  const zoned = toZonedTime(date, getDeviceTimeZone());
  return format(zoned, fmt);
}

export const formatLocalDate = (d: Date | string): string =>
  formatLocal(d, 'EEE, MM/dd/yyyy');

export const formatLocalDateTime = (d: Date | string): string =>
  formatLocal(d, 'EEE, MM/dd/yyyy h:mm a');

export const formatLocalTime = (d: Date | string): string =>
  formatLocal(d, 'h:mm a');

/**
 * Convert a local wall-clock Date (e.g., from a date picker where the user
 * means "3pm in MY timezone") into the corresponding UTC instant for storage.
 */
export function localWallClockToUtc(localDate: Date): Date {
  return fromZonedTime(localDate, getDeviceTimeZone());
}
