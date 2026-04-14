/**
 * EventTile — generic event card for time-indexed apps
 *
 * Core logic: renders entity with time, title, optional tags.
 * TODO: [BASE-APP SETUP NEEDED] Apply app branding (colors, typography, field names)
 * after running TIME_INDEX_PROMPT.md
 */
import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { format } from 'date-fns';

import { useTheme } from '../../context/ThemeProvider';

// Generic event shape — AI replaces with app entity fields from PRD.md
export interface TimeIndexedEvent {
  id: string;
  title: string;
  startTime: Date | string;
  endTime?: Date | string;
  /** Tag/category values from editable enums */
  tags?: string[];
  /** Any additional fields specific to the app entity */
  [key: string]: any;
}

interface Props {
  event: TimeIndexedEvent;
  onPress?: (event: TimeIndexedEvent) => void;
  /** Show full date or just time */
  showDate?: boolean;
  compact?: boolean;
}

export function EventTile({ event, onPress, showDate = false, compact = false }: Props): React.JSX.Element {
  const { theme } = useTheme();

  const start = new Date(event.startTime);
  const timeStr = format(start, 'h:mm a');
  const dateStr = showDate ? format(start, 'EEE, MMM d') : null;

  const s = makeStyles(theme);

  return (
    // TODO: Apply app branding to this card (background, border, shadow, radius)
    <TouchableOpacity
      style={[s.card, { backgroundColor: theme.colors.surface, borderLeftColor: theme.colors.primary }]}
      onPress={() => onPress?.(event)}
      activeOpacity={0.75}
    >
      {/* Time column */}
      <View style={s.timeCol}>
        {dateStr && <Text style={[s.date, { color: theme.colors.textMuted }]}>{dateStr}</Text>}
        <Text style={[s.time, { color: theme.colors.primary }]}>{timeStr}</Text>
        {event.endTime && (
          <Text style={[s.endTime, { color: theme.colors.textMuted }]}>
            {format(new Date(event.endTime), 'h:mm a')}
          </Text>
        )}
      </View>

      {/* Content column */}
      <View style={s.content}>
        {/* TODO: Replace "title" with your entity's name field from PRD.md */}
        <Text style={[s.title, { color: theme.colors.text }]} numberOfLines={compact ? 1 : 2}>
          {event.title}
        </Text>

        {/* Tags row */}
        {event.tags && event.tags.length > 0 && (
          <View style={s.tags}>
            {event.tags.map(tag => (
              <View key={tag} style={[s.tag, { backgroundColor: theme.colors.primary + '22' }]}>
                {/* TODO: Apply app-specific tag color logic */}
                <Text style={[s.tagText, { color: theme.colors.primary }]}>{tag}</Text>
              </View>
            ))}
          </View>
        )}
      </View>

      <Ionicons name="chevron-forward" size={14} color={theme.colors.textMuted} style={s.chevron} />
    </TouchableOpacity>
  );
}

const makeStyles = (theme: any) =>
  StyleSheet.create({
    card: {
      // TODO: Apply app branding here
      flexDirection: 'row',
      alignItems: 'flex-start',
      marginHorizontal: 12,
      marginVertical: 4,
      borderRadius: 8,
      borderLeftWidth: 3,
      padding: 12,
      gap: 10,
    },
    timeCol: { alignItems: 'flex-end', minWidth: 56 },
    date: { fontSize: 10, fontWeight: '500' },
    time: { fontSize: 13, fontWeight: '700' },
    endTime: { fontSize: 10 },
    content: { flex: 1 },
    title: { fontSize: 15, fontWeight: '600', lineHeight: 20 },
    tags: { flexDirection: 'row', flexWrap: 'wrap', gap: 4, marginTop: 6 },
    tag: { borderRadius: 10, paddingHorizontal: 8, paddingVertical: 2 },
    tagText: { fontSize: 11, fontWeight: '500' },
    chevron: { alignSelf: 'center' },
  });
