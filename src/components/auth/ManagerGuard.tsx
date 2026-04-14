/**
 * ManagerGuard — renders children only for Manager and Admin roles
 */
import React from 'react';
import { View, Text, StyleSheet } from 'react-native';

import { useAuth } from '../../hooks/useAuth';
import { useTheme } from '../../context/ThemeProvider';

interface Props {
  children: React.ReactNode;
  fallback?: React.ReactNode;
}

export function ManagerGuard({ children, fallback }: Props): React.JSX.Element {
  const { isManagerOrAdmin } = useAuth();
  const { theme } = useTheme();

  if (!isManagerOrAdmin) {
    if (fallback) return <>{fallback}</>;
    return (
      <View style={[styles.center, { backgroundColor: theme.colors.background }]}>
        <Text style={[styles.msg, { color: theme.colors.textSecondary }]}>
          Manager access required
        </Text>
      </View>
    );
  }

  return <>{children}</>;
}

const styles = StyleSheet.create({
  center: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 24 },
  msg: { fontSize: 15, textAlign: 'center' },
});
