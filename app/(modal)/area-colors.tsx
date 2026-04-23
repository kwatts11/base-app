/**
 * Area Colors modal — admin management of area names and map colors.
 * Accessible from Admin → Configuration → Area Colors.
 */
import React, { useState, useCallback } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  TextInput,
  StyleSheet,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';

import { useTheme } from '../../src/context/ThemeProvider';
import { useAuth } from '../../src/hooks/useAuth';
import { ManagerGuard } from '../../src/components/auth';
import { supabase } from '../../src/lib/supabase';
import { useAreas } from '../../src/hooks/useLocations';
import type { AreaRow } from '../../src/types/database';

// ── Color palette ─────────────────────────────────────────────────────────────

const PRESET_COLORS = [
  '#E74C3C', // red
  '#E67E22', // orange
  '#F1C40F', // yellow
  '#2ECC71', // green
  '#1ABC9C', // teal
  '#3498DB', // blue
  '#9B59B6', // purple
  '#E91E63', // pink
  '#FF5722', // deep orange
  '#607D8B', // blue-grey
];

// ── Area row (editable) ───────────────────────────────────────────────────────

interface AreaRowItemProps {
  area: AreaRow;
  onSave: (id: string, name: string, color: string) => Promise<void>;
  onDelete: (id: string, name: string) => void;
}

function AreaRowItem({ area, onSave, onDelete }: AreaRowItemProps): React.JSX.Element {
  const { theme } = useTheme();
  const [editing, setEditing] = useState(false);
  const [name, setName] = useState(area.name);
  const [color, setColor] = useState(area.color);
  const [hexInput, setHexInput] = useState(area.color);
  const [saving, setSaving] = useState(false);

  const handleSave = async () => {
    if (!name.trim()) return;
    setSaving(true);
    await onSave(area.id, name.trim(), color);
    setSaving(false);
    setEditing(false);
  };

  const handleCancel = () => {
    setName(area.name);
    setColor(area.color);
    setHexInput(area.color);
    setEditing(false);
  };

  const handleHexChange = (val: string) => {
    setHexInput(val);
    if (/^#[0-9A-Fa-f]{6}$/.test(val)) {
      setColor(val);
    }
  };

  const selectColor = (c: string) => {
    setColor(c);
    setHexInput(c);
  };

  if (!editing) {
    return (
      <View style={[styles.row, { borderBottomColor: theme.colors.border }]}>
        <View style={[styles.colorSwatch, { backgroundColor: area.color }]} />
        <Text style={[styles.rowName, { color: theme.colors.text }]}>{area.name}</Text>
        <Text style={[styles.rowHex, { color: theme.colors.textMuted }]}>{area.color}</Text>
        <TouchableOpacity onPress={() => setEditing(true)} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
          <Ionicons name="pencil-outline" size={18} color={theme.colors.textMuted} />
        </TouchableOpacity>
        <TouchableOpacity onPress={() => onDelete(area.id, area.name)} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
          <Ionicons name="trash-outline" size={18} color="#E74C3C" />
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <View style={[styles.editBlock, { borderBottomColor: theme.colors.border, backgroundColor: theme.colors.background }]}>
      <TextInput
        style={[styles.nameInput, { color: theme.colors.text, borderColor: theme.colors.border, backgroundColor: theme.colors.surface }]}
        value={name}
        onChangeText={setName}
        placeholder="Area name"
        placeholderTextColor={theme.colors.textMuted}
      />

      {/* Preset palette */}
      <View style={styles.palette}>
        {PRESET_COLORS.map(c => (
          <TouchableOpacity
            key={c}
            style={[
              styles.paletteColor,
              { backgroundColor: c },
              color === c && styles.paletteColorSelected,
            ]}
            onPress={() => selectColor(c)}
            activeOpacity={0.8}
          >
            {color === c && <Ionicons name="checkmark" size={14} color="#fff" />}
          </TouchableOpacity>
        ))}
      </View>

      {/* Hex input */}
      <View style={styles.hexRow}>
        <View style={[styles.hexPreview, { backgroundColor: color }]} />
        <TextInput
          style={[styles.hexInput, { color: theme.colors.text, borderColor: theme.colors.border, backgroundColor: theme.colors.surface }]}
          value={hexInput}
          onChangeText={handleHexChange}
          placeholder="#000000"
          placeholderTextColor={theme.colors.textMuted}
          autoCapitalize="none"
          maxLength={7}
        />
      </View>

      {/* Save / cancel */}
      <View style={styles.editActions}>
        <TouchableOpacity
          style={[styles.editBtn, { borderColor: theme.colors.border }]}
          onPress={handleCancel}
          disabled={saving}
        >
          <Text style={[styles.editBtnText, { color: theme.colors.textSecondary }]}>Cancel</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.editBtn, styles.editBtnPrimary, { backgroundColor: theme.colors.primary }]}
          onPress={handleSave}
          disabled={saving || !name.trim()}
        >
          {saving
            ? <ActivityIndicator size="small" color="#fff" />
            : <Text style={[styles.editBtnText, { color: '#fff' }]}>Save</Text>
          }
        </TouchableOpacity>
      </View>
    </View>
  );
}

