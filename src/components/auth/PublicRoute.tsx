/**
 * PublicRoute — redirects authenticated users away from auth screens
 */
import React, { useEffect } from 'react';
import { useRouter } from 'expo-router';

import { useAuth } from '../../hooks/useAuth';

interface Props {
  children: React.ReactNode;
}

export function PublicRoute({ children }: Props): React.JSX.Element {
  const { user, initializing } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!initializing && user) {
      router.replace('/(tabs)/home');
    }
  }, [user, initializing, router]);

  return <>{children}</>;
}
