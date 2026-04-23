/**
 * Add Location modal — shared form used from both map pin-drop and area tab GPS flow.
 * Receives lat/lng as search params; user fills in name, area, group, notes.
 */
import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ScrollView,
  StyleSheet,
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRouter, useLocalSearchParams } from 'expo-router';

import { useTheme } from '../../src/context/ThemeProvider';
import { useAreas } from '../../src/hooks/useLocations';
import { supabase } from '../../src/lib/supabase';
import type { AreaRow } from '../../src/types/database';

// ── Area picker (inline, not sticky — fits inside a scroll form) ──────────────

function AreaPicker({
  areas,
  selectedId,
  onSelect,
  error,
}: {
  areas: AreaRow[];
  selectedId: string | null;
  onSelect: (id: string) => void;
  error?: boolean;
}): React.JSX.Element {
  const { theme } = useTheme();
  const [open, setOpen] = useState(false);
  const selected = areas.find(a => a.id === selectedId);

  return (
    <View>
      <TouchableOpacity
        style={[
          styles.pickerTrigger,
          { backgroundColor: theme.colors.surface, borderColor: error ? '#E74C3C' : theme.colors.border },
        ]}
        onPress={() => setOpen(o => !o)}
        activeOpacity={0.8}
      >
        {selected ? (
          <View style={[styles.colorDot, { backgroundColor: selected.color }]} />
        ) : (
          <View style={[styles.colorDot, { backgroundColor: theme.colors.border }]} />
        )}
        <Text style={[styles.pickerLabel, { color: selected ? theme.colors.text : theme.colors.textMuted }]}>
          {selected?.name ?? 'Select area…'}
        </Text>
        <Ionicons name={open ? 'chevron-up' : 'chevron-down'} size={16} color={theme.colors.textMuted} />
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

// ── Field wrapper ─────────────────────────────────────────────────────────────

function Field({
  label,
  required,
  children,
  error,
}: {
  label: string;
  required?: boolean;
  children: React.ReactNode;
  error?: string;
}): React.JSX.Element {
  const { theme } = useTheme();
  return (
    <View style={styles.field}>
      <Text style={[styles.fieldLabel, { color: theme.colors.textSecondary }]}>
        {label}{required && <Text style={{ color: '#E74C3C' }}> *</Text>}
      </Text>
      {children}
      {error ? <Text style={styles.fieldError}>{error}</Text> : null}
    </View>
  );
}

// ── Screen ────────────────────────────────────────────────────────────────────

export default function AddLocationScreen(): React.JSX.Element {
  const { theme } = useTheme();
  const router = useRouter();
  const params = useLocalSearchParams<{ lat?: string; lng?: string }>();

  const { areas, loading: areasLoading } = useAreas();

  const [name, setName] = useState('');
  const [areaId, setAreaId] = useState<string | null>(null);
  const [group, setGroup] = useState('');
  const [notes, setNotes] = useState('');
  const [lat, setLat] = useState(params.lat ?? '');
  const [lng, setLng] = useState(params.lng ?? '');

  const [errors, setErrors] = useState<{ name?: string; area?: string; lat?: string; lng?: string }>({});
  const [saving, setSaving] = useState(false);

  // Default to first area if only one exists
  useEffect(() => {
    if (areas.length === 1 && !areaId) {
      setAreaId(areas[0].id);
    }
  }, [areas, areaId]);

  const validate = (): boolean => {
    const next: typeof errors = {};
    if (!name.trim()) next.name = 'Name is required';
    if (!areaId) next.area = 'Area is required';
    const latNum = parseFloat(lat);
    const lngNum = parseFloat(lng);
    if (isNaN(latNum) || latNum < -90 || latNum > 90) next.lat = 'Must be −90 to 90';
    if (isNaN(lngNum) || lngNum < -180 || lngNum > 180) next.lng = 'Must be −180 to 180';
    setErrors(next);
    return Object.keys(next).length === 0;
  };

  const handleSubmit = async () => {
    if (!validate()) return;
    setSaving(true);
    const { error } = await supabase.from('locations').insert({
      name: name.trim(),
      area_id: areaId!,
      group: group.trim() || null,
      notes: notes.trim() || null,
      latitude: parseFloat(lat),
      longitude: parseFloat(lng),
    } as any);
    setSaving(false);
    if (error) {
      Alert.alert('Error', error.message);
    } else {
      router.back();
    }
  };

  return (
    <KeyboardAvoidingView
      style={[styles.screen, { backgroundColor: theme.colors.background }]}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      {/* Header */}
      <View style={[styles.header, { borderBottomColor: theme.colors.border, backgroundColor: theme.colors.surface }]}>
        <TouchableOpacity onPress={() => router.back()} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
          <Ionicons name="close" size={24} color={theme.colors.text} />
        </TouchableOpacity>
        <Text style={[styles.headerTitle, { color: theme.colors.text }]}>Add Location</Text>
        <View style={{ width: 24 }} />
      </View>

      <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">

        <Field label="Name" required error={errors.name}>
          <TextInput
            style={[
              styles.input,
              { color: theme.colors.text, borderColor: errors.name ? '#E74C3C' : theme.colors.border, backgroundColor: theme.colors.surface },
            ]}
            value={name}
            onChangeText={setName}
            placeholder="Location name"
            placeholderTextColor={theme.colors.textMuted}
            returnKeyType="next"
          />
        </Field>

        <Field label="Area" required error={errors.area}>
          {areasLoading ? (
            <ActivityIndicator color={theme.colors.primary} style={{ alignSelf: 'flex-start', marginTop: 4 }} />
          ) : (
            <AreaPicker areas={areas} selectedId={areaId} onSelect={setAreaId} error={!!errors.area} />
          )}
        </Field>

        <Field label="Group">
          <TextInput
            style={[styles.input, { color: theme.colors.text, borderColor: theme.colors.border, backgroundColor: theme.colors.surface }]}
            value={group}
            onChangeText={setGroup}
            placeholder="Optional group name"
            placeholderTextColor={theme.colors.textMuted}
            returnKeyType="next"
          />
        </Field>

        <Field label="Notes">
          <TextInput
            style={[styles.input, styles.multiline, { color: theme.colors.text, borderColor: theme.colors.border, backgroundColor: theme.colors.surface }]}
            value={notes}
            onChangeText={setNotes}
            placeholder="Optional notes"
            placeholderTextColor={theme.colors.textMuted}
            multiline
            numberOfLines={3}
            textAlignVertical="top"
          />
        </Field>

        <View style={styles.coordRow}>
          <View style={{ flex: 1 }}>
            <Field label="Latitude" required error={errors.lat}>
              <TextInput
                style={[
                  styles.input,
                  { color: theme.colors.text, borderColor: errors.lat ? '#E74C3C' : theme.colors.border, backgroundColor: theme.colors.surface },
                ]}
                value={lat}
                onChangeText={setLat}
                placeholder="e.g. 37.7749"
                placeholderTextColor={theme.colors.textMuted}
                keyboardType="decimal-pad"
              />
            </Field>
          </View>
          <View style={{ flex: 1 }}>
            <Field label="Longitude" required error={errors.lng}>
              <TextInput
                style={[
                  styles.input,
                  { color: theme.colors.text, borderColor: errors.lng ? '#E74C3C' : theme.colors.border, backgroundColor: theme.colors.surface },
                ]}
                value={lng}
                onChangeText={setLng}
                placeholder="e.g. -122.4194"
                placeholderTextColor={theme.colors.textMuted}
                keyboardType="decimal-pad"
              />
            </Field>
          </View>
        </View>

        <TouchableOpacity
          style={[styles.submitBtn, { backgroundColor: theme.colors.primary }, (saving || !name.trim()) && { opacity: 0.6 }]}
          onPress={handleSubmit}
          disabled={saving}
          activeOpacity={0.8}
        >
          {saving
            ? <ActivityIndicator color="#fff" />
            : <Text style={styles.submitText}>Save Location</Text>
          }
        </TouchableOpacity>

      </ScrollView>
    </KeyboardAvoidingView>
  );
}

// ── Styles ────────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  screen: { flex: 1 },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  headerTitle: { fontSize: 17, fontWeight: '700' },
  content: { padding: 16, gap: 4, paddingBottom: 40 },

  field: { gap: 6, marginBottom: 12 },
  fieldLabel: { fontSize: 13, fontWeight: '600', textTransform: 'uppercase', letterSpacing: 0.5 },
  fieldError: { fontSize: 12, color: '#E74C3C', marginTop: 2 },

  input: {
    borderWidth: 1,
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 11,
    fontSize: 15,
  },
  multiline: { minHeight: 80, paddingTop: 11 },

  pickerTrigger: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    borderWidth: 1,
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 11,
  },
  pickerLabel: { flex: 1, fontSize: 15 },
  colorDot: { width: 12, height: 12, borderRadius: 6 },
  dropdown: {
    borderWidth: 1,
    borderRadius: 10,
    marginTop: 4,
    overflow: 'hidden',
  },
  dropdownRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingHorizontal: 12,
    paddingVertical: 12,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  dropdownText: { flex: 1, fontSize: 15 },

  coordRow: { flexDirection: 'row', gap: 12 },

  submitBtn: {
    marginTop: 8,
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: 'center',
  },
  submitText: { color: '#fff', fontSize: 16, fontWeight: '700' },
});
