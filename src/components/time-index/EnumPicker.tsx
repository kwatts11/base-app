/**
 * EnumPicker — multi-select tag picker backed by EnumProvider
 * Fully functional — no TODOs needed here
 */
import React, { useMemo } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, ScrollView } from 'react-native';

import { useTheme } from '../../context/ThemeProvider';
import { useEnumOptions } from '../../context/EnumProvider';

interface Props {
  /** Enum category name from editable_enums table */
  enumType: string;
  /** Currently selected values */
  selected: string[];
  /** Called with updated selection */
  onChange: (selected: string[]) => void;
  /** Label shown above the picker */
  label?: string;
  /** Allow picking only one value */
  singleSelect?: boolean;
}

export function EnumPicker({ enumType, selected, onChange, label, singleSelect = false }: Props): React.JSX.Element {
  const { theme } = useTheme();
  const options = useEnumOptions(enumType);

  const toggle = (value: string) => {
    if (singleSelect) {
      onChange(selected.includes(value) ? [] : [value]);
      return;
    }
    if (selected.includes(value)) {
      onChange(selected.filter(v => v !== value));
    } else {
      onChange([...selected, value]);
    }
  };

  const s = makeStyles(theme);

  return (
    <View style={s.container}>
      {label && <Text style={[s.label, { color: theme.colors.textSecondary }]}>{label}</Text>}
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={s.scroll}>
        {options.map(opt => {
          const isSelected = selected.includes(opt.value);
          return (
            <TouchableOpacity
              key={opt.id}
              style={[
                s.chip,
                { borderColor: isSelected ? theme.colors.primary : theme.colors.border },
                isSelected && { backgroundColor: theme.colors.primary + '22' },
              ]}
              onPress={() => toggle(opt.value)}
            >
              <Text style={[s.chipText, { color: isSelected ? theme.colors.primary : theme.colors.textSecondary }]}>
                {opt.value}
              </Text>
            </TouchableOpacity>
          );
        })}
        {options.length === 0 && (
          <Text style={[s.empty, { color: theme.colors.textMuted }]}>
            No options for "{enumType}"
          </Text>
        )}
      </ScrollView>
    </View>
  );
}

const makeStyles = (theme: any) =>
  StyleSheet.create({
    container: { gap: 6 },
    label: { fontSize: 13, fontWeight: '600' },
    scroll: { flexDirection: 'row', gap: 6, paddingVertical: 2 },
    chip: {
      borderWidth: 1,
      borderRadius: 16,
      paddingHorizontal: 12,
      paddingVertical: 6,
    },
    chipText: { fontSize: 13, fontWeight: '500' },
    empty: { fontSize: 13, fontStyle: 'italic' },
  });
