/**
 * Edit Enums modal — admin screen for managing editable enum values
 * Generic implementation adapted from brew-events
 */
import React, { useState, useCallback } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  TextInput,
  Alert,
  FlatList,
} from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import Toast from 'react-native-toast-message';

import { useTheme } from '../../src/context/ThemeProvider';
import { useAuth } from '../../src/hooks/useAuth';
import { useEditableEnums } from '../../src/hooks/useEditableEnums';
import { useEnumContext } from '../../src/context/EnumProvider';
import { AdminGuard } from '../../src/components/auth';
import { PAGE_IDS } from '../../src/constants/version';
import { PageIdDisplay } from '../../src/components/common';

export default function EditEnumsScreen(): React.JSX.Element {
  return (
    <AdminGuard>
      <EditEnumsContent />
    </AdminGuard>
  );
}

function EditEnumsContent(): React.JSX.Element {
  const { theme } = useTheme();
  const router = useRouter();
  const { enumData, refreshEnums, loading } = useEnumContext();
  const { addEnumValue, updateEnumValue, deleteEnumValue } = useEditableEnums();

  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [addingValue, setAddingValue] = useState('');
  const [isSaving, setIsSaving] = useState(false);

  const categories = Object.keys(enumData).sort();

  const handleAdd = useCallback(async () => {
    if (!selectedCategory || !addingValue.trim()) return;
    setIsSaving(true);
    try {
      await addEnumValue(selectedCategory, addingValue.trim());
      setAddingValue('');
      await refreshEnums();
      Toast.show({ type: 'success', text1: 'Value added' });
    } catch (e: any) {
      Toast.show({ type: 'error', text1: 'Failed to add', text2: e.message });
    } finally {
      setIsSaving(false);
    }
  }, [selectedCategory, addingValue, addEnumValue, refreshEnums]);

  const handleDelete = useCallback(
    (id: string, value: string) => {
      Alert.alert('Delete value', `Remove "${value}"?`, [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              await deleteEnumValue(id);
              await refreshEnums();
              Toast.show({ type: 'success', text1: 'Value deleted' });
            } catch (e: any) {
              Toast.show({ type: 'error', text1: 'Delete failed', text2: e.message });
            }
          },
        },
      ]);
    },
    [deleteEnumValue, refreshEnums]
  );

  const handleToggleActive = useCallback(
    async (id: string, currentActive: boolean) => {
      try {
        await updateEnumValue(id, { is_active: !currentActive });
        await refreshEnums();
      } catch (e: any) {
        Toast.show({ type: 'error', text1: 'Update failed', text2: e.message });
      }
    },
    [updateEnumValue, refreshEnums]
  );

  const s = makeStyles(theme);

  const selectedValues = selectedCategory ? (enumData[selectedCategory] ?? []) : [];

  return (
    <View style={[s.container, { backgroundColor: theme.colors.background }]}>
      <PageIdDisplay pageId={PAGE_IDS.EDIT_ENUMS} />

      {/* Header */}
      <View style={[s.header, { backgroundColor: theme.colors.surface, borderBottomColor: theme.colors.border }]}>
        <TouchableOpacity onPress={() => router.back()} style={s.closeBtn}>
          <Ionicons name="close" size={22} color={theme.colors.text} />
        </TouchableOpacity>
        <Text style={[s.headerTitle, { color: theme.colors.text }]}>Edit Enum Values</Text>
        {loading && <ActivityIndicator size="small" color={theme.colors.primary} />}
      </View>

      <View style={s.body}>
        {/* Category list */}
        <View style={[s.sidebar, { backgroundColor: theme.colors.surface, borderRightColor: theme.colors.border }]}>
          <Text style={[s.sidebarLabel, { color: theme.colors.textSecondary }]}>Categories</Text>
          {categories.length === 0 && !loading && (
            <Text style={[s.empty, { color: theme.colors.textMuted }]}>No categories yet</Text>
          )}
          {categories.map(cat => (
            <TouchableOpacity
              key={cat}
              style={[
                s.catRow,
                { borderBottomColor: theme.colors.border },
                selectedCategory === cat && { backgroundColor: theme.colors.primary + '22' },
              ]}
              onPress={() => setSelectedCategory(cat)}
            >
              <Text
                style={[
                  s.catText,
                  { color: selectedCategory === cat ? theme.colors.primary : theme.colors.text },
                ]}
                numberOfLines={1}
              >
                {cat}
              </Text>
              <Text style={[s.catCount, { color: theme.colors.textMuted }]}>
                {(enumData[cat] ?? []).length}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        {/* Values panel */}
        <View style={s.panel}>
          {!selectedCategory ? (
            <Text style={[s.emptyPanel, { color: theme.colors.textMuted }]}>
              Select a category to edit its values
            </Text>
          ) : (
            <>
              <Text style={[s.panelTitle, { color: theme.colors.text }]}>{selectedCategory}</Text>

              {/* Add new value */}
              <View style={s.addRow}>
                <TextInput
                  style={[s.addInput, { backgroundColor: theme.colors.surface, color: theme.colors.text, borderColor: theme.colors.border }]}
                  value={addingValue}
                  onChangeText={setAddingValue}
                  placeholder="New value..."
                  placeholderTextColor={theme.colors.textMuted}
                  returnKeyType="done"
                  onSubmitEditing={handleAdd}
                />
                <TouchableOpacity
                  style={[s.addBtn, { backgroundColor: theme.colors.primary }, isSaving && s.disabled]}
                  onPress={handleAdd}
                  disabled={isSaving || !addingValue.trim()}
                >
                  {isSaving ? (
                    <ActivityIndicator size="small" color="#fff" />
                  ) : (
                    <Ionicons name="add" size={20} color="#fff" />
                  )}
                </TouchableOpacity>
              </View>

              {/* Values list */}
              <FlatList
                data={selectedValues}
                keyExtractor={item => item.id}
                renderItem={({ item }) => (
                  <View style={[s.valueRow, { borderBottomColor: theme.colors.border }]}>
                    <Text
                      style={[
                        s.valueText,
                        { color: item.isActive ? theme.colors.text : theme.colors.textMuted },
                      ]}
                    >
                      {item.value}
                    </Text>
                    <TouchableOpacity
                      style={[s.toggleBtn, { borderColor: item.isActive ? theme.colors.primary : theme.colors.border }]}
                      onPress={() => handleToggleActive(item.id, item.isActive)}
                    >
                      <Text style={[s.toggleText, { color: item.isActive ? theme.colors.primary : theme.colors.textMuted }]}>
                        {item.isActive ? 'Active' : 'Hidden'}
                      </Text>
                    </TouchableOpacity>
                    <TouchableOpacity onPress={() => handleDelete(item.id, item.value)}>
                      <Ionicons name="trash-outline" size={18} color={theme.colors.error ?? '#e74c3c'} />
                    </TouchableOpacity>
                  </View>
                )}
                ListEmptyComponent={
                  <Text style={[s.empty, { color: theme.colors.textMuted }]}>No values yet</Text>
                }
              />
            </>
          )}
        </View>
      </View>
    </View>
  );
}

const makeStyles = (theme: any) =>
  StyleSheet.create({
    container: { flex: 1 },
    header: {
      flexDirection: 'row',
      alignItems: 'center',
      paddingHorizontal: 16,
      paddingVertical: 14,
      borderBottomWidth: StyleSheet.hairlineWidth,
      gap: 12,
    },
    closeBtn: { padding: 2 },
    headerTitle: { flex: 1, fontSize: 17, fontWeight: '700' },
    body: { flex: 1, flexDirection: 'row' },
    sidebar: {
      width: 160,
      borderRightWidth: StyleSheet.hairlineWidth,
    },
    sidebarLabel: {
      fontSize: 11,
      fontWeight: '600',
      textTransform: 'uppercase',
      letterSpacing: 0.5,
      padding: 12,
      paddingBottom: 6,
    },
    catRow: {
      flexDirection: 'row',
      alignItems: 'center',
      paddingHorizontal: 12,
      paddingVertical: 10,
      borderBottomWidth: StyleSheet.hairlineWidth,
    },
    catText: { flex: 1, fontSize: 13, fontWeight: '500' },
    catCount: { fontSize: 12 },
    panel: { flex: 1, padding: 16 },
    panelTitle: { fontSize: 18, fontWeight: '700', marginBottom: 12 },
    emptyPanel: { flex: 1, textAlign: 'center', paddingTop: 60, fontSize: 14 },
    addRow: { flexDirection: 'row', gap: 8, marginBottom: 16 },
    addInput: {
      flex: 1,
      borderWidth: 1,
      borderRadius: 8,
      paddingHorizontal: 12,
      paddingVertical: 8,
      fontSize: 14,
    },
    addBtn: { borderRadius: 8, paddingHorizontal: 14, justifyContent: 'center', alignItems: 'center' },
    disabled: { opacity: 0.5 },
    valueRow: {
      flexDirection: 'row',
      alignItems: 'center',
      paddingVertical: 10,
      borderBottomWidth: StyleSheet.hairlineWidth,
      gap: 10,
    },
    valueText: { flex: 1, fontSize: 14 },
    toggleBtn: { borderWidth: 1, borderRadius: 12, paddingHorizontal: 8, paddingVertical: 3 },
    toggleText: { fontSize: 11, fontWeight: '600' },
    empty: { fontSize: 13, padding: 12 },
  });