// ── Add area form ─────────────────────────────────────────────────────────────

interface AddAreaFormProps {
  onAdd: (name: string, color: string) => Promise<void>;
}

function AddAreaForm({ onAdd }: AddAreaFormProps): React.JSX.Element {
  const { theme } = useTheme();
  const [open, setOpen] = useState(false);
  const [name, setName] = useState('');
  const [color, setColor] = useState(PRESET_COLORS[0]);
  const [hexInput, setHexInput] = useState(PRESET_COLORS[0]);
  const [saving, setSaving] = useState(false);

  const handleAdd = async () => {
    if (!name.trim()) return;
    setSaving(true);
    await onAdd(name.trim(), color);
    setName('');
    setColor(PRESET_COLORS[0]);
    setHexInput(PRESET_COLORS[0]);
    setSaving(false);
    setOpen(false);
  };

  const handleHexChange = (val: string) => {
    setHexInput(val);
    if (/^#[0-9A-Fa-f]{6}$/.test(val)) setColor(val);
  };

  if (!open) {
    return (
      <TouchableOpacity
        style={[styles.addBtn, { borderColor: theme.colors.primary }]}
        onPress={() => setOpen(true)}
        activeOpacity={0.8}
      >
        <Ionicons name="add-circle-outline" size={20} color={theme.colors.primary} />
        <Text style={[styles.addBtnText, { color: theme.colors.primary }]}>Add Area</Text>
      </TouchableOpacity>
    );
  }

  return (
    <View style={[styles.addForm, { backgroundColor: theme.colors.surface, borderColor: theme.colors.border }]}>
      <Text style={[styles.addFormTitle, { color: theme.colors.text }]}>New Area</Text>
      <TextInput
        style={[styles.nameInput, { color: theme.colors.text, borderColor: theme.colors.border, backgroundColor: theme.colors.background }]}
        value={name}
        onChangeText={setName}
        placeholder="Area name"
        placeholderTextColor={theme.colors.textMuted}
        autoFocus
      />
      <View style={styles.palette}>
        {PRESET_COLORS.map(c => (
          <TouchableOpacity
            key={c}
            style={[styles.paletteColor, { backgroundColor: c }, color === c && styles.paletteColorSelected]}
            onPress={() => { setColor(c); setHexInput(c); }}
            activeOpacity={0.8}
          >
            {color === c && <Ionicons name="checkmark" size={14} color="#fff" />}
          </TouchableOpacity>
        ))}
      </View>
      <View style={styles.hexRow}>
        <View style={[styles.hexPreview, { backgroundColor: color }]} />
        <TextInput
          style={[styles.hexInput, { color: theme.colors.text, borderColor: theme.colors.border, backgroundColor: theme.colors.background }]}
          value={hexInput}
          onChangeText={handleHexChange}
          placeholder="#000000"
          placeholderTextColor={theme.colors.textMuted}
          autoCapitalize="none"
          maxLength={7}
        />
      </View>
      <View style={styles.editActions}>
        <TouchableOpacity
          style={[styles.editBtn, { borderColor: theme.colors.border }]}
          onPress={() => { setOpen(false); setName(''); }}
        >
          <Text style={[styles.editBtnText, { color: theme.colors.textSecondary }]}>Cancel</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.editBtn, styles.editBtnPrimary, { backgroundColor: theme.colors.primary }]}
          onPress={handleAdd}
          disabled={saving || !name.trim()}
        >
          {saving
            ? <ActivityIndicator size="small" color="#fff" />
            : <Text style={[styles.editBtnText, { color: '#fff' }]}>Add</Text>
          }
        </TouchableOpacity>
      </View>
    </View>
  );
}

// ── Screen ────────────────────────────────────────────────────────────────────

export default function AreaColorsScreen(): React.JSX.Element {
  return (
    <ManagerGuard>
      <AreaColorsContent />
    </ManagerGuard>
  );
}

