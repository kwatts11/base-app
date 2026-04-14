/**
 * AppInitializer — runs startup tasks after auth resolves
 * Add any global pre-load logic here (analytics init, feature flags, etc.)
 */
import { useEffect } from 'react';

import { useAuth } from '../../hooks/useAuth';
import { useEnumContext } from '../../context/EnumProvider';

export function AppInitializer(): null {
  const { user, initializing } = useAuth();
  const { preloadEnums } = useEnumContext();

  useEffect(() => {
    if (initializing || !user) return;
    // Preload enums when user is authenticated
    preloadEnums();
  }, [user, initializing, preloadEnums]);

  return null;
}
