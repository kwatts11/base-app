/**
 * Enum provider — global editable enum data with multi-layer caching
 * Adapted from brew-events with app-specific enum categories removed
 */
import React, {
  createContext,
  useContext,
  useState,
  useEffect,
  useCallback,
  useMemo,
  useRef,
} from 'react';
import { EditableEnumRow } from '../types/database';
import { supabase } from '../lib/supabase';
import { useAuth } from '../hooks/useAuth';
import Toast from 'react-native-toast-message';

// ── Types ─────────────────────────────────────────────────────────────────────
export interface EnumOption {
  id: string;
  value: string;
  displayOrder: number;
  isActive: boolean;
  isPublic: boolean;
}

interface EnumContextState {
  enumData: Record<string, EnumOption[]>;
  loading: boolean;
  error: string | null;
  lastRefresh: number | null;
  initialized: boolean;
}

interface EnumContextMethods {
  getEnumOptions: (enumType: string) => EnumOption[];
  refreshEnums: () => Promise<void>;
  preloadEnums: () => Promise<void>;
  invalidateCache: (enumType?: string) => Promise<void>;
  isEnumDataAvailable: (enumType: string) => boolean;
}

export interface EnumContextValue extends EnumContextState, EnumContextMethods {}

// ── Cache ─────────────────────────────────────────────────────────────────────
const CACHE_KEY = 'app_enum_data_v1';
const CACHE_DURATION_MS = 10 * 60 * 1000; // 10 min

class MemoryCache {
  private cache = new Map<string, { data: Record<string, EnumOption[]>; ts: number }>();
  get(key: string): Record<string, EnumOption[]> | null {
    const entry = this.cache.get(key);
    if (!entry || Date.now() - entry.ts > CACHE_DURATION_MS) {
      this.cache.delete(key);
      return null;
    }
    return entry.data;
  }
  set(key: string, data: Record<string, EnumOption[]>): void {
    this.cache.set(key, { data: { ...data }, ts: Date.now() });
  }
  clear(): void { this.cache.clear(); }
  delete(key: string): void { this.cache.delete(key); }
}

const memCache = new MemoryCache();

// ── Context ───────────────────────────────────────────────────────────────────
const EnumContext = createContext<EnumContextValue | null>(null);

const DEFAULT_STATE: EnumContextState = {
  enumData: {},
  loading: false,
  error: null,
  lastRefresh: null,
  initialized: false,
};

export function EnumProvider({ children }: { children: React.ReactNode }): React.JSX.Element {
  const { user } = useAuth();
  const [state, setState] = useState<EnumContextState>(DEFAULT_STATE);
  const loadingRef = useRef(false);

  const fetchFromDatabase = useCallback(async (): Promise<Record<string, EnumOption[]>> => {
    const { data, error } = await supabase
      .from('editable_enums')
      .select('*')
      .order('enum_name')
      .order('display_order');

    if (error) throw new Error(error.message);

    const grouped: Record<string, EnumOption[]> = {};
    (data ?? []).forEach((row: EditableEnumRow) => {
      if (!grouped[row.enum_name]) grouped[row.enum_name] = [];
      grouped[row.enum_name].push({
        id: row.id,
        value: row.enum_value,
        displayOrder: row.display_order,
        isActive: row.is_active,
        isPublic: row.is_public,
      });
    });

    Object.values(grouped).forEach(arr => arr.sort((a, b) => a.displayOrder - b.displayOrder));
    return grouped;
  }, []);

  const loadEnumData = useCallback(
    async (force = false): Promise<Record<string, EnumOption[]>> => {
      const cacheKey = 'all_enums';
      if (!force) {
        const mem = memCache.get(cacheKey);
        if (mem) return mem;

        try {
          const raw = localStorage.getItem(CACHE_KEY);
          if (raw) {
            const { data, ts } = JSON.parse(raw);
            if (Date.now() - ts < CACHE_DURATION_MS) {
              memCache.set(cacheKey, data);
              return data;
            }
          }
        } catch { /* ignore */ }
      }

      const fresh = await fetchFromDatabase();
      memCache.set(cacheKey, fresh);
      try {
        localStorage.setItem(CACHE_KEY, JSON.stringify({ data: fresh, ts: Date.now() }));
      } catch { /* ignore */ }
      return fresh;
    },
    [fetchFromDatabase]
  );

  const refreshEnums = useCallback(async (): Promise<void> => {
    if (!user || loadingRef.current) return;
    loadingRef.current = true;
    setState(prev => ({ ...prev, loading: true, error: null }));
    try {
      const enumData = await loadEnumData(true);
      setState(prev => ({ ...prev, enumData, loading: false, lastRefresh: Date.now(), initialized: true, error: null }));
    } catch (e: any) {
      setState(prev => ({ ...prev, loading: false, error: e.message }));
      Toast.show({ type: 'error', text1: 'Data Error', text2: 'Failed to load enum values' });
    } finally {
      loadingRef.current = false;
    }
  }, [user, loadEnumData]);

  const preloadEnums = useCallback(async (): Promise<void> => {
    if (!user || loadingRef.current || state.initialized) return;
    loadingRef.current = true;
    setState(prev => ({ ...prev, loading: true, error: null }));
    try {
      const enumData = await loadEnumData(false);
      setState(prev => ({ ...prev, enumData, loading: false, lastRefresh: Date.now(), initialized: true, error: null }));
    } catch (e: any) {
      setState(prev => ({ ...prev, loading: false, error: e.message }));
    } finally {
      loadingRef.current = false;
    }
  }, [user, loadEnumData, state.initialized]);

  const invalidateCache = useCallback(async (enumType?: string): Promise<void> => {
    memCache.clear();
    try { localStorage.removeItem(CACHE_KEY); } catch { /* ignore */ }
    if (enumType) {
      setState(prev => {
        const d = { ...prev.enumData };
        delete d[enumType];
        return { ...prev, enumData: d };
      });
    } else {
      setState(prev => ({ ...prev, enumData: {}, initialized: false, lastRefresh: null }));
    }
  }, []);

  const getEnumOptions = useCallback(
    (enumType: string): EnumOption[] =>
      (state.enumData[enumType] ?? []).filter(o => o.isActive).sort((a, b) => a.displayOrder - b.displayOrder),
    [state.enumData]
  );

  const isEnumDataAvailable = useCallback(
    (enumType: string): boolean =>
      Array.isArray(state.enumData[enumType]) && state.enumData[enumType].length > 0,
    [state.enumData]
  );

  useEffect(() => {
    if (user && !state.initialized && !loadingRef.current) {
      preloadEnums();
    } else if (!user) {
      setState(DEFAULT_STATE);
      memCache.clear();
    }
  }, [user, state.initialized, preloadEnums]);

  const value = useMemo<EnumContextValue>(
    () => ({
      ...state,
      getEnumOptions,
      refreshEnums,
      preloadEnums,
      invalidateCache,
      isEnumDataAvailable,
    }),
    [state, getEnumOptions, refreshEnums, preloadEnums, invalidateCache, isEnumDataAvailable]
  );

  return <EnumContext.Provider value={value}>{children}</EnumContext.Provider>;
}

export function useEnumContext(): EnumContextValue {
  const ctx = useContext(EnumContext);
  if (!ctx) throw new Error('useEnumContext must be used within EnumProvider');
  return ctx;
}

export function useEnumOptions(enumType: string): EnumOption[] {
  const { getEnumOptions } = useEnumContext();
  return useMemo(() => getEnumOptions(enumType), [getEnumOptions, enumType]);
}

export default EnumProvider;