function AreaColorsContent(): React.JSX.Element {
  const { theme } = useTheme();
  const router = useRouter();
  const { areas, loading, refresh } = useAreas();

  const handleSave = useCallback(async (id: string, name: string, color: string) => {
    const { error } = await supabase
      .from('areas')
      .update({ name, color })
      .eq('id', id);
    if (error) Alert.alert('Error', error.message);
    else refresh();
  }, [refresh]);

  const handleDelete = useCallback((id: string, name: string) => {
    Alert.alert(
      'Delete Area',
      `Delete "${name}"? Locations in this area cannot be deleted if any exist.`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            const { error } = await supabase.from('areas').delete().eq('id', id);
            if (error) Alert.alert('Error', error.message);
            else refresh();
          },
        },
      ]
    );
  }, [refresh]);

  const handleAdd = useCallback(async (name: string, color: string) => {
    const maxOrder = areas.length > 0
      ? Math.max(...areas.map(a => a.display_order)) + 1
      : 0;
    const { error } = await supabase
      .from('areas')
      .insert({ name, color, display_order: maxOrder, active: true });
    if (error) Alert.alert('Error', error.message);
    else refresh();
  }, [areas, refresh]);

  return (
    <View style={[styles.screen, { backgroundColor: theme.colors.background }]}>
      {/* Header */}
      <View style={[styles.header, { borderBottomColor: theme.colors.border, backgroundColor: theme.colors.surface }]}>
        <TouchableOpacity onPress={() => router.back()} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
          <Ionicons name="close" size={24} color={theme.colors.text} />
        </TouchableOpacity>
        <Text style={[styles.headerTitle, { color: theme.colors.text }]}>Area Colors</Text>
        <View style={{ width: 24 }} />
      </View>

      {loading ? (
        <View style={styles.centered}>
          <ActivityIndicator color={theme.colors.primary} />
        </View>
      ) : (
        <ScrollView contentContainerStyle={styles.content}>
          <Text style={[styles.sectionLabel, { color: theme.colors.textSecondary }]}>AREAS</Text>

          {areas.length === 0 ? (
            <View style={[styles.emptyCard, { backgroundColor: theme.colors.surface }]}>
              <Text style={[styles.emptyText, { color: theme.colors.textMuted }]}>
                No areas yet. Add one below.
              </Text>
            </View>
          ) : (
            <View style={[styles.listCard, { backgroundColor: theme.colors.surface }]}>
              {areas.map(area => (
                <AreaRowItem
                  key={area.id}
                  area={area}
                  onSave={handleSave}
                  onDelete={handleDelete}
                />
              ))}
            </View>
          )}

          <AddAreaForm onAdd={handleAdd} />
        </ScrollView>
      )}
    </View>
  );
}

// ── Styles ────────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  screen: { flex: 1 },
  centered: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  headerTitle: { fontSize: 17, fontWeight: '700' },
  content: { padding: 16, gap: 12 },
  sectionLabel: { fontSize: 11, fontWeight: '700', letterSpacing: 1 },

  listCard: { borderRadius: 12, overflow: 'hidden' },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  colorSwatch: { width: 24, height: 24, borderRadius: 6 },
  rowName: { flex: 1, fontSize: 15, fontWeight: '500' },
  rowHex: { fontSize: 12, fontFamily: 'monospace' },

  editBlock: {
    padding: 14,
    gap: 12,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  nameInput: {
    borderWidth: 1,
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 9,
    fontSize: 15,
  },
  palette: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
  },
  paletteColor: {
    width: 32,
    height: 32,
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
  },
  paletteColorSelected: {
    borderWidth: 2,
    borderColor: '#fff',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.3,
    shadowRadius: 3,
    elevation: 3,
  },
  hexRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  hexPreview: { width: 32, height: 32, borderRadius: 8 },
  hexInput: {
    flex: 1,
    borderWidth: 1,
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 9,
    fontSize: 14,
    fontFamily: 'monospace',
  },
  editActions: { flexDirection: 'row', gap: 10 },
  editBtn: {
    flex: 1,
    paddingVertical: 10,
    borderRadius: 8,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  editBtnPrimary: { borderWidth: 0 },
  editBtnText: { fontSize: 14, fontWeight: '600' },

  addBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    borderWidth: 1,
    borderStyle: 'dashed',
    borderRadius: 12,
    paddingVertical: 14,
  },
  addBtnText: { fontSize: 15, fontWeight: '600' },
  addForm: {
    borderWidth: 1,
    borderRadius: 12,
    padding: 14,
    gap: 12,
  },
  addFormTitle: { fontSize: 15, fontWeight: '700' },

  emptyCard: { borderRadius: 12, padding: 20, alignItems: 'center' },
  emptyText: { fontSize: 14 },
});
