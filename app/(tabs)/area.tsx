/**
 * Area tab — location tile list filtered by selected area.
 * Single-column card layout, max width 600px (mirrors today-page convention).
 * APP_SETUP: Customize LocationCard stats row and detail navigation as needed.
 */
import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  Platform,
  Alert,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import * as Location from 'expo-location';

import { useTheme } from '../../src/context/ThemeProvider';
import { useAreas, useLocationsByArea } from '../../src/hooks/useLocations';
import type { AreaRow, LocationRow } from '../../src/types/database';

// ── Area picker ───────────────────────────────────────────────────────────────

function AreaPicker({
  areas,
  selectedId,
  onSelect,
}: {
  areas: AreaRow[];
  selectedId: string | null;
  onSelect: (id: string) => void;
}): React.JSX.Element {
  const { theme } = useTheme();
  const [open, setOpen] = useState(false);
  const selected = areas.find(a => a.id === selectedId);

  return (
    <View style={styles.pickerWrapper}>
      <TouchableOpacity
        style={[styles.pickerTrigger, { backgroundColor: theme.colors.surface, borderColor: theme.colors.border }]}
        onPress={() => setOpen(o => !o)}
        activeOpacity={0.8}
      >
        {selected && (
          <View style={[styles.colorDot, { backgroundColor: selected.color }]} />
        )}
        <Text style={[styles.pickerLabel, { color: theme.colors.text }]}>
          {selected?.name ?? 'Select Area'}
        </Text>
        <Ionicons
          name={open ? 'chevron-up' : 'chevron-down'}
          size={16}
          color={theme.colors.textMuted}
        />
      </TouchableOpacity>

      {open && (
        <View style={[styles.dropdown, { backgroundColor: theme.colors.surface, borderColor: theme.colors.border }]}>
          {areas.map(area => (
            <TouchableOpacity
              key={area.id}
              style={[
                styles.dropdownRow,
                { borderBottomColor: theme.colors.border },
                area.id === selectedId && { backgroundColor: theme.colors.primary + '18' },
              ]}
              onPress={() => { onSelect(area.id); setOpen(false); }}
              activeOpacity={0.7}
            >
              <View style={[styles.colorDot, { backgroundColor: area.color }]} />
              <Text style={[styles.dropdownText, { color: theme.colors.text }]}>{area.name}</Text>
              {area.id === selectedId && (
                <Ionicons name="checkmark" size={16} color={theme.colors.primary} />
              )}
            </TouchableOpacity>
          ))}
        </View>
      )}
    </View>
  );
}

// ── Location card ─────────────────────────────────────────────────────────────

function LocationCard({
  location,
  areaColor,
  onPress,
}: {
  location: LocationRow;
  areaColor: string;
  onPress: () => void;
}): React.JSX.Element {
  const { theme } = useTheme();

  return (
    <TouchableOpacity
      style={[styles.card, { backgroundColor: theme.colors.surface }]}
      onPress={onPress}
      activeOpacity={0.75}
    >
      <View style={[styles.cardAccent, { backgroundColor: areaColor }]} />
      <View style={styles.cardBody}>
        <Text style={[styles.cardName, { color: theme.colors.text }]} numberOfLines={1}>
          {location.name}
        </Text>
        {location.group ? (
          <Text style={[styles.cardGroup, { color: theme.colors.textMuted }]} numberOfLines={1}>
            {location.group}
          </Text>
        ) : null}
        {location.notes ? (
          <Text style={[styles.cardNotes, { color: theme.colors.textSecondary }]} numberOfLines={2}>
            {location.notes}
          </Text>
        ) : null}
        {/* WIZARD:BEGIN app-setup-stats */}
        <View style={[styles.cardStats, { borderTopColor: theme.colors.border }]}>
          <Text style={[styles.cardStatPlaceholder, { color: theme.colors.textMuted }]} />
        </View>
        {/* WIZARD:END app-setup-stats */}
      </View>
      <Ionicons name="chevron-forward" size={16} color={theme.colors.textMuted} style={styles.cardChevron} />
    </TouchableOpacity>
  );
}

// ── Empty state ───────────────────────────────────────────────────────────────

function EmptyState({ areaName }: { areaName: string }): React.JSX.Element {
  const { theme } = useTheme();
  return (
    <View style={styles.emptyContainer}>
      <Ionicons name="map-outline" size={48} color={theme.colors.textMuted} />
      <Text style={[styles.emptyTitle, { color: theme.colors.text }]}>No locations</Text>
      <Text style={[styles.emptySubtitle, { color: theme.colors.textMuted }]}>
        No locations found in {areaName}
      </Text>
    </View>
  );
}

// ── Screen ────────────────────────────────────────────────────────────────────

