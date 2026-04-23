/**
 * Map tab — Mapbox map with colored waypoints, layer toggle, and onX-style
 * bottom-sheet popup. Requires a native build (EAS / expo prebuild).
 * Web shows a fallback message.
 *
 * APP_SETUP: Set MAPBOX_ACCESS_TOKEN in src/constants/mapConfig.ts
 */
import React, { useRef, useState, useCallback } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Animated,
  Linking,
  Platform,
  ActivityIndicator,
  Share,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';

import { useTheme } from '../../src/context/ThemeProvider';
import { useAllLocations } from '../../src/hooks/useLocations';
import type { LocationWithArea } from '../../src/types/database';
import { MAPBOX_ACCESS_TOKEN } from '../../src/constants/mapConfig';

// ── Types ─────────────────────────────────────────────────────────────────────

type LayerStyle = 'street' | 'satellite';

// ── Waypoint marker ───────────────────────────────────────────────────────────

function WaypointMarker({ color }: { color: string }): React.JSX.Element {
  return (
    <View style={styles.markerOuter}>
      <View style={[styles.markerPin, { backgroundColor: color, borderColor: color }]}>
        <View style={styles.markerInner} />
      </View>
      <View style={[styles.markerTail, { borderTopColor: color }]} />
    </View>
  );
}

// ── Bottom sheet popup ────────────────────────────────────────────────────────

const SHEET_HEIGHT = 260;

interface BottomSheetProps {
  location: LocationWithArea | null;
  translateY: Animated.Value;
  onDismiss: () => void;
  onEdit: (loc: LocationWithArea) => void;
  onShare: (loc: LocationWithArea) => void;
  onNavigate: (loc: LocationWithArea) => void;
}

function BottomSheet({
  location,
  translateY,
  onDismiss,
  onEdit,
  onShare,
  onNavigate,
}: BottomSheetProps): React.JSX.Element | null {
  const { theme } = useTheme();
  const insets = useSafeAreaInsets();

  if (!location) return null;

  return (
    <>
      {/* Transparent dismiss layer — covers area above the sheet to catch outside taps */}
      <View style={styles.dismissLayer} pointerEvents="box-none">
        <TouchableOpacity
          style={StyleSheet.absoluteFillObject}
          activeOpacity={1}
          onPress={onDismiss}
        />
      </View>

      <Animated.View
        style={[
          styles.sheet,
          {
            backgroundColor: theme.colors.surface,
            paddingBottom: insets.bottom + 8,
            transform: [{ translateY }],
          },
        ]}
        pointerEvents="box-none"
      >
        {/* Drag handle */}
        <View style={[styles.sheetHandle, { backgroundColor: theme.colors.border }]} />

        {/* Area color bar */}
        <View style={[styles.sheetAccent, { backgroundColor: location.area.color }]} />

        <View style={styles.sheetContent}>
          {/* Header */}
          <View style={styles.sheetHeader}>
            <View style={{ flex: 1 }}>
              <Text style={[styles.sheetName, { color: theme.colors.text }]} numberOfLines={1}>
                {location.name}
              </Text>
              <View style={styles.sheetMeta}>
                <View style={[styles.areaBadge, { backgroundColor: location.area.color + '28' }]}>
                  <View style={[styles.areaColorDot, { backgroundColor: location.area.color }]} />
                  <Text style={[styles.areaBadgeText, { color: location.area.color }]}>
                    {location.area.name}
                  </Text>
                </View>
                {location.group ? (
                  <Text style={[styles.sheetGroup, { color: theme.colors.textMuted }]}>
                    · {location.group}
                  </Text>
                ) : null}
              </View>
            </View>
            <TouchableOpacity onPress={onDismiss} style={styles.sheetClose} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
              <Ionicons name="close" size={20} color={theme.colors.textMuted} />
            </TouchableOpacity>
          </View>

          {/* Notes preview */}
          {location.notes ? (
            <Text style={[styles.sheetNotes, { color: theme.colors.textSecondary }]} numberOfLines={2}>
              {location.notes}
            </Text>
          ) : null}

          {/* APP_SETUP: add stats here */}
          <View style={[styles.sheetStats, { borderTopColor: theme.colors.border }]}>
            {/* APP_SETUP: replace with app-specific stat chips */}
          </View>

          {/* Actions */}
          <View style={[styles.sheetActions, { borderTopColor: theme.colors.border }]}>
            <TouchableOpacity
              style={[styles.actionBtn, { backgroundColor: theme.colors.primary + '18' }]}
              onPress={() => onEdit(location)}
              activeOpacity={0.75}
            >
              <Ionicons name="pencil-outline" size={18} color={theme.colors.primary} />
              <Text style={[styles.actionLabel, { color: theme.colors.primary }]}>Edit</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.actionBtn, { backgroundColor: theme.colors.surface, borderWidth: StyleSheet.hairlineWidth, borderColor: theme.colors.border }]}
              onPress={() => onShare(location)}
              activeOpacity={0.75}
            >
              <Ionicons name="share-outline" size={18} color={theme.colors.text} />
              <Text style={[styles.actionLabel, { color: theme.colors.text }]}>Share</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.actionBtn, { backgroundColor: '#1E90FF18' }]}
              onPress={() => onNavigate(location)}
              activeOpacity={0.75}
            >
              <Ionicons name="navigate-outline" size={18} color="#1E90FF" />
              <Text style={[styles.actionLabel, { color: '#1E90FF' }]}>Navigate</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Animated.View>
    </>
  );
}

