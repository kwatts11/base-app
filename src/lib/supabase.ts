/**
 * Supabase client — singleton with auth helpers, session storage, and error handling
 * Adapted from brew-events with app-specific details removed
 */
import { createClient, SupabaseClient, AuthError, User } from '@supabase/supabase-js';
import { Database, UserRole, UserProfileRow } from '../types/database';

// ── Env validation ────────────────────────────────────────────────────────────
const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY;

function validateEnv(): void {
  if (!supabaseUrl) {
    throw new Error(
      'EXPO_PUBLIC_SUPABASE_URL is required. Check your .env file.'
    );
  }
  if (!supabaseAnonKey) {
    throw new Error(
      'EXPO_PUBLIC_SUPABASE_ANON_KEY is required. Check your .env file.'
    );
  }
  try {
    new URL(supabaseUrl);
  } catch {
    throw new Error('EXPO_PUBLIC_SUPABASE_URL must be a valid URL.');
  }
}

validateEnv();

// ── Client singleton ──────────────────────────────────────────────────────────
export const supabase = createClient<Database>(supabaseUrl!, supabaseAnonKey!, {
  auth: {
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: true,
    storage: {
      getItem: (key: string) => {
        if (typeof window === 'undefined') return null;
        try {
          return window.localStorage.getItem(key);
        } catch {
          return null;
        }
      },
      setItem: (key: string, value: string) => {
        if (typeof window === 'undefined') return;
        try {
          window.localStorage.setItem(key, value);
        } catch (e) {
          // Safari strict privacy — clear stale entries and retry
          try {
            Object.keys(window.localStorage)
              .filter(k => k.startsWith('sb-') && k !== key)
              .forEach(k => window.localStorage.removeItem(k));
            window.localStorage.setItem(key, value);
          } catch {
            console.warn('localStorage blocked (private mode?)');
          }
        }
      },
      removeItem: (key: string) => {
        if (typeof window === 'undefined') return;
        try {
          window.localStorage.removeItem(key);
        } catch {
          // ignore
        }
      },
    },
  },
  realtime: { params: { eventsPerSecond: 10 } },
});

// ── Auth state cache ──────────────────────────────────────────────────────────
let currentUser: User | null = null;
let currentUserRole: UserRole | null = null;

export const getCurrentUser = (): User | null => currentUser;
export const getCurrentUserRole = (): UserRole | null => currentUserRole;
export const isCurrentUserAdmin = (): boolean => currentUserRole === UserRole.Admin;

// Cache to deduplicate simultaneous role fetches
const roleFetchCache = new Map<string, Promise<UserRole | null>>();

export function clearRoleFetchCache(): void {
  roleFetchCache.clear();
}

// ── Role fetch ────────────────────────────────────────────────────────────────
export async function fetchUserRole(userId: string): Promise<UserRole | null> {
  if (roleFetchCache.has(userId)) return roleFetchCache.get(userId)!;

  const promise = fetchUserRoleInternal(userId);
  roleFetchCache.set(userId, promise);
  try {
    return await promise;
  } finally {
    roleFetchCache.delete(userId);
  }
}

async function fetchUserRoleInternal(userId: string): Promise<UserRole | null> {
  try {
    const timeout = new Promise<never>((_, reject) =>
      setTimeout(() => reject(new Error('Role fetch timeout')), 10000)
    );
    const query = supabase
      .from('user_profiles')
      .select('role')
      .eq('id', userId)
      .single();

    const { data, error } = await Promise.race([query, timeout]);

    if (error) {
      if (error.code === 'PGRST116') return await createDefaultUserProfile(userId);
      return null;
    }

    return (data as { role: UserRole })?.role ?? null;
  } catch (e: any) {
    if (e.message?.includes('timeout')) return UserRole.Employee;
    return null;
  }
}

async function createDefaultUserProfile(userId: string): Promise<UserRole | null> {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user || user.id !== userId) return UserRole.Employee;

    const { data, error } = await supabase
      .from('user_profiles')
      .insert({
        id: userId,
        username: user.email ?? 'user@example.com',
        name: user.email?.split('@')[0] ?? 'New User',
        role: UserRole.Employee,
        active: true,
      })
      .select('role')
      .single();

    return error ? UserRole.Employee : ((data as { role: UserRole })?.role ?? UserRole.Employee);
  } catch {
    return UserRole.Employee;
  }
}

// ── Combined user data fetch ──────────────────────────────────────────────────
const userDataCache = new Map<string, Promise<{ role: UserRole; profile: UserProfileRow } | null>>();

