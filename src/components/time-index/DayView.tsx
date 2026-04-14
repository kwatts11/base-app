/**
 * DayView — scrollable list of events for a single day
 *
 * Data fetch and navigation wired. Visual styling uses placeholder colors.
 * TODO: [BASE-APP SETUP NEEDED] Apply app branding and replace generic entity names
 */
import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  RefreshControl,
  ActivityIndicator,
  StyleSheet,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { format, addDays, subDays, isToday, startOfDay, endOfDay } from 'date-fns';

import { useTheme } from '../../context/ThemeProvider';
import { supabase } from '../../lib/supabase';
import { EventTile, TimeIndexedEvent } from './EventTile';

interface Props {
  /** Table name to query — set to your entity table from PRD.md */
  tableName?: string;
  /** Column that holds the start time */
  timeColumn?: string;
  /** Columns to select */
  selectColumns?: string;
  /** Transform raw DB row to TimeIndexedEvent */
  transformRow?: (row: any) => TimeIndexedEvent;
  /** Called when user taps an event tile */
  onEventPress?: (event: TimeIndexedEvent) => void;
}

export function DayView({
  // TODO: [BASE-APP SETUP NEEDED] — AI sets these from PRD.md entity definition
  tableName = 'events',
  timeColumn = 'start_time',
  selectColumns = '*',
  transformRow = defaultTransform,
  onEventPress,
}: Props): React.JSX.Element {
  const { theme } = useTheme();
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [events, setEvents] = useState<TimeIndexedEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const fetchEvents = useCallback(
    async (date: Date, silent = false) => {
      if (!silent) setLoading(true);
      try {
        const { data, error } = await supabase
          .from(tableName)
          .select(selectColumns)
          .gte(timeColumn, startOfDay(date).toISOString())
          .lte(timeColumn, endOfDay(date).toISOString())
          .order(timeColumn, { ascending: true });

        if (error) throw error;
        setEvents((data ?? []).map(transformRow));
      } catch (e) {
        console.warn('[DayView] Fetch error:', e);
      } finally {
        setLoading(false);
        setRefreshing(false);
      }
    },
    [tableName, timeColumn, selectColumns, transformRow]
  );

  useEffect(() => {
    fetchEvents(selectedDate);
  }, [selectedDate, fetchEvents]);

  const goBack = () => setSelectedDate(d => subDays(d, 1));
  const goForward = () => setSelectedDate(d => addDays(d, 1));
  const goToday = () => setSelectedDate(new Date());

  const s = makeStyles(theme);

  return (
    <View style={[s.container, { backgroundColor: theme.colors.background }]}>
      {/* TODO: Apply app branding to date navigation header */}
      <View style={[s.header, { backgroundColor: theme.colors.surface, borderBottomColor: theme.colors.border }]}>
        <TouchableOpacity onPress={goBack} style={s.navBtn}>
          <Ionicons name="chevron-back" size={22} color={theme.colors.text} />
        </TouchableOpacity>

        <TouchableOpacity onPress={goToday} style={s.dateCenter}>
          <Text style={[s.dateText, { color: theme.colors.text }]}>
            {isToday(selectedDate) ? 'Today' : format(selectedDate, 'EEE, MMM d')}
          </Text>
          <Text style={[s.dateSubtext, { color: theme.colors.textSecondary }]}>
            {format(selectedDate, 'MMMM d, yyyy')}
          </Text>
        </TouchableOpacity>

        <TouchableOpacity onPress={goForward} style={s.navBtn}>
          <Ionicons name="chevron-forward" size={22} color={theme.colors.text} />
        </TouchableOpacity>
      </View>

      {loading ? (
        <View style={s.center}>
          <ActivityIndicator size="large" color={theme.colors.primary} />
        </View>
      ) : (
        <ScrollView
          contentContainerStyle={s.list}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={() => {
                setRefreshing(true);
                fetchEvents(selectedDate, true);
              }}
              tintColor={theme.colors.primary}
            />
          }
        >
          {events.length === 0 ? (
            <View style={s.empty}>
              <Ionicons name="calendar-outline" size={48} color={theme.colors.textMuted} />
              {/* TODO: [BASE-APP SETUP NEEDED] Replace "events" with entity name from PRD.md */}
              <Text style={[s.emptyText, { color: theme.colors.textMuted }]}>
                No events for this day
              </Text>
            </View>
          ) : (
            events.map(event => (
              <EventTile key={event.id} event={event} onPress={onEventPress} />
            ))
          )}
        </ScrollView>
      )}
    </View>
  );
}

function defaultTransform(row: any): TimeIndexedEvent {
  return {
    id: row.id,
    title: row.title ?? row.name ?? 'Untitled',
    startTime: row.start_time,
    endTime: row.end_time,
    tags: [],
    ...row,
  };
}

const makeStyles = (theme: any) =>
  StyleSheet.create({
    container: { flex: 1 },
    header: {
      flexDirection: 'row',
      alignItems: 'center',
      paddingVertical: 10,
      paddingHorizontal: 4,
      borderBottomWidth: StyleSheet.hairlineWidth,
    },
    navBtn: { padding: 10 },
    dateCenter: { flex: 1, alignItems: 'center' },
    dateText: { fontSize: 17, fontWeight: '700' },
    dateSubtext: { fontSize: 12 },
    center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
    list: { paddingVertical: 8 },
    empty: { alignItems: 'center', paddingTop: 80, gap: 12 },
    emptyText: { fontSize: 15 },
  });