// ── Map screen (native) ───────────────────────────────────────────────────────

function MapContent(): React.JSX.Element {
  const { theme } = useTheme();
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { locations, loading } = useAllLocations();

  const [layerStyle, setLayerStyle] = useState<LayerStyle>('street');
  const [selected, setSelected] = useState<LocationWithArea | null>(null);
  const sheetY = useRef(new Animated.Value(SHEET_HEIGHT)).current;

  // Pin placement mode
  const [pinMode, setPinMode] = useState(false);
  // Always tracks current camera center so it's ready when pin mode is entered
  const [pinCoord, setPinCoord] = useState<[number, number]>([-98.5795, 39.8283]);

  // Lazy import Mapbox — only on native
  // eslint-disable-next-line @typescript-eslint/no-var-requires
  const Mapbox = require('@rnmapbox/maps').default;

  Mapbox.setAccessToken(MAPBOX_ACCESS_TOKEN);

  const styleURL =
    layerStyle === 'satellite'
      ? Mapbox.StyleURL.Satellite
      : Mapbox.StyleURL.Street;

  const showSheet = useCallback((loc: LocationWithArea) => {
    setSelected(loc);
    Animated.spring(sheetY, {
      toValue: 0,
      useNativeDriver: true,
      bounciness: 4,
    }).start();
  }, [sheetY]);

  const hideSheet = useCallback(() => {
    Animated.timing(sheetY, {
      toValue: SHEET_HEIGHT,
      duration: 220,
      useNativeDriver: true,
    }).start(() => setSelected(null));
  }, [sheetY]);

  const handleCameraChanged = useCallback((state: any) => {
    const center = state?.properties?.center;
    if (center) setPinCoord([center[0], center[1]]);
  }, []);

  const enterPinMode = useCallback(() => {
    hideSheet();
    setPinMode(true);
  }, [hideSheet]);

  const exitPinMode = useCallback(() => {
    setPinMode(false);
  }, []);

  const handlePinContinue = useCallback(() => {
    setPinMode(false);
    router.push({
      pathname: '/(modal)/add-location',
      params: {
        lat: pinCoord[1].toFixed(6),
        lng: pinCoord[0].toFixed(6),
      },
    });
  }, [pinCoord, router]);

  const handleShare = useCallback(async (loc: LocationWithArea) => {
    await Share.share({
      title: loc.name,
      message: `${loc.name} — ${loc.area.name}\nhttps://maps.google.com/?q=${loc.latitude},${loc.longitude}`,
    });
  }, []);

  const handleNavigate = useCallback((loc: LocationWithArea) => {
    const url = Platform.select({
      ios: `maps:?q=${encodeURIComponent(loc.name)}&ll=${loc.latitude},${loc.longitude}`,
      android: `geo:${loc.latitude},${loc.longitude}?q=${encodeURIComponent(loc.name)}`,
      default: `https://maps.google.com/?q=${loc.latitude},${loc.longitude}`,
    });
    if (url) Linking.openURL(url);
  }, []);

  const handleEdit = useCallback((_loc: LocationWithArea) => {
    // APP_SETUP: navigate to location edit modal
    // router.push(`/(modal)/edit-location?id=${_loc.id}`);
  }, []);

  if (loading) {
    return (
      <View style={[styles.centered, { backgroundColor: theme.colors.background }]}>
        <ActivityIndicator color={theme.colors.primary} />
      </View>
    );
  }

  return (
    <View style={styles.mapContainer}>
      <Mapbox.MapView
        style={styles.map}
        styleURL={styleURL}
        compassEnabled
        scaleBarEnabled={false}
        attributionEnabled={false}
        logoEnabled={false}
        onCameraChanged={handleCameraChanged}
      >
        <Mapbox.Camera
          defaultSettings={{
            centerCoordinate: locations.length > 0
              ? [locations[0].longitude, locations[0].latitude]
              : [-98.5795, 39.8283],
            zoomLevel: locations.length > 0 ? 10 : 3,
          }}
        />

        {locations.map(loc => (
          <Mapbox.PointAnnotation
            key={loc.id}
            id={loc.id}
            coordinate={[loc.longitude, loc.latitude]}
            onSelected={pinMode ? undefined : () => showSheet(loc)}
          >
            <WaypointMarker color={loc.area.color} />
          </Mapbox.PointAnnotation>
        ))}
      </Mapbox.MapView>

      {/* Layer toggle */}
      <View style={[styles.layerToggle, { top: insets.top + 12 }]}>
        <TouchableOpacity
          style={[
            styles.layerBtn,
            { backgroundColor: theme.colors.surface },
            layerStyle === 'street' && { backgroundColor: theme.colors.primary },
          ]}
          onPress={() => setLayerStyle('street')}
          activeOpacity={0.8}
        >
          <Ionicons
            name="map-outline"
            size={18}
            color={layerStyle === 'street' ? '#fff' : theme.colors.text}
          />
          <Text style={[styles.layerBtnText, { color: layerStyle === 'street' ? '#fff' : theme.colors.text }]}>
            Map
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[
            styles.layerBtn,
            { backgroundColor: theme.colors.surface },
            layerStyle === 'satellite' && { backgroundColor: theme.colors.primary },
          ]}
          onPress={() => setLayerStyle('satellite')}
          activeOpacity={0.8}
        >
          <Ionicons
            name="globe-outline"
            size={18}
            color={layerStyle === 'satellite' ? '#fff' : theme.colors.text}
          />
          <Text style={[styles.layerBtnText, { color: layerStyle === 'satellite' ? '#fff' : theme.colors.text }]}>
            Satellite
          </Text>
        </TouchableOpacity>
      </View>

      {/* Pin placement crosshair — pointer events none so map remains draggable */}
      {pinMode && (
        <View style={styles.crosshairContainer} pointerEvents="none">
          <WaypointMarker color={theme.colors.primary} />
        </View>
      )}

      {/* Pin mode instruction hint */}
      {pinMode && (
        <View style={[styles.pinHintContainer, { top: insets.top + 56 }]} pointerEvents="none">
          <View style={styles.pinHint}>
            <Text style={styles.pinHintText}>Move the map to place the pin</Text>
          </View>
        </View>
      )}

      {/* Add location FAB — hidden during pin mode or when sheet is open */}
      {!pinMode && !selected && (
        <TouchableOpacity
          style={[styles.fab, { backgroundColor: theme.colors.primary, bottom: insets.bottom + 20 }]}
          onPress={enterPinMode}
          activeOpacity={0.85}
        >
          <Ionicons name="add" size={28} color="#fff" />
        </TouchableOpacity>
      )}

      {/* Pin mode action bar — Cancel (left) + Continue (right) */}
      {pinMode && (
        <View
          style={[
            styles.pinBar,
            { backgroundColor: theme.colors.surface, borderTopColor: theme.colors.border, paddingBottom: insets.bottom + 8 },
          ]}
        >
          <TouchableOpacity
            style={[styles.pinBtn, { borderColor: theme.colors.border }]}
            onPress={exitPinMode}
            activeOpacity={0.8}
          >
            <Text style={[styles.pinBtnText, { color: theme.colors.text }]}>Cancel</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.pinBtn, styles.pinBtnPrimary, { backgroundColor: theme.colors.primary }]}
            onPress={handlePinContinue}
            activeOpacity={0.8}
          >
            <Text style={[styles.pinBtnText, { color: '#fff' }]}>Continue</Text>
          </TouchableOpacity>
        </View>
      )}

      {/* Bottom sheet */}
      {!pinMode && (
        <BottomSheet
          location={selected}
          translateY={sheetY}
          onDismiss={hideSheet}
          onEdit={handleEdit}
          onShare={handleShare}
          onNavigate={handleNavigate}
        />
      )}
    </View>
  );
}