export default function AreaScreen(): React.JSX.Element {
  const { theme } = useTheme();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { areas, loading: areasLoading } = useAreas();
  const [selectedAreaId, setSelectedAreaId] = useState<string | null>(null);
  const { locations, loading: locsLoading } = useLocationsByArea(selectedAreaId);
  const [gpsLoading, setGpsLoading] = useState(false);

  // Default to first area once loaded
  useEffect(() => {
    if (areas.length > 0 && !selectedAreaId) {
      setSelectedAreaId(areas[0].id);
    }
  }, [areas, selectedAreaId]);

  const selectedArea = areas.find(a => a.id === selectedAreaId);

  const handleAddLocation = useCallback(async () => {
    setGpsLoading(true);
    try {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert(
          'Location Access Denied',
          'Enable location access in Settings to use your current position, or use the Map tab to place a pin manually.',
          [{ text: 'OK' }]
        );
        setGpsLoading(false);
        return;
      }
      const pos = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced });
      router.push({
        pathname: '/(modal)/add-location',
        params: {
          lat: pos.coords.latitude.toFixed(6),
          lng: pos.coords.longitude.toFixed(6),
        },
      });
    } catch {
      Alert.alert('Error', 'Could not get your location. Try again or use the Map tab.');
    } finally {
      setGpsLoading(false);
    }
  }, [router]);

  if (areasLoading) {
    return (
      <View style={[styles.centered, { backgroundColor: theme.colors.background }]}>
        <ActivityIndicator color={theme.colors.primary} />
      </View>
    );
  }

  if (areas.length === 0) {
    return (
      <View style={[styles.centered, { backgroundColor: theme.colors.background }]}>
        <Ionicons name="map-outline" size={48} color={theme.colors.textMuted} />
        <Text style={[styles.emptyTitle, { color: theme.colors.text, marginTop: 12 }]}>No areas yet</Text>
        <Text style={[styles.emptySubtitle, { color: theme.colors.textMuted }]}>
          Add areas in Admin → Area Colors
        </Text>
      </View>
    );
  }

  return (
    <View style={[styles.screen, { backgroundColor: theme.colors.background }]}>
      {/* Sticky area picker */}
      <View style={[styles.pickerBar, { backgroundColor: theme.colors.background, borderBottomColor: theme.colors.border }]}>
        <AreaPicker
          areas={areas}
          selectedId={selectedAreaId}
          onSelect={setSelectedAreaId}
        />
      </View>

      {locsLoading ? (
        <View style={styles.centered}>
          <ActivityIndicator color={theme.colors.primary} />
        </View>
      ) : (
        <FlatList
          data={locations}
          keyExtractor={item => item.id}
          contentContainerStyle={[styles.listContent, { paddingBottom: insets.bottom + 88 }]}
          ListEmptyComponent={
            selectedArea ? <EmptyState areaName={selectedArea.name} /> : null
          }
          renderItem={({ item }) => (
            <LocationCard
              location={item}
              areaColor={selectedArea?.color ?? '#888888'}
              onPress={() => {
                // WIZARD:BEGIN app-setup-detail-nav
                // router.push(`/(modal)/location-detail?id=${item.id}`);
                // WIZARD:END app-setup-detail-nav
              }}
            />
          )}
        />
      )}

      {/* Add location FAB — resolves GPS then opens form */}
      <TouchableOpacity
        style={[styles.fab, { backgroundColor: theme.colors.primary, bottom: insets.bottom + 20 }]}
        onPress={handleAddLocation}
        disabled={gpsLoading}
        activeOpacity={0.85}
      >
        {gpsLoading
          ? <ActivityIndicator color="#fff" size="small" />
          : <Ionicons name="add" size={28} color="#fff" />
        }
      </TouchableOpacity>
    </View>
  );
}

// ── Styles ────────────────────────────────────────────────────────────────────

const MAX_CARD_WIDTH = 600;

const styles = StyleSheet.create({
  screen: { flex: 1 },
  centered: { flex: 1, justifyContent: 'center', alignItems: 'center', gap: 8 },

  pickerBar: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderBottomWidth: StyleSheet.hairlineWidth,
    zIndex: 10,
  },
  pickerWrapper: { position: 'relative' },
  pickerTrigger: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    borderWidth: 1,
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 10,
    maxWidth: MAX_CARD_WIDTH,
    alignSelf: Platform.OS === 'web' ? 'center' : 'stretch',
    width: '100%',
  },
  pickerLabel: { flex: 1, fontSize: 15, fontWeight: '600' },
  colorDot: { width: 12, height: 12, borderRadius: 6 },
  dropdown: {
    position: 'absolute',
    top: '100%',
    left: 0,
    right: 0,
    borderWidth: 1,
    borderRadius: 10,
    marginTop: 4,
    zIndex: 100,
    overflow: 'hidden',
    maxWidth: MAX_CARD_WIDTH,
    alignSelf: Platform.OS === 'web' ? 'center' : 'stretch',
    ...(Platform.OS === 'ios' || Platform.OS === 'android'
      ? {
          shadowColor: '#000',
          shadowOffset: { width: 0, height: 4 },
          shadowOpacity: 0.15,
          shadowRadius: 8,
          elevation: 8,
        }
      : {}),
  },
  dropdownRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingHorizontal: 14,
    paddingVertical: 12,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  dropdownText: { flex: 1, fontSize: 15 },

  listContent: {
    paddingHorizontal: 16,
    paddingTop: 12,
    paddingBottom: 32,
    alignItems: 'center',
    gap: 10,
  },
  card: {
    flexDirection: 'row',
    alignItems: 'stretch',
    borderRadius: 12,
    overflow: 'hidden',
    width: '100%',
    maxWidth: MAX_CARD_WIDTH,
  },
  cardAccent: { width: 4 },
  cardBody: { flex: 1, padding: 14, gap: 4 },
  cardName: { fontSize: 16, fontWeight: '700' },
  cardGroup: { fontSize: 12, fontWeight: '500' },
  cardNotes: { fontSize: 13, lineHeight: 18, marginTop: 2 },
  cardStats: { marginTop: 8, paddingTop: 8, borderTopWidth: StyleSheet.hairlineWidth, minHeight: 20 },
  cardStatPlaceholder: { fontSize: 12 },
  cardChevron: { alignSelf: 'center', marginRight: 12 },

  emptyContainer: { paddingTop: 80, alignItems: 'center', gap: 8 },
  emptyTitle: { fontSize: 17, fontWeight: '600' },
  emptySubtitle: { fontSize: 14, textAlign: 'center', maxWidth: 260 },

  fab: {
    position: 'absolute',
    right: 16,
    width: 52,
    height: 52,
    borderRadius: 26,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.25,
    shadowRadius: 6,
    elevation: 6,
  },
});
