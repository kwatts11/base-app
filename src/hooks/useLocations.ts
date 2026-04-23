import { useState, useEffect, useCallback } from 'react';
import { supabase } from '../lib/supabase';
import type { AreaRow, LocationRow, LocationWithArea } from '../types/database';

// ── useAreas ──────────────────────────────────────────────────────────────────

interface UseAreasResult {
  areas: AreaRow[];
  loading: boolean;
  error: string | null;
  refresh: () => void;
}

export function useAreas(): UseAreasResult {
  const [areas, setAreas] = useState<AreaRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetch = useCallback(async () => {
    setLoading(true);
    setError(null);
    const { data, error: err } = await supabase
      .from('areas')
      .select('*')
      .eq('active', true)
      .order('display_order', { ascending: true });

    if (err) {
      setError(err.message);
    } else {
      setAreas(data ?? []);
    }
    setLoading(false);
  }, []);

  useEffect(() => { fetch(); }, [fetch]);

  return { areas, loading, error, refresh: fetch };
}

// ── useLocationsByArea ────────────────────────────────────────────────────────

interface UseLocationsByAreaResult {
  locations: LocationRow[];
  loading: boolean;
  error: string | null;
  refresh: () => void;
}

export function useLocationsByArea(areaId: string | null): UseLocationsByAreaResult {
  const [locations, setLocations] = useState<LocationRow[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetch = useCallback(async () => {
    if (!areaId) {
      setLocations([]);
      return;
    }
    setLoading(true);
    setError(null);
    const { data, error: err } = await supabase
      .from('locations')
      .select('*')
      .eq('area_id', areaId)
      .order('name', { ascending: true });

    if (err) {
      setError(err.message);
    } else {
      setLocations(data ?? []);
    }
    setLoading(false);
  }, [areaId]);

  useEffect(() => { fetch(); }, [fetch]);

  return { locations, loading, error, refresh: fetch };
}

// ── useAllLocations ───────────────────────────────────────────────────────────

interface UseAllLocationsResult {
  locations: LocationWithArea[];
  loading: boolean;
  error: string | null;
  refresh: () => void;
}

export function useAllLocations(): UseAllLocationsResult {
  const [locations, setLocations] = useState<LocationWithArea[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetch = useCallback(async () => {
    setLoading(true);
    setError(null);
    const { data, error: err } = await supabase
      .from('locations')
      .select('*, area:areas(*)')
      .order('name', { ascending: true });

    if (err) {
      setError(err.message);
    } else {
      setLocations((data ?? []) as LocationWithArea[]);
    }
    setLoading(false);
  }, []);

  useEffect(() => { fetch(); }, [fetch]);

  return { locations, loading, error, refresh: fetch };
}
