/**
 * MonthView — calendar grid with event dot indicators
 *
 * Data fetch wired. Calendar grid navigation wired. Visual styling is placeholder.
 * TODO: [BASE-APP SETUP NEEDED] Apply app branding and replace generic entity names
 */
import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  StyleSheet,
} from 'react-native';
import {
  format,
  startOfMonth,
  endOfMonth,
  startOfWeek,
  addDays,
  addMonths,
  subMonths,
  isSameMonth,
  isSameDay,
  isToday,
} from 'date-fns';

import { useTheme } from '../../context/ThemeProvider';
import { supabase } from '../../lib/supabase';
import { EventTile, TimeIndexedEvent } from './EventTile';

interface Props {
  tableName?: string;
  timeColumn?: string;
  selectColumns?: string;
  transformRow?: (row: any) => TimeIndexedEvent;
  onEventPress?: (event: TimeIndexedEvent) => void;
}

export function MonthView({
  // WIZARD:BEGIN default-table
  tableName = 'events',
  // WIZARD:END default-table
  // WIZARD:BEGIN default-time-column
  timeColumn = 'start_time',
  // WIZARD:END default-time-column
  selectColumns = '*',
  transformRow = defaultTransform,
  onEventPress,
}: Props): React.JSX.Element {
  const { theme } = useTheme();
  const [month, setMonth] = useState(new Date());
  const [selectedDay, setSelectedDay] = useState(new Date());
  const [events, setEvents] = useState<TimeIndexedEvent[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchMonth = useCallback(
    async (date: Date) => {
      setLoading(true);
      try {
        const { data, error } = await supabase
          .from(tableName)
          .select(selectColumns)
          .gte(timeColumn, startOfMonth(date).toISOString())
          .lte(timeColumn, endOfMonth(date).toISOString())
          .order(timeColumn, { ascending: true });

        if (error) throw error;
        setEvents((data ?? []).map(transformRow));
      } catch (e) {
        console.warn('[MonthView] Fetch error:', e);
      } finally {
        setLoading(false);
      }
    },
    [tableName, timeColumn, selectColumns, transformRow]
  );

  useEffect(() => {
    fetchMonth(month);
  }, [month, fetchMonth]);

  const calendarDays = buildCalendarGrid(month);
  const dayEvents = events.filter(e => isSameDay(new Date(e.startTime), selectedDay));
  const countForDay = (day: Date) => events.filter(e => isSameDay(new Date(e.startTime), day)).length;

  const s = makeStyles(theme);

  return (
    <View style={[s.container, { backgroundColor: theme.colors.background }]}>
      {/* Month navigation */}
      {/* TODO: Apply app branding */}
      <View style={[s.header, { backgroundColor: theme.colors.surface, borderBottomColor: theme.colors.border }]}>
        <TouchableOpacity onPress={() => setMonth(m => subMonths(m, 1))} style={s.navBtn}>
          <Text style={[s.navText, { color: theme.colors.primary }]}>{'<'}</Text>
        </TouchableOpacity>
        <Text style={[s.monthLabel, { color: theme.colors.text }]}>
          {format(month, 'MMMM yyyy')}
        </Text>
        <TouchableOpacity onPress={() => setMonth(m => addMonths(m, 1))} style={s.navBtn}>
          <Text style={[s.navText, { color: theme.colors.primary }]}>{'>'}</Text>
        </TouchableOpacity>
      </View>

      {/* Day-of-week labels */}
      <View style={[s.dowRow, { backgroundColor: theme.colors.surface }]}>
        {['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa'].map(d => (
          <Text key={d} style={[s.dowLabel, { color: theme.colors.textMuted }]}>{d}</Text>
        ))}
      </View>

      {/* Calendar grid */}
      <View style={s.grid}>
        {calendarDays.map((day, i) => {
          const inMonth = isSameMonth(day, month);
          const selected = isSameDay(day, selectedDay);
          const count = inMonth ? countForDay(day) : 0;

          return (
            <TouchableOpacity
              key={i}
              style={[
                s.cell,
                selected && { backgroundColor: theme.colors.primary },
                !inMonth && s.offMonth,
              ]}
              onPress={() => {
                if (inMonth) setSelectedDay(day);
              }}
              disabled={!inMonth}
            >
              <Text
                style={[
                  s.cellNum,
                  { color: selected ? '#fff' : isToday(day) ? theme.colors.primary : theme.colors.text },
                  !inMonth && { color: theme.colors.textMuted },
                ]}
              >
                {format(day, 'd')}
              </Text>
              {count > 0 && !selected && (
                <View style={[s.dot, { backgroundColor: theme.colors.primary }]} />
              )}
            </TouchableOpacity>
          );
        })}
      </View>

      {/* Selected day events */}
      <View style={[s.dayHeader, { borderTopColor: theme.colors.border }]}>
        <Text style={[s.dayTitle, { color: theme.colors.textSecondary }]}>
          {format(selectedDay, 'EEEE, MMMM d')}
        </Text>
      </View>

      {loading ? (
        <View style={s.center}>
          <ActivityIndicator size="large" color={theme.colors.primary} />
        </View>
      ) : (
        <ScrollView contentContainerStyle={s.list}>
          {dayEvents.length === 0 ? (
            <Text style={[s.empty, { color: theme.colors.textMuted }]}>
              {/* TODO: [BASE-APP SETUP NEEDED] Replace "events" */}
              No events
            </Text>
          ) : (
            dayEvents.map(event => (
              <EventTile key={event.id} event={event} onPress={onEventPress} />
            ))
          )}
        </ScrollView>
      )}
    </View>
  );
}

function buildCalendarGrid(month: Date): Date[] {
  const start = startOfWeek(startOfMonth(month), { weekStartsOn: 0 });
  return Array.from({ length: 42 }, (_, i) => addDays(start, i));
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
      justifyContent: 'space-between',
      paddingVertical: 10,
      paddingHorizontal: 12,
      borderBottomWidth: StyleSheet.hairlineWidth,
    },
    navBtn: { padding: 8 },
    navText: { fontSize: 18, fontWeight: '700' },
    monthLabel: { fontSize: 16, fontWeight: '700' },
    dowRow: { flexDirection: 'row' },
    dowLabel: { flex: 1, textAlign: 'center', paddingVertical: 6, fontSize: 11, fontWeight: '600' },
    grid: { flexDirection: 'row', flexWrap: 'wrap' },
    cell: {
      width: `${100 / 7}%` as any,
      aspectRatio: 1,
      justifyContent: 'center',
      alignItems: 'center',
      borderRadius: 999,
    },
    offMonth: { opacity: 0.3 },
    cellNum: { fontSize: 13, fontWeight: '600' },
    dot: { width: 4, height: 4, borderRadius: 2, position: 'absolute', bottom: 4 },
    dayHeader: { paddingHorizontal: 16, paddingVertical: 8, borderTopWidth: StyleSheet.hairlineWidth },
    dayTitle: { fontSize: 13, fontWeight: '600' },
    center: { paddingVertical: 20, alignItems: 'center' },
    list: { paddingVertical: 4 },
    empty: { textAlign: 'center', paddingTop: 20, fontSize: 14 },
  });