// ── Web fallback ──────────────────────────────────────────────────────────────

function WebFallback(): React.JSX.Element {
  const { theme } = useTheme();
  return (
    <View style={[styles.centered, { backgroundColor: theme.colors.background }]}>
      <Ionicons name="map-outline" size={48} color={theme.colors.textMuted} />
      <Text style={[styles.fallbackTitle, { color: theme.colors.text }]}>Map not available</Text>
      <Text style={[styles.fallbackSubtitle, { color: theme.colors.textMuted }]}>
        The map view requires a native build. Use the iOS or Android app to view the map.
      </Text>
    </View>
  );
}

// ── Export ────────────────────────────────────────────────────────────────────

export default function MapScreen(): React.JSX.Element {
  if (Platform.OS === 'web') return <WebFallback />;
  return <MapContent />;
}

// ── Styles ────────────────────────────────────────────────────────────────────

// Marker dimensions (must match WaypointMarker):
//   pin circle: 28px + 3px border = ~34px diameter
//   tail: 8px height, marginTop -2 → net 6px
//   total height = 28 + 6 = 34px; tip of tail is at bottom
const MARKER_TOTAL_HEIGHT = 34;
const MARKER_HALF_WIDTH = 17;

const styles = StyleSheet.create({
  centered: { flex: 1, justifyContent: 'center', alignItems: 'center', gap: 12, padding: 32 },
  mapContainer: { flex: 1 },
  map: { flex: 1 },

  // Waypoint marker
  markerOuter: { alignItems: 'center' },
  markerPin: {
    width: 28,
    height: 28,
    borderRadius: 14,
    borderWidth: 3,
    justifyContent: 'center',
    alignItems: 'center',
  },
  markerInner: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: 'rgba(255,255,255,0.9)',
  },
  markerTail: {
    width: 0,
    height: 0,
    borderLeftWidth: 6,
    borderRightWidth: 6,
    borderTopWidth: 8,
    borderLeftColor: 'transparent',
    borderRightColor: 'transparent',
    marginTop: -2,
  },

  // Layer toggle
  layerToggle: {
    position: 'absolute',
    right: 12,
    flexDirection: 'row',
    borderRadius: 10,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 4,
  },
  layerBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 10,
    paddingVertical: 8,
  },
  layerBtnText: { fontSize: 13, fontWeight: '600' },

  // Crosshair — tail tip anchored at exact screen center
  crosshairContainer: {
    position: 'absolute',
    top: '50%',
    left: '50%',
    marginTop: -MARKER_TOTAL_HEIGHT,
    marginLeft: -MARKER_HALF_WIDTH,
  },

  // Pin mode hint bubble
  pinHintContainer: {
    position: 'absolute',
    left: 0,
    right: 0,
    alignItems: 'center',
  },
  pinHint: {
    backgroundColor: 'rgba(0,0,0,0.65)',
    borderRadius: 20,
    paddingHorizontal: 16,
    paddingVertical: 8,
  },
  pinHintText: { color: '#fff', fontSize: 13, fontWeight: '500' },

  // Add location FAB
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

  // Pin mode action bar
  pinBar: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    flexDirection: 'row',
    gap: 12,
    paddingHorizontal: 16,
    paddingTop: 14,
    borderTopWidth: StyleSheet.hairlineWidth,
  },
  pinBtn: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: 12,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  pinBtnPrimary: { borderWidth: 0 },
  pinBtnText: { fontSize: 16, fontWeight: '700' },

  // Bottom sheet
  dismissLayer: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
  },
  sheet: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    borderTopLeftRadius: 16,
    borderTopRightRadius: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -3 },
    shadowOpacity: 0.15,
    shadowRadius: 10,
    elevation: 10,
    overflow: 'hidden',
  },
  sheetHandle: {
    width: 36,
    height: 4,
    borderRadius: 2,
    alignSelf: 'center',
    marginTop: 8,
    marginBottom: 4,
  },
  sheetAccent: { height: 3 },
  sheetContent: { paddingHorizontal: 16, paddingTop: 12 },
  sheetHeader: { flexDirection: 'row', alignItems: 'flex-start', gap: 8 },
  sheetName: { fontSize: 18, fontWeight: '700' },
  sheetMeta: { flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 4 },
  areaBadge: { flexDirection: 'row', alignItems: 'center', gap: 4, borderRadius: 6, paddingHorizontal: 7, paddingVertical: 3 },
  areaColorDot: { width: 8, height: 8, borderRadius: 4 },
  areaBadgeText: { fontSize: 12, fontWeight: '600' },
  sheetGroup: { fontSize: 12 },
  sheetClose: { padding: 4 },
  sheetNotes: { fontSize: 13, lineHeight: 18, marginTop: 8 },
  sheetStats: { marginTop: 8, paddingTop: 8, borderTopWidth: StyleSheet.hairlineWidth, minHeight: 16 },
  sheetActions: {
    flexDirection: 'row',
    gap: 10,
    marginTop: 12,
    paddingTop: 12,
    borderTopWidth: StyleSheet.hairlineWidth,
  },
  actionBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 10,
    borderRadius: 10,
  },
  actionLabel: { fontSize: 13, fontWeight: '600' },

  // Web fallback
  fallbackTitle: { fontSize: 18, fontWeight: '700' },
  fallbackSubtitle: { fontSize: 14, textAlign: 'center', lineHeight: 20 },
});