export function clearUserDataFetchCache(): void {
  userDataCache.clear();
}

export async function fetchUserData(
  userId: string
): Promise<{ role: UserRole; profile: UserProfileRow } | null> {
  if (userDataCache.has(userId)) return userDataCache.get(userId)!;

  const promise = fetchUserDataInternal(userId);
  userDataCache.set(userId, promise);
  try {
    return await promise;
  } finally {
    userDataCache.delete(userId);
  }
}

async function fetchUserDataInternal(
  userId: string
): Promise<{ role: UserRole; profile: UserProfileRow } | null> {
  try {
    const timeout = new Promise<never>((_, reject) =>
      setTimeout(() => reject(new Error('User data fetch timeout')), 5000)
    );
    const query = supabase.from('user_profiles').select('*').eq('id', userId).single();
    const { data, error } = await Promise.race([query, timeout]);

    if (error) {
      if (error.code === 'PGRST116') {
        await createDefaultUserProfile(userId);
        return null;
      }
      return null;
    }

    const profile = data as UserProfileRow;
    return profile.role ? { role: profile.role, profile } : null;
  } catch {
    return null;
  }
}

// ── Auth state listener ───────────────────────────────────────────────────────
supabase.auth.onAuthStateChange(async (event, session) => {
  currentUser = session?.user ?? null;
  if (!currentUser) {
    currentUserRole = null;
    return;
  }
  if (event === 'SIGNED_IN' || event === 'TOKEN_REFRESHED') {
    fetchUserRole(currentUser.id)
      .then(role => { currentUserRole = role; })
      .catch(() => { currentUserRole = UserRole.Employee; });
  }
});

// ── Auth helpers ──────────────────────────────────────────────────────────────
export async function signIn(email: string, password: string) {
  try {
    const { data, error } = await supabase.auth.signInWithPassword({
      email: email.trim().toLowerCase(),
      password,
    });
    if (error) return { data: null, error: handleDatabaseError(error) };
    return { data, error: null };
  } catch (e) {
    return { data: null, error: handleDatabaseError(e) };
  }
}

export async function signOut() {
  try {
    // Clean up all localStorage on sign-out for security
    if (typeof window !== 'undefined') {
      try { window.localStorage.clear(); } catch { /* ignore */ }
    }
    const { error } = await supabase.auth.signOut();
    return { error: error ? handleDatabaseError(error) : null };
  } catch (e) {
    return { error: handleDatabaseError(e) };
  }
}

export async function resetPassword(email: string) {
  try {
    const redirectTo =
      typeof window !== 'undefined'
        ? `${window.location.origin}/auth-redirect`
        : undefined;

    const { error } = await supabase.auth.resetPasswordForEmail(
      email.trim().toLowerCase(),
      { redirectTo }
    );
    return { error: error ? handleDatabaseError(error) : null };
  } catch (e) {
    return { error: handleDatabaseError(e) };
  }
}

// ── Error handling ────────────────────────────────────────────────────────────
export interface DatabaseError {
  message: string;
  code?: string;
  details?: string;
  hint?: string;
}

export function handleDatabaseError(error: any): DatabaseError {
  if (error && typeof error === 'object' && 'name' in error) {
    const authError = error as AuthError;
    return { message: authError.message ?? 'Authentication error', code: authError.name };
  }
  if (error && typeof error === 'object') {
    return {
      message: error.message ?? 'Database operation failed',
      code: error.code,
      details: error.details,
      hint: error.hint,
    };
  }
  return { message: String(error) ?? 'Unknown error' };
}

export function logDatabaseError(operation: string, error: any): void {
  const e = handleDatabaseError(error);
  console.warn(`[DB Error] ${operation}:`, e);
}

// ── Realtime helpers ──────────────────────────────────────────────────────────
const activeSubscriptions = new Map<string, any>();

export function subscribeToTable(tableName: string, callback: (payload: any) => void): string {
  const key = `${tableName}_${Date.now()}`;
  const sub = supabase
    .channel(`rt_${tableName}`)
    .on('postgres_changes' as any, { event: '*', schema: 'public', table: tableName }, callback)
    .subscribe();
  activeSubscriptions.set(key, sub);
  return key;
}

export function unsubscribeFromTable(key: string): void {
  const sub = activeSubscriptions.get(key);
  if (sub) {
    supabase.removeChannel(sub);
    activeSubscriptions.delete(key);
  }
}

export function cleanupAllSubscriptions(): void {
  activeSubscriptions.forEach((_, key) => unsubscribeFromTable(key));
}

export default supabase;
