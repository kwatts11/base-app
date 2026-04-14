/**
 * PageIdDisplay — dev overlay showing page ID for update tracking
 * Visible only in development (__DEV__), hidden in production
 */
import React from 'react';
import { View, Text, StyleSheet } from 'react-native';

import { VERSION_CONFIG, getPageName } from '../../constants/version';

interface Props {
  pageId: string;
  position?: 'top-right' | 'top-left' | 'bottom-right' | 'bottom-left';
}

export function PageIdDisplay({ pageId, position = 'top-right' }: Props): React.JSX.Element | null {
  if (!VERSION_CONFIG.showPageIds) return null;

  const posStyle = {
    'top-right': { top: 8, right: 8 },
    'top-left': { top: 8, left: 8 },
    'bottom-right': { bottom: 8, right: 8 },
    'bottom-left': { bottom: 8, left: 8 },
  }[position];

  return (
    <View style={[styles.badge, posStyle]} pointerEvents="none">
      <Text style={styles.text}>{pageId}</Text>
      <Text style={styles.name}>{getPageName(pageId)}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  badge: {
    position: 'absolute',
    zIndex: 9999,
    backgroundColor: 'rgba(0,0,0,0.65)',
    borderRadius: 4,
    paddingHorizontal: 6,
    paddingVertical: 3,
  },
  text: {
    color: '#FFD700',
    fontSize: 10,
    fontWeight: '700',
    fontFamily: 'monospace',
  },
  name: {
    color: '#AAA',
    fontSize: 9,
    fontFamily: 'monospace',
  },
});
